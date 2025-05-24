const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

// 🗃️ Cache for NFTs
let cachedNFTs = [];
let lastScrape = null;

// 🧠 Background scraper function
const scrapeNFTs = async () => {
  let browser;
  try {
    console.log('🔁 Running NFT scraper...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://superrare.com/bojan_archnd', {
      waitUntil: 'networkidle2',
      timeout: 0
    });

    await page.waitForSelector('img.object-contain', { timeout: 45000 });

    const nfts = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img.object-contain'));
      return images.map(img => {
        const link = img.closest('a')?.href || 'https://superrare.com/bojan_archnd';
        const image = img.src;
        return { image, link };
      });
    });

    await browser.close();
    cachedNFTs = nfts;
    lastScrape = new Date().toISOString();
    console.log(`✅ Scraped ${nfts.length} NFTs at ${lastScrape}`);
  } catch (err) {
    console.error('❌ Scraper error:', err.message);
    if (browser) await browser.close();
  }
};

// 🧭 Start scraper every 10 minutes
scrapeNFTs(); // run once immediately
setInterval(scrapeNFTs, 10 * 60 * 1000); // every 10 minutes

// 🧾 Serve latest cached NFTs
app.get('/nfts', (req, res) => {
  res.json({
    lastUpdated: lastScrape,
    count: cachedNFTs.length,
    data: cachedNFTs
  });
});

// ✅ Railway compatibility: must bind to '0.0.0.0'
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ NFT scraper running at http://localhost:${PORT}/nfts`);
});
