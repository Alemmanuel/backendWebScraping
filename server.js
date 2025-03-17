const express = require("express");
const puppeteer = require("puppeteer"); // Volvemos a usar puppeteer normal

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/search", async (req, res) => {
    const { category, city } = req.query;

    if (!category || !city) {
        return res.status(400).json({ error: "Category and city are required" });
    }

    try {
        // Configuración para usar el Chrome instalado en el sistema
        const browser = await puppeteer.launch({
            headless: "new",
            executablePath: '/usr/bin/google-chrome-stable', // Ruta específica al Chrome instalado
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--single-process"
            ],
            ignoreDefaultArgs: ['--disable-extensions']
        });

        console.log("✅ Navegador iniciado correctamente");
        
        const page = await browser.newPage();
        console.log("✅ Nueva página creada");
        
        // Configurar timeout más largo y manejo de errores
        page.setDefaultNavigationTimeout(90000);
        
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(category)}+in+${encodeURIComponent(city)}`;
        console.log(`🔍 Navegando a: ${searchUrl}`);
        
        await page.goto(searchUrl, { 
            waitUntil: "domcontentloaded",
            timeout: 90000 
        });
        
        console.log("✅ Página cargada correctamente");

        // Esperar un poco para que el contenido se cargue
        await page.waitForTimeout(2000);
        
        const places = await page.evaluate(() => {
            console.log("Evaluando contenido de la página...");
            const elements = document.querySelectorAll(".Nv2PK");
            console.log(`Encontrados ${elements.length} elementos`);
            
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

// Ruta de prueba para verificar que el servidor está funcionando
app.get("/", (req, res) => {
    res.send("API de búsqueda funcionando. Usa /api/search?category=restaurantes&city=Madrid para buscar.");
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});