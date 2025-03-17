const express = require("express");
const puppeteer = require("puppeteer");
const { execSync } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

// Función para encontrar la ruta de Chromium/Chrome
const findChromePath = () => {
  try {
    // Intenta encontrar Chromium usando which
    const chromiumPath = execSync('which chromium').toString().trim();
    console.log(`✅ Chromium encontrado en: ${chromiumPath}`);
    return chromiumPath;
  } catch (error) {
    console.log("❌ Chromium no encontrado, buscando alternativas...");
  }

  try {
    // Intenta encontrar chromium-browser
    const chromiumBrowserPath = execSync('which chromium-browser').toString().trim();
    console.log(`✅ Chromium Browser encontrado en: ${chromiumBrowserPath}`);
    return chromiumBrowserPath;
  } catch (error) {
    console.log("❌ Chromium Browser no encontrado, buscando alternativas...");
  }

  try {
    // Intenta encontrar Google Chrome
    const chromePath = execSync('which google-chrome').toString().trim();
    console.log(`✅ Google Chrome encontrado en: ${chromePath}`);
    return chromePath;
  } catch (error) {
    console.log("❌ Google Chrome no encontrado, buscando alternativas...");
  }

  try {
    // Intenta encontrar Google Chrome Stable
    const chromeStablePath = execSync('which google-chrome-stable').toString().trim();
    console.log(`✅ Google Chrome Stable encontrado en: ${chromeStablePath}`);
    return chromeStablePath;
  } catch (error) {
    console.log("❌ Google Chrome Stable no encontrado");
  }

  // Ubicaciones comunes donde podría estar instalado
  const commonPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
    '/usr/local/bin/chromium',
    '/usr/local/bin/chrome'
  ];

  const fs = require('fs');
  for (const path of commonPaths) {
    if (fs.existsSync(path)) {
      console.log(`✅ Navegador encontrado en: ${path}`);
      return path;
    }
  }

  console.log("❌ No se encontró ningún navegador compatible");
  return null;
};

app.get("/api/search", async (req, res) => {
    const { category, city } = req.query;

    if (!category || !city) {
        return res.status(400).json({ error: "Category and city are required" });
    }

    try {
        // Buscar la ruta del navegador
        const browserPath = findChromePath();
        console.log(`Usando navegador en: ${browserPath || 'Ruta por defecto'}`);

        // Configuración para lanzar el navegador
        const launchOptions = {
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--single-process"
            ]
        };

        // Solo especificar executablePath si encontramos un navegador
        if (browserPath) {
            launchOptions.executablePath = browserPath;
        } else {
            console.log("⚠️ No se encontró un navegador específico, usando la configuración por defecto");
        }

        // Lanzar el navegador
        console.log("Iniciando navegador con opciones:", JSON.stringify(launchOptions));
        const browser = await puppeteer.launch(launchOptions);
        console.log("✅ Navegador iniciado correctamente");
        
        const page = await browser.newPage();
        console.log("✅ Nueva página creada");
        
        // Configurar timeout más largo
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

// Ruta para verificar la instalación de Chrome/Chromium
app.get("/check-browser", (req, res) => {
    try {
        const browserPath = findChromePath();
        if (browserPath) {
            res.json({ 
                status: "success", 
                message: "Navegador encontrado", 
                path: browserPath 
            });
        } else {
            res.json({ 
                status: "error", 
                message: "No se encontró ningún navegador compatible" 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: "Error al verificar el navegador", 
            error: error.message 
        });
    }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});