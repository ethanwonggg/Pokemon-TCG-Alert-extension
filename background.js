// ============================================
// PokéDrop AU - Background Service Worker
// Monitors Australian retailers for Pokemon card drops
// ============================================

// Debug mode - set to true to see detailed logs
const DEBUG = true;

function log(...args) {
  if (DEBUG) {
    console.log('[PokéDrop]', ...args);
  }
}

function logError(...args) {
  console.error('[PokéDrop ERROR]', ...args);
}

// Retailer configurations
const RETAILER_CONFIGS = {
  ebgames: {
    name: 'EB Games',
    baseUrl: 'https://www.ebgames.com.au',
    searchUrls: [
      'https://www.ebgames.com.au/search?q=pokemon+tcg',
      'https://www.ebgames.com.au/search?q=pokemon+cards'
    ]
  },
  bigw: {
    name: 'Big W',
    baseUrl: 'https://www.bigw.com.au',
    searchUrls: [
      'https://www.bigw.com.au/toys/trading-cards/pokemon-trading-cards'
    ]
  },
  jbhifi: {
    name: 'JB Hi-Fi',
    baseUrl: 'https://www.jbhifi.com.au',
    searchUrls: [
      'https://www.jbhifi.com.au/collections/trading-cards?q=pokemon'
    ]
  },
  target: {
    name: 'Target',
    baseUrl: 'https://www.target.com.au',
    searchUrls: [
      'https://www.target.com.au/search?text=pokemon+cards'
    ]
  },
  kmart: {
    name: 'Kmart',
    baseUrl: 'https://www.kmart.com.au',
    searchUrls: [
      'https://www.kmart.com.au/search/?searchTerm=pokemon%20cards'
    ]
  },
  zing: {
    name: 'Zing Pop Culture',
    baseUrl: 'https://www.zingpopculture.com.au',
    searchUrls: [
      'https://www.zingpopculture.com.au/search?q=pokemon+tcg'
    ]
  },
  gameology: {
    name: 'Gameology',
    baseUrl: 'https://www.gameology.com.au',
    searchUrls: [
      'https://www.gameology.com.au/collections/pokemon'
    ]
  }
};

// Australian MSRP Reference for Pokemon TCG Products
// Used to filter for good value drops (at or near retail price)
const MSRP_REFERENCE = {
  // Product type patterns and their MSRP ranges in AUD
  // 'id' matches the settings productTypes keys
  patterns: [
    { id: 'booster_pack', keywords: ['booster pack', 'single pack'], minMsrp: 6, maxMsrp: 8, name: 'Booster Pack' },
    { id: 'blister', keywords: ['3 pack', '3-pack', 'three pack', 'blister'], minMsrp: 16, maxMsrp: 22, name: 'Blister Pack' },
    { id: 'booster_bundle', keywords: ['booster bundle', '6 pack bundle'], minMsrp: 32, maxMsrp: 45, name: 'Booster Bundle' },
    { id: 'etb', keywords: ['elite trainer box', 'etb'], minMsrp: 75, maxMsrp: 95, name: 'Elite Trainer Box' },
    { id: 'booster_box', keywords: ['booster box', '36 pack'], minMsrp: 180, maxMsrp: 230, name: 'Booster Box' },
    { id: 'upc', keywords: ['ultra premium', 'upc'], minMsrp: 170, maxMsrp: 220, name: 'Ultra Premium Collection' },
    { id: 'premium_collection', keywords: ['premium collection'], minMsrp: 70, maxMsrp: 120, name: 'Premium Collection' },
    { id: 'collection_box', keywords: ['special collection', 'collection box'], minMsrp: 45, maxMsrp: 80, name: 'Collection Box' },
    { id: 'tin', keywords: ['tin', 'collector tin'], minMsrp: 30, maxMsrp: 45, name: 'Tin' },
    { id: 'build_battle', keywords: ['build & battle', 'build and battle', 'prerelease'], minMsrp: 35, maxMsrp: 55, name: 'Build & Battle' },
    { id: 'mini_tin', keywords: ['mini tin'], minMsrp: 8, maxMsrp: 15, name: 'Mini Tin' },
    { id: 'pokeball_tin', keywords: ['pokeball', 'poke ball', 'pokéball'], minMsrp: 18, maxMsrp: 30, name: 'Pokeball Tin' },
    { id: 'poster_collection', keywords: ['poster collection', 'poster box'], minMsrp: 35, maxMsrp: 55, name: 'Poster Collection' },
    { id: 'binder', keywords: ['binder', 'portfolio'], minMsrp: 20, maxMsrp: 40, name: 'Binder/Portfolio' },
    { id: 'tech_sticker', keywords: ['tech sticker'], minMsrp: 25, maxMsrp: 40, name: 'Tech Sticker Collection' },
    { id: 'mystery_box', keywords: ['surprise box', 'mystery'], minMsrp: 50, maxMsrp: 100, name: 'Surprise/Mystery Box' }
  ],
  
  // Default tolerance: how much above MSRP is still considered "good value"
  // 0.15 = 15% above max MSRP is still acceptable
  defaultTolerance: 0.15
};

// Identify product type and check if price is good value
function getProductType(productName) {
  const lowerName = productName.toLowerCase();
  
  for (const pattern of MSRP_REFERENCE.patterns) {
    if (pattern.keywords.some(kw => lowerName.includes(kw))) {
      return pattern;
    }
  }
  
  // Return 'other' type for unrecognized Pokemon products
  return { id: 'other', name: 'Other Pokemon TCG', minMsrp: 0, maxMsrp: 999 };
}

// Check if product type is enabled in settings
function isProductTypeEnabled(productTypeId) {
  if (!settings.productTypes) return true; // Default to enabled if not set
  
  // If the specific type is set, use that
  if (productTypeId in settings.productTypes) {
    return settings.productTypes[productTypeId];
  }
  
  // Default to true for unknown types if 'other' is enabled
  return settings.productTypes.other !== false;
}

function isGoodValue(productName, price, tolerancePercent = MSRP_REFERENCE.defaultTolerance) {
  // If no price, we can't determine value - include it with a flag
  if (price === null || price === undefined) {
    return { isGood: true, reason: 'Price unknown', productType: null };
  }
  
  const productType = getProductType(productName);
  
  if (!productType) {
    // Unknown product type - include it but flag as unknown
    return { isGood: true, reason: 'Unknown product type', productType: null };
  }
  
  const maxAcceptablePrice = productType.maxMsrp * (1 + tolerancePercent);
  
  if (price <= productType.maxMsrp) {
    return { 
      isGood: true, 
      reason: `At MSRP ($${productType.minMsrp}-$${productType.maxMsrp})`,
      productType: productType.name,
      savings: `$${(productType.maxMsrp - price).toFixed(0)} under max`
    };
  } else if (price <= maxAcceptablePrice) {
    return { 
      isGood: true, 
      reason: `Near MSRP (${Math.round((price / productType.maxMsrp - 1) * 100)}% above)`,
      productType: productType.name
    };
  } else {
    return { 
      isGood: false, 
      reason: `Above MSRP by ${Math.round((price / productType.maxMsrp - 1) * 100)}%`,
      productType: productType.name,
      overpriced: `$${(price - productType.maxMsrp).toFixed(0)} over`
    };
  }
}

// Sample test products for testing notifications
const SAMPLE_PRODUCTS = [
  {
    name: 'Pokemon TCG: Prismatic Evolutions Elite Trainer Box',
    price: 84.95,  // Good value - at MSRP
    url: 'https://www.ebgames.com.au/product/trading-cards/pokemon-prismatic-evolutions-etb',
    retailer: 'EB Games',
    inStock: true
  },
  {
    name: 'Pokemon TCG: Surging Sparks Booster Bundle',
    price: 39.00,  // Good value - at MSRP
    url: 'https://www.bigw.com.au/product/pokemon-surging-sparks-bundle',
    retailer: 'Big W',
    inStock: true
  },
  {
    name: 'Pokemon Scarlet & Violet Ultra Premium Collection',
    price: 189.00,  // Good value - at MSRP
    url: 'https://www.jbhifi.com.au/products/pokemon-sv-upc',
    retailer: 'JB Hi-Fi',
    inStock: true
  },
  {
    name: 'Pokemon TCG: Paldea Evolved Elite Trainer Box',
    price: 159.00,  // OVERPRICED - will be filtered out
    url: 'https://www.example.com/overpriced-etb',
    retailer: 'Scalper Store',
    inStock: true
  }
];

// State
let settings = null;
let knownProducts = new Set();
let isChecking = false;
let notificationUrls = new Map();
let debugLog = [];

// Add to debug log
function addDebugLog(message, type = 'info') {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    message
  };
  debugLog.unshift(entry);
  debugLog = debugLog.slice(0, 100); // Keep last 100 entries
  log(message);
}

// ============================================
// Initialization
// ============================================
chrome.runtime.onInstalled.addListener(async () => {
  addDebugLog('Extension installed');
  await initializeSettings();
  await startMonitoring();
});

chrome.runtime.onStartup.addListener(async () => {
  addDebugLog('Extension started');
  await loadSettings();
  await loadKnownProducts();
  await startMonitoring();
});

// ============================================
// Offscreen Document Management (for Audio)
// ============================================
let creatingOffscreen = null;

async function setupOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });
    
    if (existingContexts.length > 0) {
      return;
    }
    
    if (creatingOffscreen) {
      await creatingOffscreen;
      return;
    }
    
    creatingOffscreen = chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play Pokemon-style notification sounds for drop alerts'
    });
    
    await creatingOffscreen;
    creatingOffscreen = null;
    addDebugLog('Offscreen document created for audio');
  } catch (error) {
    logError('Failed to setup offscreen document:', error);
  }
}

async function playAlertSound(soundType = 'catch') {
  try {
    await setupOffscreenDocument();
    await chrome.runtime.sendMessage({
      type: 'PLAY_SOUND',
      soundType: soundType
    });
    addDebugLog(`Sound played: ${soundType}`);
  } catch (error) {
    logError('Failed to play alert sound:', error);
  }
}

// ============================================
// Settings Management
// ============================================
async function initializeSettings() {
  const stored = await chrome.storage.local.get('pokedrop_settings');
  if (!stored.pokedrop_settings) {
    settings = {
      retailers: Object.keys(RETAILER_CONFIGS).map(id => ({
        id,
        name: RETAILER_CONFIGS[id].name,
        enabled: true
      })),
      keywords: [],
      productTypes: {
        booster_box: true,
        etb: true,
        upc: true,
        booster_bundle: true,
        premium_collection: true,
        collection_box: true,
        poster_collection: true,
        tech_sticker: true,
        tin: true,
        pokeball_tin: true,
        mini_tin: false,
        blister: false,
        booster_pack: false,
        build_battle: true,
        binder: false,
        mystery_box: false,
        other: true
      },
      checkInterval: 60,
      desktopNotifs: true,
      soundAlert: true,
      autoOpen: false,
      minPrice: 0,
      maxPrice: 500,
      goodValueOnly: true,  // Only alert for MSRP or near-MSRP prices
      valueTolerance: 15,   // Percentage above MSRP still considered good (15%)
      checksToday: 0,
      dropsFound: 0,
      lastCheck: null,
      history: [],
      recentDrops: [],
      isPaused: false
    };
    await chrome.storage.local.set({ pokedrop_settings: settings });
    addDebugLog('Settings initialized with defaults');
  } else {
    settings = stored.pokedrop_settings;
    addDebugLog('Settings loaded from storage');
  }
}

async function loadSettings() {
  const stored = await chrome.storage.local.get('pokedrop_settings');
  settings = stored.pokedrop_settings || null;
  if (!settings) {
    await initializeSettings();
  }
}

async function saveSettings() {
  await chrome.storage.local.set({ pokedrop_settings: settings });
}

async function loadKnownProducts() {
  const stored = await chrome.storage.local.get('pokedrop_known_products');
  if (stored.pokedrop_known_products) {
    knownProducts = new Set(stored.pokedrop_known_products);
    addDebugLog(`Loaded ${knownProducts.size} known products`);
  }
}

async function saveKnownProducts() {
  const productsArray = Array.from(knownProducts).slice(-1000);
  await chrome.storage.local.set({ pokedrop_known_products: productsArray });
}

// ============================================
// Monitoring
// ============================================
async function startMonitoring() {
  await chrome.alarms.clearAll();
  
  if (settings && !settings.isPaused) {
    chrome.alarms.create('checkDrops', {
      delayInMinutes: 0.5,
      periodInMinutes: settings.checkInterval / 60
    });
    addDebugLog(`Monitoring started - checking every ${settings.checkInterval}s`);
  } else {
    addDebugLog('Monitoring paused');
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkDrops') {
    await performCheck();
  }
});

// ============================================
// Main Check Function
// ============================================
async function performCheck(useTestData = false) {
  if (isChecking || !settings || settings.isPaused) {
    addDebugLog('Check skipped - already checking or paused');
    return [];
  }
  
  isChecking = true;
  addDebugLog('Starting drop check...');
  
  const enabledRetailers = settings.retailers.filter(r => r.enabled);
  let allProducts = [];
  
  if (useTestData) {
    // Use sample data for testing
    addDebugLog('Using TEST DATA for check');
    allProducts = SAMPLE_PRODUCTS.map(p => ({
      ...p,
      foundAt: Date.now()
    }));
  } else {
    // Try to scrape from open tabs first
    addDebugLog(`Checking ${enabledRetailers.length} enabled retailers`);
    
    for (const retailer of enabledRetailers) {
      const config = RETAILER_CONFIGS[retailer.id];
      if (!config) continue;
      
      try {
        const products = await scrapeRetailer(retailer.id, config);
        addDebugLog(`${config.name}: Found ${products.length} products`);
        allProducts.push(...products);
      } catch (error) {
        addDebugLog(`${config.name}: Error - ${error.message}`, 'error');
      }
    }
  }
  
  // Filter for new products
  const newDrops = [];
  const skippedOverpriced = [];
  const skippedProductType = [];
  
  for (const product of allProducts) {
    if (matchesKeywords(product.name) && matchesPriceRange(product.price)) {
      // Get product type
      const productType = getProductType(product.name);
      
      // Check if this product type is enabled
      if (!isProductTypeEnabled(productType?.id)) {
        addDebugLog(`Skipped (type disabled): ${product.name} [${productType?.name}]`);
        skippedProductType.push(product);
        continue;
      }
      
      // Check if good value (MSRP check)
      const valueCheck = isGoodValue(
        product.name, 
        product.price, 
        (settings.valueTolerance || 15) / 100
      );
      
      // If good value filter is on, skip overpriced items
      if (settings.goodValueOnly && !valueCheck.isGood) {
        addDebugLog(`Skipped (overpriced): ${product.name} - $${product.price} (${valueCheck.reason})`);
        skippedOverpriced.push(product);
        continue;
      }
      
      const productKey = `${product.retailer}:${product.name}`;
      if (!knownProducts.has(productKey)) {
        knownProducts.add(productKey);
        newDrops.push({
          ...product,
          foundAt: Date.now(),
          valueInfo: valueCheck,
          productType: valueCheck.productType,
          productTypeId: productType?.id
        });
      }
    }
  }
  
  if (skippedOverpriced.length > 0) {
    addDebugLog(`Filtered out ${skippedOverpriced.length} overpriced items`);
  }
  if (skippedProductType.length > 0) {
    addDebugLog(`Filtered out ${skippedProductType.length} disabled product types`);
  }
  
  // Update stats
  settings.checksToday++;
  settings.lastCheck = Date.now();
  
  // Reset daily counter at midnight
  const now = new Date();
  const lastCheckDate = settings.lastCheckDate ? new Date(settings.lastCheckDate) : null;
  if (!lastCheckDate || lastCheckDate.getDate() !== now.getDate()) {
    settings.checksToday = 1;
  }
  settings.lastCheckDate = now.toISOString();
  settings.recentDrops = newDrops;
  
  // Process new drops
  if (newDrops.length > 0) {
    addDebugLog(`🎉 Found ${newDrops.length} NEW drops!`);
    settings.dropsFound += newDrops.length;
    settings.history = [...newDrops, ...settings.history].slice(0, 100);
    
    await saveKnownProducts();
    
    // Play sound alert
    if (settings.soundAlert) {
      await playAlertSound(newDrops.length > 1 ? 'rare' : 'catch');
    }
    
    // Send notifications
    for (const drop of newDrops) {
      await notifyDrop(drop);
    }
    
    // Auto-open links
    if (settings.autoOpen) {
      for (const drop of newDrops) {
        await chrome.tabs.create({ url: drop.url, active: false });
      }
    }
  } else {
    addDebugLog('No new drops found this check');
  }
  
  await saveSettings();
  
  // Notify popup
  chrome.runtime.sendMessage({
    type: 'STATS_UPDATED',
    checksToday: settings.checksToday,
    dropsFound: settings.dropsFound,
    lastCheck: settings.lastCheck,
    recentDrops: newDrops
  }).catch(() => {});
  
  isChecking = false;
  addDebugLog(`Check complete. Total products scanned: ${allProducts.length}`);
  
  return newDrops;
}

// ============================================
// Scraping via Content Scripts
// ============================================
async function scrapeRetailer(retailerId, config) {
  const products = [];
  
  // Find any open tabs for this retailer
  const tabs = await chrome.tabs.query({
    url: `${config.baseUrl}/*`
  });
  
  if (tabs.length > 0) {
    addDebugLog(`Found ${tabs.length} open tab(s) for ${config.name}`);
    
    for (const tab of tabs) {
      try {
        // Send message to content script
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' });
        if (response?.success && response.products) {
          products.push(...response.products);
          addDebugLog(`Scraped ${response.products.length} products from tab`);
        }
      } catch (error) {
        // Content script might not be loaded
        addDebugLog(`Could not scrape tab: ${error.message}`, 'warn');
      }
    }
  } else {
    // No open tabs - try opening one in background
    addDebugLog(`No open tabs for ${config.name} - opening search page`);
    
    try {
      const searchUrl = config.searchUrls[0];
      const tab = await chrome.tabs.create({ url: searchUrl, active: false });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' });
        if (response?.success && response.products) {
          products.push(...response.products);
          addDebugLog(`Scraped ${response.products.length} products from new tab`);
        }
      } catch (e) {
        addDebugLog(`Content script not responding: ${e.message}`, 'warn');
      }
      
      // Close the tab
      await chrome.tabs.remove(tab.id);
    } catch (error) {
      addDebugLog(`Failed to open tab: ${error.message}`, 'error');
    }
  }
  
  return products;
}

// ============================================
// Keyword and Price Matching
// ============================================
function matchesKeywords(productName) {
  if (!productName) return false;
  
  // If no keywords set, match all Pokemon products
  if (!settings.keywords || settings.keywords.length === 0) {
    const lowerName = productName.toLowerCase();
    return lowerName.includes('pokemon') || lowerName.includes('pokémon');
  }
  
  const lowerName = productName.toLowerCase();
  return settings.keywords.some(keyword => 
    lowerName.includes(keyword.toLowerCase())
  );
}

function matchesPriceRange(price) {
  if (price === null || price === undefined) return true;
  return price >= settings.minPrice && price <= settings.maxPrice;
}

// ============================================
// Notifications
// ============================================
async function notifyDrop(drop) {
  addDebugLog(`Creating notification for: ${drop.name}`);
  
  if (!settings.desktopNotifs) {
    addDebugLog('Desktop notifications disabled');
    return;
  }
  
  const notificationId = `drop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  notificationUrls.set(notificationId, drop.url);
  
  // Build notification message with value info
  let message = drop.name;
  message += `\n${drop.retailer}`;
  if (drop.price) {
    message += ` - $${drop.price} AUD`;
  }
  if (drop.valueInfo?.reason) {
    message += ` ✓ ${drop.valueInfo.reason}`;
  }
  if (drop.valueInfo?.savings) {
    message += ` (${drop.valueInfo.savings})`;
  }
  message += '\n\nClick to view product!';
  
  const notificationOptions = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: drop.valueInfo?.savings ? '🎯 Great Value Drop!' : '🎴 Pokemon Card Drop!',
    message: message,
    priority: 2,
    requireInteraction: true
  };
  
  try {
    await chrome.notifications.create(notificationId, notificationOptions);
    addDebugLog(`Notification created: ${notificationId}`);
  } catch (error) {
    addDebugLog(`Notification failed: ${error.message}`, 'error');
    
    // Try simpler notification
    try {
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: 'Pokemon Card Drop!',
        message: `${drop.name} at ${drop.retailer}`
      });
    } catch (e) {
      logError('All notification attempts failed:', e);
    }
  }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  addDebugLog(`Notification clicked: ${notificationId}`);
  
  const url = notificationUrls.get(notificationId);
  if (url) {
    await chrome.tabs.create({ url, active: true });
    notificationUrls.delete(notificationId);
  } else if (settings.history?.length > 0) {
    await chrome.tabs.create({ url: settings.history[0].url, active: true });
  }
  
  chrome.notifications.clear(notificationId);
});

// ============================================
// Message Handling
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // Products found by content script
  if (message.type === 'PRODUCTS_FOUND') {
    addDebugLog(`Content script found ${message.products.length} products on ${message.retailer}`);
    // Process these products
    handleFoundProducts(message.products);
    sendResponse({ success: true });
    return false;
  }
  
  // Settings updated
  if (message.type === 'SETTINGS_UPDATED') {
    settings = message.settings;
    startMonitoring();
    sendResponse({ success: true });
    return false;
  }
  
  // Force check
  if (message.type === 'FORCE_CHECK') {
    performCheck(false).then((newDrops) => {
      sendResponse({ 
        success: true, 
        dropsFound: newDrops?.length || 0,
        drops: newDrops || []
      });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  // Test with sample data
  if (message.type === 'TEST_CHECK') {
    // Clear known products first so test data appears as new
    knownProducts.clear();
    performCheck(true).then((newDrops) => {
      sendResponse({ 
        success: true, 
        dropsFound: newDrops?.length || 0,
        drops: newDrops || []
      });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (message.type === 'GET_SETTINGS') {
    sendResponse({ settings });
    return false;
  }
  
  if (message.type === 'GET_DEBUG_LOG') {
    sendResponse({ log: debugLog });
    return false;
  }
  
  if (message.type === 'OPEN_URL') {
    chrome.tabs.create({ url: message.url, active: true });
    sendResponse({ success: true });
    return false;
  }
  
  if (message.type === 'TEST_SOUND') {
    playAlertSound(message.soundType || 'catch').then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (message.type === 'TEST_NOTIFICATION') {
    const testDrop = SAMPLE_PRODUCTS[0];
    notifyDrop(testDrop).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'CLEAR_KNOWN_PRODUCTS') {
    knownProducts.clear();
    saveKnownProducts();
    addDebugLog('Cleared all known products');
    sendResponse({ success: true });
    return false;
  }
  
  return false;
});

// Handle products found by content scripts
async function handleFoundProducts(products) {
  if (!products || products.length === 0) return;
  
  const newDrops = [];
  
  for (const product of products) {
    if (matchesKeywords(product.name) && matchesPriceRange(product.price)) {
      const productKey = `${product.retailer}:${product.name}`;
      if (!knownProducts.has(productKey)) {
        knownProducts.add(productKey);
        newDrops.push({
          ...product,
          foundAt: Date.now()
        });
      }
    }
  }
  
  if (newDrops.length > 0) {
    addDebugLog(`🎉 New drops from content script: ${newDrops.length}`);
    settings.dropsFound += newDrops.length;
    settings.history = [...newDrops, ...settings.history].slice(0, 100);
    
    await saveKnownProducts();
    await saveSettings();
    
    if (settings.soundAlert) {
      await playAlertSound(newDrops.length > 1 ? 'rare' : 'catch');
    }
    
    for (const drop of newDrops) {
      await notifyDrop(drop);
    }
    
    // Notify popup
    chrome.runtime.sendMessage({
      type: 'DROP_FOUND',
      product: newDrops[0],
      count: newDrops.length
    }).catch(() => {});
  }
}

// ============================================
// Initialize
// ============================================
loadSettings().then(() => {
  loadKnownProducts();
  if (settings && !settings.isPaused) {
    startMonitoring();
  }
});

addDebugLog('Background service worker loaded');
console.log('[PokéDrop] Background script ready. Debug mode:', DEBUG);
