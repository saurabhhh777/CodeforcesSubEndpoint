import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import cache from "memory-cache";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import puppeteerExtra from "puppeteer-extra"; // Fix: Use puppeteer-extra
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import consoleStamp from "console-stamp";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use(compression()); // Enable response compression
consoleStamp(console, { format: "[yyyy-mm-dd HH:MM:ss]" });

puppeteerExtra.use(StealthPlugin()); // Fix: Apply Stealth Plugin

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache
let browser;

async function getBrowserInstance() {
  if (!browser) {
    const executablePath = await chromium.executablePath; // Fix: Fetch dynamically
    browser = await puppeteerExtra.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath || "/usr/bin/chromium-browser", // Fallback path
      headless: chromium.headless,
    });
  }
  return browser;
}

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

app.get("/user/:username", cacheMiddleware, async (req, res) => {
  try {
    const username = req.params.username;
    const url = `https://codeforces.com/profile/${username}`;

    console.log(`Scraping Codeforces profile: ${url}`);

    const browser = await getBrowserInstance();
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector("rect.day");

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

// ✅ Fix: Graceful shutdown for Render
process.on("SIGINT", async () => {
  console.log("Closing browser...");
  if (browser) await browser.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Render shutting down service...");
  if (browser) await browser.close();
  process.exit(0);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
