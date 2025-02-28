import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

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

app.get("/user/:username", async (req, res) => {
  try {
    const username = req.params.username;
    console.log("Fetching data for username:", username);

    // Launch Puppeteer with Chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    console.log("Puppeteer launched successfully.");
    
    const url = `https://codeforces.com/profile/${username}`;
    console.log("Navigating to:", url);
    
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    console.log("Page loaded successfully.");

    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait extra 5 sec before checking
    const hasContributions = await page.evaluate(() => {
      return document.querySelector("rect.day") !== null;
    });

    if (!hasContributions) {
      console.error("No contributions found. The selector might be incorrect or missing.");
      await browser.close();
      return res.status(404).json({
        message: "No contributions found or user does not exist.",
        success: false,
      });
    }

    await page.waitForSelector("rect.day", { timeout: 30000 });
    console.log("Selector found. Extracting contributions...");

    const contributions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("rect.day"))
        .filter((rect) => Number(rect.getAttribute("data-items") || 0) > 0)
        .map((rect) => ({
          date: rect.getAttribute("data-date"),
          items: rect.getAttribute("data-items"),
        }));
    });

    console.log("Contributions extracted:", contributions);

    await browser.close();
    console.log("Browser closed.");

    return res.status(200).json({
      contributions,
      message: "User data scraped successfully!",
      success: true,
    });
  } catch (error) {
    console.error("Error scraping user data:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
});

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
