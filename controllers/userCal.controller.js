import puppeteer from 'puppeteer';

export const calendarAllData = async(req,res) => {
    try {

        const username = req.params.username;

        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
      
        const url = `https://codeforces.com/profile/${username}`;
        await page.goto(url, { waitUntil: 'networkidle2' });
      
        // Wait for the rect.day elements to appear
        await page.waitForSelector("rect.day");
      
        const contributions = await page.evaluate(() => {
          const rects = document.querySelectorAll("rect.day");
      
          return Array.from(rects)
            // Filter only the ones that have data-items (and optionally check > 0)
            .filter(rect => {
              const items = rect.getAttribute("data-items");
              return items && Number(items) > 0; 
            })
            // Then map those filtered elements to the data we want
            .map(rect => ({
              date: rect.getAttribute("data-date"),
              items: rect.getAttribute("data-items"),
            }));
        });

        return res.status(200).json({
            contributions,
            message:"User is done !",
            success:true
        });
    
        console.log(contributions);
      
        await browser.close();

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Internal Server Error",
            success:false
        });
    }
}






// async function scrape() {
//   const browser = await puppeteer.launch({ headless: false });
//   const page = await browser.newPage();

//   const url = "https://codeforces.com/profile/serialcomder";
//   await page.goto(url, { waitUntil: 'networkidle2' });

//   // Wait for the rect.day elements to appear
//   await page.waitForSelector("rect.day");

//   const contributions = await page.evaluate(() => {
//     const rects = document.querySelectorAll("rect.day");

//     return Array.from(rects)
//       // Filter only the ones that have data-items (and optionally check > 0)
//       .filter(rect => {
//         const items = rect.getAttribute("data-items");
//         return items && Number(items) > 0; 
//       })
//       // Then map those filtered elements to the data we want
//       .map(rect => ({
//         date: rect.getAttribute("data-date"),
//         items: rect.getAttribute("data-items"),
//       }));
//   });

//   console.log(contributions);

//   await browser.close();
// }

// scrape();
