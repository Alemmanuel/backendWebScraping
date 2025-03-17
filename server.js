const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/search", async (req, res) => {
    const { category, city, page } = req.query;
    if (!category || !city) {
        return res.status(400).json({ error: "Missing category or city" });
    }

    const browser = await puppeteer.launch({ headless: true });
    const pageInstance = await browser.newPage();
    let searchUrl = `https://www.google.com/maps/search/${category}+in+${city}`;

    await pageInstance.goto(searchUrl, { waitUntil: "networkidle2" });

    // Simulación de desplazamiento para cargar más resultados
    await autoScroll(pageInstance);

    const places = await pageInstance.evaluate(() => {
        return Array.from(document.querySelectorAll(".Nv2PK"))
            .map(el => {
                const nameEl = el.querySelector(".qBF1Pd") || el.querySelector("h3");
                const ratingEl = el.querySelector(".MW4etd");
                const priceEl = el.querySelector(".xg1aie, .rllt__details div:nth-child(2)");
                const addressEl = el.querySelector(".rllt__details div:first-child");
                const linkEl = el.querySelector("a");

                const name = nameEl ? nameEl.innerText.trim() : "No name available";
                const rating = ratingEl ? ratingEl.innerText.split(" ")[0] : "No rating";
                const price = priceEl ? formatPrice(priceEl.innerText.trim()) : "N/A";
                const address = addressEl ? addressEl.innerText.trim() : "No address available";
                const link = linkEl ? linkEl.href : "#";

                return { name, rating, price, address, link };
            })
            .filter(business => business.link !== "#");
    });

    await browser.close();
    res.json({ places });
});

// Función para hacer scroll en la página y cargar más resultados
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
    console.log(`Server running on http://localhost:${PORT}`);
});
