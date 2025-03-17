const express = require("express");
const puppeteer = require("puppeteer-core");

const app = express();
const PORT = process.env.PORT || 3000;

// Función para encontrar el ejecutable de Chrome
const findChrome = () => {
  // Ubicaciones comunes de Chrome en entornos Linux (como Render)
  const paths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  
  // Intenta cada ruta
  for (const path of paths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(path)) {
        console.log(`✅ Chrome encontrado en: ${path}`);
        return path;
      }
    } catch (error) {
      console.error(`Error al verificar la ruta ${path}:`, error);
    }
  }
  
  console.error('❌ No se encontró Chrome en ninguna ubicación conocida');
  return null;
};

app.get("/api/search", async (req, res) => {
    const { category, city } = req.query;

    if (!category || !city) {
        return res.status(400).json({ error: "Category and city are required" });
    }

    try {
        const chromePath = findChrome();
        
        if (!chromePath) {
            throw new Error('No se pudo encontrar Chrome. Verifica que esté instalado correctamente.');
        }
        
        // Configuración para Render
        const browser = await puppeteer.launch({
            headless: "new",
            executablePath: chromePath,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--single-process"
            ]
        });

        const page = await browser.newPage();
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(category)}+in+${encodeURIComponent(city)}`;
        
        await page.goto(searchUrl, { 
            waitUntil: "domcontentloaded",
            timeout: 60000 
        });

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