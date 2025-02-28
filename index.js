import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import cache from "memory-cache";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(compression()); // Enable response compression
puppeteer.use(StealthPlugin()); // Enable stealth mode

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

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

    // Launch Puppeteer with stealth mode
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Set User-Agent to mimic a real browser
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
    );

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

    await browser.close();

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

// ✅ Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
