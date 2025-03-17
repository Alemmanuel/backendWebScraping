const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/search", async (req, res) => {
    const { category, city } = req.query;

    if (!category || !city) {
        return res.status(400).json({ error: "Category and city are required" });
    }

    try {
        console.log("Iniciando navegador...");
        
        const browser = await chromium.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
        
        console.log("✅ Navegador iniciado correctamente");
        
        const context = await browser.newContext();
        const page = await context.newPage();
        console.log("✅ Nueva página creada");
        
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(category)}+in+${encodeURIComponent(city)}`;
        console.log(`🔍 Navegando a: ${searchUrl}`);
        
        await page.goto(searchUrl, { timeout: 60000 });
        console.log("✅ Página cargada correctamente");

        // Esperar un poco para que el contenido se cargue
        await page.waitForTimeout(2000);
        
        const places = await page.evaluate(() => {
            const elements = document.querySelectorAll(".Nv2PK");
            
            return Array.from(elements)
                .map(el => {
                    const nameEl = el.querySelector(".qBF1Pd") || el.querySelector("h3");
                    const linkEl = el.querySelector("a");

                    const name = nameEl ? nameEl.innerText.trim() : "No name available";
                    const link = linkEl ? linkEl.href : "#";

                    return { name, link };
                })
                .filter(business => business.link !== "#");
        });
        
        console.log(`✅ Se encontraron ${places.length} lugares`);

        await browser.close();
        console.log("✅ Navegador cerrado correctamente");
        
        res.json({ places });

    } catch (error) {
        console.error("❌ Error scraping:", error);
        res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message,
            stack: error.stack 
        });
    }
});

app.get("/", (req, res) => {
    res.send("API de búsqueda funcionando. Usa /api/search?category=restaurantes&city=Madrid para buscar.");
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));