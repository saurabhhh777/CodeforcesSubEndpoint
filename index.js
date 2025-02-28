import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import puppeteer from 'puppeteer';

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

async function retryOperation(operation, retries = 3, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt === retries) throw error;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

app.get("/user/:username", async (req, res) => {
  try {
    const username = req.params.username;

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const url = `https://codeforces.com/profile/${username}`;
    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for the rect.day elements to appear
    await page.waitForSelector("rect.day");

    const contributions = await page.evaluate(() => {
      const rects = document.querySelectorAll("rect.day");

      return (
        Array.from(rects)
          // Filter only the ones that have data-items (and optionally check > 0)
          .filter((rect) => {
            const items = rect.getAttribute("data-items");
            return items && Number(items) > 0;
          })
          // Then map those filtered elements to the data we want
          .map((rect) => ({
            date: rect.getAttribute("data-date"),
            items: rect.getAttribute("data-items"),
          }))
      );
    });

    return res.status(200).json({
      contributions,
      message: "User is done !",
      success: true,
    });

    console.log(contributions);

    await browser.close();
  } catch (error) {
    console.log(error);
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
