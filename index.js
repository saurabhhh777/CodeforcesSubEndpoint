import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fromURL } from "cheerio";

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

    // Fetch HTML using Cheerio
    const $ = await fromURL(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    // Extract contributions from the profile page
    const contributions = [];
    $("rect.day").each((_, element) => {
      const date = $(element).attr("data-date");
      const items = $(element).attr("data-items");

      if (date && items && Number(items) > 0) {
        contributions.push({ date, items: Number(items) });
      }
    });

    console.log("Scraped data: ", contributions);

    return res.status(200).json({
      contributions,
      message: "User data fetched successfully!",
      success: true,
    });

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
