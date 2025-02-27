import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
const app = express();
dotenv.config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Hey Devs, Codeforces subendpoint is Working !",
    examples: {
      text: "Hit the url 👇 change the username name with your codeforces username or someone else !",
      url: "",
    },
    success: true,
  });
});

app.use("/user/:username", async (req, res) => {
  try {
    const username = req.query.username;

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: isLocal
        ? undefined // Let Puppeteer auto-download Chromium locally
        : await chromium.executablePath(),
      headless: chromium.headless,
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
      message: "User is done!",
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
