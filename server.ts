import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Vessel Information Scraping
  app.get("/api/vessel/:imo", async (req, res) => {
    const { imo } = req.params;
    
    try {
      // We'll use VesselFinder as a source
      const url = `https://www.vesselfinder.com/vessels/details/${imo}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // 1. Extract Vessel Name (Try multiple common selectors)
      let name = $('.title-section h1').text().trim() || 
                 $('h1.title').text().trim() || 
                 $('.vessel-header h1').text().trim();
      
      // Remove IMO from name if it's included (e.g. "SHIP NAME (IMO: 1234567)")
      name = name.replace(/\(IMO:?\s*\d+\)/i, '').trim();

      const details: any = {};
      // 2. Extract Details from all tables to be safe
      $('tr').each((_, el) => {
        const $tds = $(el).find('td');
        if ($tds.length >= 2) {
          const key = $tds.eq(0).text().trim().replace(/:$/, '').toLowerCase();
          const value = $tds.eq(1).text().trim();
          if (key && value && value !== '-') {
            details[key] = value;
          }
        }
      });

      // 3. Additional check: Look into meta description and main text for specific info
      const pageText = $('body').text();
      const metaDesc = $('meta[name="description"]').attr('content') || '';
      const combinedText = (metaDesc + " " + pageText).toLowerCase();

      let detectedType = details['ship type'] || details['vessel type'] || details['type'] || details['vessel type - generic'];
      
      if (!detectedType || detectedType === 'Cargo' || detectedType === 'Other') {
        if (combinedText.includes('container ship')) detectedType = 'Container Ship';
        else if (combinedText.includes('tanker')) detectedType = 'Tanker';
        else if (combinedText.includes('bulk carrier')) detectedType = 'Bulk Carrier';
      }

      // 4. Extract Length and Width from various possible labels
      let length = details['length overall (m)'] || details['loa'] || details['length'] || details['overall length'];
      let width = details['beam (m)'] || details['beam'] || details['width'] || details['extreme breadth'];
      
      if ((!length || !width) && details['size']) {
        const sizeParts = details['size'].split('/');
        if (sizeParts.length === 2) {
          length = length || sizeParts[0].trim();
          width = width || sizeParts[1].trim();
        }
      }

      // Fallback: Try to find "Length x Breadth" pattern in text (e.g. "366 x 51 m")
      if (!length || !width) {
        const sizeMatch = combinedText.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*m/);
        if (sizeMatch) {
          length = length || sizeMatch[1];
          width = width || sizeMatch[2];
        }
      }

      // 5. Call Sign fallback from text
      let callSign = details['call sign'] || details['callsign'];
      if (!callSign || callSign === '-') {
        const csMatch = combinedText.match(/call sign\s*([a-z0-9]{4,7})/i);
        if (csMatch) callSign = csMatch[1].toUpperCase();
      }

      // 6. Map scraped data with better fallbacks
      const vesselData = {
        name: name || 'Unknown Vessel',
        type: detectedType || 'N/A',
        callSign: callSign || 'N/A',
        length: length ? (length.toString().includes('m') ? length : `${length} m`) : 'N/A',
        width: width ? (width.toString().includes('m') ? width : `${width} m`) : 'N/A',
        vesselAlpha: name || 'Unknown',
        imo: imo
      };

      res.json(vesselData);
    } catch (error: any) {
      console.error(`Error scraping vessel ${imo}:`, error.message);
      res.status(404).json({ error: "Vessel not found or source unavailable" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
