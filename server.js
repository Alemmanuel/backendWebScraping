/**
 * server.js
 * Servidor Node.js que obtiene datos reales (teléfono, email) desde Google usando SerpAPI
 */
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Reemplaza "TU_API_KEY" con tu clave de SerpAPI
const SERPAPI_KEY = "5a004af89c6604351f6e502276b1986e5ec8843449899c7fd80fb537df5e14f2";

app.post("/buscar", async (req, res) => {
  const { trabajo, lugar } = req.body;
  if (!trabajo || !lugar) {
    return res.status(400).json({ error: "Faltan parámetros obligatorios" });
  }

  try {
    // Construimos la consulta para Google
    // Incluimos 'tel', 'email' y 'contacto' para aumentar chances de encontrar datos
    const query = `${trabajo} en ${lugar} tel email contacto`;

    // Llamada a SerpAPI
    const url = "https://serpapi.com/search";
    const { data } = await axios.get(url, {
      params: {
        engine: "google",
        q: query,
        api_key: SERPAPI_KEY,
        hl: "es", // Resultados en español
        gl: "co"  // Geolocalización Colombia (opcional)
      }
    });

    const resultados = [];
    if (data.organic_results) {
      data.organic_results.forEach(item => {
        // snippet = texto breve que Google muestra bajo el título
        const snippet = item.snippet || "";

        // Expresión regular para teléfonos
        const phoneMatch = snippet.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
        const telefono = phoneMatch ? phoneMatch[0] : "No disponible";

        // Expresión regular para emails
        const emailMatch = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+/);
        const email = emailMatch ? emailMatch[0] : "No disponible";

        resultados.push({
          nombre: item.title || "No disponible",
          telefono,
          email
        });
      });
    }

    res.json({ resultados });
  } catch (error) {
    // Muestra el error real en la consola
    console.error("Error al obtener datos:", error.response?.data || error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});