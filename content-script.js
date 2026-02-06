// ============================================
// PokéDrop AU - Content Script
// Runs on retailer pages to extract product data
// ============================================

// Retailer-specific scraping configurations
const SCRAPER_CONFIGS = {
  'ebgames.com.au': {
    name: 'EB Games',
    productSelector: '.product-tile, .product-item, [data-product-tile], .search-result-item, article.product',
    nameSelector: '.product-title, .product-name, h3 a, h2 a, .title a, [data-testid="product-name"]',
    priceSelector: '.price, .product-price, .now-price, .sale-price, [data-testid="product-price"]',
    linkSelector: 'a[href*="/product/"], a.product-link, h3 a, h2 a',
    inStockSelector: '.add-to-cart:not(.out-of-stock), .btn-cart:not([disabled]), .in-stock'
  },
  'bigw.com.au': {
    name: 'Big W',
    productSelector: '[data-testid="product-card"], .product-card, .product-tile, article.product',
    nameSelector: '[data-testid="product-title"], .product-title, .product-name, h3, h2',
    priceSelector: '[data-testid="product-price"], .price, .product-price, .now',
    linkSelector: 'a[href*="/product/"], a[href*="/p/"]',
    inStockSelector: '[data-testid="add-to-cart"], .add-to-cart, .addToCart'
  },
  'jbhifi.com.au': {
    name: 'JB Hi-Fi',
    productSelector: '.product-tile, .product-card, [data-product], .product-item',
    nameSelector: '.product-tile__title, .product-title, .product-name, h3',
    priceSelector: '.product-tile__price, .price, .product-price, .now-price',
    linkSelector: 'a[href*="/products/"], a[href*="/product/"]',
    inStockSelector: '.add-to-cart:not([disabled]), .in-stock, .available'
  },
  'target.com.au': {
    name: 'Target',
    productSelector: '.product-tile, [data-testid="product"], .product-card, article',
    nameSelector: '.product-title, .product-name, h3, [data-testid="product-title"]',
    priceSelector: '.product-price, .price, [data-testid="product-price"]',
    linkSelector: 'a[href*="/p/"], a[href*="/product/"]',
    inStockSelector: '.add-to-cart, [data-testid="add-to-cart"], .in-stock'
  },
  'kmart.com.au': {
    name: 'Kmart',
    productSelector: '.product-card, [data-testid="product-card"], article.product',
    nameSelector: '.product-title, .product-name, h3, h2',
    priceSelector: '.product-price, .price, .now',
    linkSelector: 'a[href*="/product/"]',
    inStockSelector: '.add-to-cart:not(.out-of-stock), .in-stock'
  },
  'zingpopculture.com.au': {
    name: 'Zing Pop Culture',
    productSelector: '.product-tile, .product-item, .grid-item',
    nameSelector: '.product-title, .product-name, h3 a',
    priceSelector: '.price, .product-price',
    linkSelector: 'a[href*="/product/"]',
    inStockSelector: '.add-to-cart:not(.sold-out)'
  },
  'gameology.com.au': {
    name: 'Gameology',
    productSelector: '.product-card, .grid-product, .product-item',
    nameSelector: '.product-card__title, .product-name, h3 a, .title a',
    priceSelector: '.product-card__price, .price, .product-price',
    linkSelector: 'a[href*="/products/"], a[href*="/collections/"]',
    inStockSelector: '.add-to-cart:not([disabled]), .in-stock'
  }
};

// Pokemon TCG keywords
const POKEMON_KEYWORDS = [
  'pokemon', 'pokémon', 'tcg', 'trading card',
  'booster', 'elite trainer', 'etb', 'collection box',
  'blister', 'bundle', 'tin', 'premium collection',
  'special collection', 'ultra premium', 'upc',
  'build & battle', 'prerelease', 'promo',
  'prismatic', 'surging sparks', 'paldea', 'scarlet', 'violet'
];

// Get config for current site
function getConfig() {
  const hostname = window.location.hostname.replace('www.', '');
  return SCRAPER_CONFIGS[hostname] || null;
}

// Check if text contains Pokemon keywords
function isPokemonProduct(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return POKEMON_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

// Extract price from text
function extractPrice(text) {
  if (!text) return null;
  const match = text.match(/\$\s*([\d,]+\.?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(',', ''));
  }
  return null;
}

// Scrape products from the page
function scrapeProducts() {
  const config = getConfig();
  if (!config) {
    console.log('[PokéDrop] No config for this site');
    return [];
  }

  console.log(`[PokéDrop] Scraping ${config.name}...`);
  
  const products = [];
  const productElements = document.querySelectorAll(config.productSelector);
  
  console.log(`[PokéDrop] Found ${productElements.length} product elements`);

  productElements.forEach((element, index) => {
    try {
      // Get product name
      const nameEl = element.querySelector(config.nameSelector);
      const name = nameEl?.textContent?.trim() || '';
      
      // Only process Pokemon products
      if (!isPokemonProduct(name) && !isPokemonProduct(element.textContent)) {
        return;
      }

      // Get price
      const priceEl = element.querySelector(config.priceSelector);
      const priceText = priceEl?.textContent?.trim() || '';
      const price = extractPrice(priceText);

      // Get link
      const linkEl = element.querySelector(config.linkSelector) || element.querySelector('a');
      let url = linkEl?.href || '';
      if (url && !url.startsWith('http')) {
        url = window.location.origin + url;
      }

      // Check stock status
      const inStockEl = element.querySelector(config.inStockSelector);
      const inStock = !!inStockEl;

      if (name && url) {
        products.push({
          name: name.substring(0, 200), // Limit length
          price,
          url,
          inStock,
          retailer: config.name,
          scrapedAt: Date.now()
        });
        console.log(`[PokéDrop] Found: ${name} - $${price || 'N/A'}`);
      }
    } catch (error) {
      console.error('[PokéDrop] Error parsing product:', error);
    }
  });

  console.log(`[PokéDrop] Total Pokemon products found: ${products.length}`);
  return products;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCRAPE_PAGE') {
    console.log('[PokéDrop] Received scrape request');
    const products = scrapeProducts();
    sendResponse({ success: true, products, url: window.location.href });
  }
  
  if (message.type === 'PING') {
    sendResponse({ success: true, url: window.location.href });
  }
  
  return true;
});

// Auto-scrape on page load if it's a search/category page
function autoScrape() {
  const url = window.location.href.toLowerCase();
  const isSearchPage = url.includes('search') || 
                       url.includes('pokemon') || 
                       url.includes('trading-card') ||
                       url.includes('/collections/') ||
                       url.includes('/category/');
  
  if (isSearchPage) {
    // Wait for dynamic content to load
    setTimeout(() => {
      const products = scrapeProducts();
      if (products.length > 0) {
        // Send products to background script
        chrome.runtime.sendMessage({
          type: 'PRODUCTS_FOUND',
          products,
          retailer: getConfig()?.name || 'Unknown',
          url: window.location.href
        }).catch(() => {
          // Background script might not be ready
        });
      }
    }, 2000);
  }
}

// Run on page load
if (document.readyState === 'complete') {
  autoScrape();
} else {
  window.addEventListener('load', autoScrape);
}

console.log('[PokéDrop] Content script loaded on', window.location.hostname);

