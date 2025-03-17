const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium"); // Nueva dependencia
const cors = require("cors");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

app.get("/api/search", async (req, res) => {
    const { category, city } = req.query;

    if (!category || !city) {
        return res.status(400).json({ error: "Category and city are required" });
    }

    try {
        const browser = await puppeteer.launch({
            executablePath: await chromium.executablePath(), // Ruta dinámica
            headless: chromium.headless,
            args: [
                ...chromium.args,
                "--disable-gpu",
                "--disable-dev-shm-usage"
            ]
        });

        const page = await browser.newPage();
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(category)}+in+${encodeURIComponent(city)}`;
        await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

        const places = await page.evaluate(() => {
            return Array.from(document.querySelectorAll(".Nv2PK"))
                .map(el => {
                    const nameEl = el.querySelector(".qBF1Pd") || el.querySelector("h3");
                    const ratingEl = el.querySelector(".MW4etd");
                    const linkEl = el.querySelector("a");

                    const name = nameEl ? nameEl.innerText.trim() : "No name available";
                    const rating = ratingEl ? ratingEl.innerText.trim() : "No rating";
                    const link = linkEl ? linkEl.href : "#";

                    return { name, rating, link };
                })
                .filter(business => business.link !== "#");
        });

        await browser.close();
        res.json({ places });

    } catch (error) {
        console.error("❌ Error scraping:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Exportar `app` para Vercel
module.exports = app;
