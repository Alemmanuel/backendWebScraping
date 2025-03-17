const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/search", async (req, res) => {
    const { category, city } = req.query;
    if (!category || !city) {
        return res.status(400).json({ error: "Missing category or city" });
    }

    try {
        const browser = await puppeteer.launch({
            executablePath: process.env.CHROME_BIN || "/usr/bin/chromium-browser",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-dev-shm-usage"
            ]
        });

        const pageInstance = await browser.newPage();
        let searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(category)}+in+${encodeURIComponent(city)}`;
        await pageInstance.goto(searchUrl, { waitUntil: "networkidle2" });

        await autoScroll(pageInstance);

        const places = await pageInstance.evaluate(() => {
            return Array.from(document.querySelectorAll(".Nv2PK"))
                .map(el => {
                    const nameEl = el.querySelector(".qBF1Pd") || el.querySelector("h3");
                    const ratingEl = el.querySelector(".MW4etd");
                    const priceEl = el.querySelector(".xg1aie, .rllt__details div:nth-child(2)");
                    const linkEl = el.querySelector("a");

                    const name = nameEl ? nameEl.innerText.trim() : "No name available";
                    const rating = ratingEl ? ratingEl.innerText.split(" ")[0] : "No rating";
                    const price = priceEl ? formatPrice(priceEl.innerText.trim()) : "N/A";
                    const link = linkEl ? linkEl.href : "#";

                    return { name, rating, price, link };
                })
                .filter(business => business.link !== "#");
        });

        await browser.close();
        res.json({ places });

    } catch (error) {
        console.error("Error scraping:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 500;
            const timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 500);
        });
    });
}

function formatPrice(priceText) {
    priceText = priceText.toLowerCase();
    if (priceText.includes("$") || priceText.includes("cheap")) return "$";
    if (priceText.includes("moderate") || priceText.includes("$$")) return "$$";
    if (priceText.includes("expensive") || priceText.includes("$$$")) return "$$$";
    return "Not Available";
}

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
