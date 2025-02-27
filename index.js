import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
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

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Required for Render
    });

    const page = await browser.newPage();
    const url = `https://codeforces.com/profile/${username}`;
    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector("rect.day", { timeout: 5000 });

    const contributions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("rect.day"))
        .filter((rect) => Number(rect.getAttribute("data-items") || 0) > 0)
        .map((rect) => ({
          date: rect.getAttribute("data-date"),
          items: rect.getAttribute("data-items"),
        }));
    });

    await browser.close();

    return res.status(200).json({
      contributions,
      message: "User data scraped successfully!",
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
});

// ✅ Make sure the app listens on the correct port
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
