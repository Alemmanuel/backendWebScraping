const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/search", async (req, res) => {
    const { category, city } = req.query;

    if (!category || !city) {
        return res.status(400).json({ error: "Category and city are required" });
    }

    try {
        // Iniciar Puppeteer sin especificar un ejecutable externo
        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
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
                    const linkEl = el.querySelector("a");

                    const name = nameEl ? nameEl.innerText.trim() : "No name available";
                    const link = linkEl ? linkEl.href : "#";

                    return { name, link };
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

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
