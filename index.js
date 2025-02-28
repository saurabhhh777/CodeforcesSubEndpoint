import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const app = express();
dotenv.config();

app.use(express.json());
app.use(cors());

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

// Function to scrape Codeforces user contributions
app.get("/user/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const url = `https://codeforces.com/profile/${username}`;

    console.log(`Scraping Codeforces profile: ${url}`);

    // Launch Puppeteer with stealth mode
    const browser = await puppeteer.launch({
      headless: "new", // Runs in headless mode (change to false to see browser)
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

    console.log("Scraped data : ", contributions);  

    return res.status(200).json({
      contributions,
      message: "User data fetched successfully!",
      success: true,
    });

  } catch (error) {
    console.error("Error scraping Codeforces:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
});

// ✅ Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
