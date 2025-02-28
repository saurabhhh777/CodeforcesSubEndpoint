import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import cache from "memory-cache";
import puppeteer from "puppeteer-core"; // Use puppeteer-core instead of full Puppeteer
import chromium from "@sparticuz/chromium"; // Lightweight Chromium for serverless environments
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import consoleStamp from "console-stamp"; // For timestamped logs

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(compression()); // Enable response compression

consoleStamp(console, { format: "[yyyy-mm-dd HH:MM:ss]" });

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache
const LAUNCH_OPTIONS = {
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath, // Use Render-compatible Chromium
  headless: chromium.headless,
};

// ✅ Use a single browser instance for all requests
let browser;

async function getBrowserInstance() {
  if (!browser) {
    browser = await puppeteer.launch(LAUNCH_OPTIONS);
  }
  return browser;
}

// Middleware to check cache before scraping
const cacheMiddleware = (req, res, next) => {
  const key = req.originalUrl;
  const cachedResponse = cache.get(key);
  if (cachedResponse) {
    console.log(`Serving from cache: ${key}`);
    return res.status(200).json(cachedResponse);
  }
  next();
};

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Hey Devs, Codeforces API is working!",
    examples: {
      text: "Hit the URL below and replace 'username' with a Codeforces username.",
      url: "/user/yourCodeforcesUsername",
    },
    success: true,
  });
});

// Scrape Codeforces user contributions with Puppeteer
app.get("/user/:username", cacheMiddleware, async (req, res) => {
  try {
    const username = req.params.username;
    const url = `https://codeforces.com/profile/${username}`;

    console.log(`Scraping Codeforces profile: ${url}`);

    const browser = await getBrowserInstance();
    const page = await browser.newPage();

    // Set User-Agent and headers to bypass bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for contributions to load
    await page.waitForSelector("rect.day");

    // Extract contribution data
    const contributions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("rect.day"))
        .filter((rect) => rect.getAttribute("data-items") && Number(rect.getAttribute("data-items")) > 0)
        .map((rect) => ({
          date: rect.getAttribute("data-date"),
          items: rect.getAttribute("data-items"),
        }));
    });

    console.log("Scraped data: ", contributions);

    const response = {
      contributions,
      message: "User data fetched successfully!",
      success: true,
    };

    // Store response in cache
    cache.put(req.originalUrl, response, CACHE_DURATION);

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error scraping Codeforces:", error);
    return res.status(500).json({
      message: "Failed to fetch Codeforces data. The site might be blocking requests.",
      success: false,
    });
  }
});

// ✅ Graceful shutdown - Close Puppeteer browser on exit
process.on("SIGINT", async () => {
  console.log("Closing browser...");
  if (browser) await browser.close();
  process.exit(0);
});

// ✅ Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
