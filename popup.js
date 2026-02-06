// ============================================
// PokéDrop AU - Popup Script
// ============================================

// Australian Pokemon Card Retailers
const RETAILERS = [
  {
    id: 'ebgames',
    name: 'EB Games',
    shortName: 'EB',
    url: 'https://www.ebgames.com.au',
    searchUrl: 'https://www.ebgames.com.au/search?q=pokemon+cards',
    enabled: true
  },
  {
    id: 'bigw',
    name: 'Big W',
    shortName: 'BW',
    url: 'https://www.bigw.com.au',
    searchUrl: 'https://www.bigw.com.au/toys/trading-cards/pokemon-trading-cards',
    enabled: true
  },
  {
    id: 'jbhifi',
    name: 'JB Hi-Fi',
    shortName: 'JB',
    url: 'https://www.jbhifi.com.au',
    searchUrl: 'https://www.jbhifi.com.au/collections/games-consoles/trading-cards?q=pokemon',
    enabled: true
  },
  {
    id: 'target',
    name: 'Target',
    shortName: 'TG',
    url: 'https://www.target.com.au',
    searchUrl: 'https://www.target.com.au/search?text=pokemon+cards',
    enabled: true
  },
  {
    id: 'kmart',
    name: 'Kmart',
    shortName: 'KM',
    url: 'https://www.kmart.com.au',
    searchUrl: 'https://www.kmart.com.au/search/?searchTerm=pokemon%20cards',
    enabled: true
  },
  {
    id: 'zing',
    name: 'Zing Pop Culture',
    shortName: 'ZG',
    url: 'https://www.zingpopculture.com.au',
    searchUrl: 'https://www.zingpopculture.com.au/search?q=pokemon+tcg',
    enabled: true
  },
  {
    id: 'gameology',
    name: 'Gameology',
    shortName: 'GO',
    url: 'https://www.gameology.com.au',
    searchUrl: 'https://www.gameology.com.au/collections/pokemon',
    enabled: true
  },
  {
    id: 'goodgames',
    name: 'Good Games',
    shortName: 'GG',
    url: 'https://www.goodgames.com.au',
    searchUrl: 'https://www.goodgames.com.au/tcg/pokemon.html',
    enabled: false
  },
  {
    id: 'pokemoncenter',
    name: 'Pokemon Center',
    shortName: 'PC',
    url: 'https://www.pokemoncenter.com',
    searchUrl: 'https://www.pokemoncenter.com/category/trading-card-game',
    enabled: false
  }
];

// Product Types Configuration
const PRODUCT_TYPES = {
  booster_box: { name: 'Booster Box', enabled: true },
  etb: { name: 'Elite Trainer Box', enabled: true },
  upc: { name: 'Ultra Premium Collection', enabled: true },
  booster_bundle: { name: 'Booster Bundle', enabled: true },
  premium_collection: { name: 'Premium Collection', enabled: true },
  collection_box: { name: 'Special Collection Box', enabled: true },
  poster_collection: { name: 'Poster Collection', enabled: true },
  tech_sticker: { name: 'Tech Sticker Collection', enabled: true },
  tin: { name: 'Collector Tin', enabled: true },
  pokeball_tin: { name: 'Pokeball Tin', enabled: true },
  mini_tin: { name: 'Mini Tin', enabled: false },
  blister: { name: 'Blister Pack', enabled: false },
  booster_pack: { name: 'Single Booster Pack', enabled: false },
  build_battle: { name: 'Build & Battle Box', enabled: true },
  binder: { name: 'Binder / Portfolio', enabled: false },
  mystery_box: { name: 'Mystery Box', enabled: false },
  other: { name: 'Other Pokemon TCG', enabled: true }
};

// Default Settings
const DEFAULT_SETTINGS = {
  retailers: RETAILERS,
  keywords: [],
  productTypes: Object.fromEntries(
    Object.entries(PRODUCT_TYPES).map(([id, config]) => [id, config.enabled])
  ),
  checkInterval: 60, // seconds
  desktopNotifs: true,
  soundAlert: true,
  autoOpen: false,
  minPrice: 0,
  maxPrice: 500,
  goodValueOnly: true,   // Only alert for MSRP prices (ON by default)
  valueTolerance: 15,    // 15% above MSRP still acceptable
  checksToday: 0,
  dropsFound: 0,
  lastCheck: null,
  history: [],
  recentDrops: [],
  isPaused: false
};

// State
let settings = { ...DEFAULT_SETTINGS };

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  renderUI();
  setupEventListeners();
  updateStats();
});

// Load settings from storage
async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get('pokedrop_settings');
    if (stored.pokedrop_settings) {
      settings = { ...DEFAULT_SETTINGS, ...stored.pokedrop_settings };
      // Merge retailer states
      settings.retailers = RETAILERS.map(r => {
        const saved = stored.pokedrop_settings.retailers?.find(sr => sr.id === r.id);
        return saved ? { ...r, enabled: saved.enabled } : r;
      });
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    await chrome.storage.local.set({ pokedrop_settings: settings });
    // Notify background script
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// ============================================
// UI Rendering
// ============================================
function renderUI() {
  renderRetailers();
  renderProductTypes();
  renderKeywords();
  renderSettings();
  updateStatusIndicator();
}

function renderProductTypes() {
  // Set checkbox states based on settings
  document.querySelectorAll('.product-type-check').forEach(checkbox => {
    const productId = checkbox.dataset.product;
    if (settings.productTypes && productId in settings.productTypes) {
      checkbox.checked = settings.productTypes[productId];
    }
  });
  
  updateProductTypeStyles();
}

function updateProductTypeStyles() {
  document.querySelectorAll('.product-type-item').forEach(item => {
    const checkbox = item.querySelector('.product-type-check');
    if (checkbox) {
      item.classList.toggle('selected', checkbox.checked);
    }
  });
}

function renderRetailers() {
  const container = document.getElementById('retailersList');
  container.innerHTML = settings.retailers.map(retailer => `
    <div class="retailer-item ${retailer.enabled ? '' : 'disabled'}" data-id="${retailer.id}">
      <div class="retailer-logo">${retailer.shortName}</div>
      <div class="retailer-info">
        <div class="retailer-name">${retailer.name}</div>
        <div class="retailer-url">${retailer.url.replace('https://', '')}</div>
      </div>
      <div class="retailer-toggle">
        <label class="toggle">
          <input type="checkbox" ${retailer.enabled ? 'checked' : ''} data-retailer="${retailer.id}">
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  `).join('');
}

function renderKeywords() {
  const container = document.getElementById('keywordsList');
  
  if (settings.keywords.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 11px;">No keywords set - monitoring all Pokemon TCG products</span>';
    return;
  }
  
  container.innerHTML = settings.keywords.map(keyword => `
    <div class="keyword-chip">
      <span>${keyword}</span>
      <button class="remove-keyword" data-keyword="${keyword}">&times;</button>
    </div>
  `).join('');
  
  // Update preset chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    const keyword = chip.dataset.keyword;
    chip.classList.toggle('added', settings.keywords.includes(keyword));
  });
}

function renderSettings() {
  // Interval buttons
  document.querySelectorAll('.interval-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.interval) === settings.checkInterval);
  });
  
  // Toggles
  document.getElementById('desktopNotifs').checked = settings.desktopNotifs;
  document.getElementById('soundAlert').checked = settings.soundAlert;
  document.getElementById('autoOpen').checked = settings.autoOpen;
  
  // Good value filter
  document.getElementById('goodValueOnly').checked = settings.goodValueOnly !== false;
  document.getElementById('valueTolerance').value = settings.valueTolerance || 15;
  document.getElementById('toleranceValue').textContent = `${settings.valueTolerance || 15}%`;
  
  // Show/hide tolerance slider based on filter state
  const toleranceContainer = document.getElementById('toleranceContainer');
  if (toleranceContainer) {
    toleranceContainer.style.display = settings.goodValueOnly !== false ? 'block' : 'none';
  }
  
  // Price inputs
  document.getElementById('minPrice').value = settings.minPrice;
  document.getElementById('maxPrice').value = settings.maxPrice;
}

function updateStatusIndicator() {
  const indicator = document.getElementById('statusIndicator');
  const statusText = indicator.querySelector('.status-text');
  
  if (settings.isPaused) {
    indicator.classList.add('paused');
    statusText.textContent = 'Paused';
  } else {
    indicator.classList.remove('paused');
    statusText.textContent = 'Monitoring';
  }
}

function updateStats() {
  document.getElementById('checksToday').textContent = settings.checksToday || 0;
  document.getElementById('dropsFound').textContent = settings.dropsFound || 0;
  
  if (settings.lastCheck) {
    const date = new Date(settings.lastCheck);
    document.getElementById('lastCheck').textContent = 
      date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  }
}

// ============================================
// Recent Drops Panel
// ============================================
function showRecentDrops(drops) {
  const panel = document.getElementById('recentDropsPanel');
  const list = document.getElementById('recentDropsList');
  
  if (!drops || drops.length === 0) {
    list.innerHTML = `
      <div class="recent-drops-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12l2 2 4-4"/>
        </svg>
        <p>No new drops found this check.<br>We'll keep looking!</p>
      </div>
    `;
  } else {
    list.innerHTML = drops.map(drop => {
      // Determine value badge
      let valueBadge = '';
      if (drop.valueInfo?.savings) {
        valueBadge = `<span class="value-badge great">🎯 ${drop.valueInfo.savings}</span>`;
      } else if (drop.valueInfo?.reason && drop.valueInfo.isGood) {
        valueBadge = `<span class="value-badge good">✓ ${drop.productType || 'Good Value'}</span>`;
      }
      
      return `
        <div class="recent-drop-item" data-url="${drop.url}">
          <div class="recent-drop-icon">🎴</div>
          <div class="recent-drop-info">
            <div class="recent-drop-name">${drop.name}${valueBadge}</div>
            <div class="recent-drop-meta">
              <span class="recent-drop-retailer">${drop.retailer}</span>
              ${drop.price ? `<span class="recent-drop-price">$${drop.price} AUD</span>` : ''}
              ${drop.productType ? `<span style="color: var(--text-muted);">${drop.productType}</span>` : ''}
            </div>
          </div>
          <div class="recent-drop-arrow">→</div>
        </div>
      `;
    }).join('');
    
    // Add click handlers
    list.querySelectorAll('.recent-drop-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        if (url) {
          chrome.tabs.create({ url: url, active: true });
        }
      });
    });
  }
  
  panel.classList.add('active');
}

function hideRecentDrops() {
  document.getElementById('recentDropsPanel').classList.remove('active');
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // Retailer toggles
  document.getElementById('retailersList').addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox') {
      const retailerId = e.target.dataset.retailer;
      const retailer = settings.retailers.find(r => r.id === retailerId);
      if (retailer) {
        retailer.enabled = e.target.checked;
        e.target.closest('.retailer-item').classList.toggle('disabled', !e.target.checked);
        await saveSettings();
      }
    }
  });
  
  // Toggle all retailers
  document.getElementById('toggleAllRetailers').addEventListener('click', async () => {
    const allEnabled = settings.retailers.every(r => r.enabled);
    settings.retailers.forEach(r => r.enabled = !allEnabled);
    renderRetailers();
    await saveSettings();
  });
  
  // Product type checkboxes
  document.querySelectorAll('.product-type-check').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const productId = e.target.dataset.product;
      if (!settings.productTypes) {
        settings.productTypes = {};
      }
      settings.productTypes[productId] = e.target.checked;
      updateProductTypeStyles();
      await saveSettings();
    });
  });
  
  // Toggle all products
  document.getElementById('toggleAllProducts')?.addEventListener('click', async () => {
    const allEnabled = Object.values(settings.productTypes || {}).every(v => v);
    Object.keys(PRODUCT_TYPES).forEach(id => {
      settings.productTypes[id] = !allEnabled;
    });
    renderProductTypes();
    await saveSettings();
  });
  
  // Select high value only
  document.getElementById('selectHighValue')?.addEventListener('click', async () => {
    const highValueProducts = ['booster_box', 'etb', 'upc', 'premium_collection', 'collection_box', 'build_battle'];
    Object.keys(PRODUCT_TYPES).forEach(id => {
      settings.productTypes[id] = highValueProducts.includes(id);
    });
    renderProductTypes();
    await saveSettings();
    showToast('Selected high value products only');
  });
  
  // Select all products
  document.getElementById('selectAll')?.addEventListener('click', async () => {
    Object.keys(PRODUCT_TYPES).forEach(id => {
      settings.productTypes[id] = true;
    });
    renderProductTypes();
    await saveSettings();
    showToast('All product types selected');
  });
  
  // Clear all products
  document.getElementById('selectNone')?.addEventListener('click', async () => {
    Object.keys(PRODUCT_TYPES).forEach(id => {
      settings.productTypes[id] = false;
    });
    renderProductTypes();
    await saveSettings();
    showToast('All product types cleared');
  });
  
  // Add keyword
  document.getElementById('addKeyword').addEventListener('click', addKeyword);
  document.getElementById('keywordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addKeyword();
  });
  
  // Remove keyword
  document.getElementById('keywordsList').addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-keyword')) {
      const keyword = e.target.dataset.keyword;
      settings.keywords = settings.keywords.filter(k => k !== keyword);
      renderKeywords();
      await saveSettings();
    }
  });
  
  // Preset keywords
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const keyword = chip.dataset.keyword;
      if (!settings.keywords.includes(keyword)) {
        settings.keywords.push(keyword);
        renderKeywords();
        await saveSettings();
        showToast(`Added "${keyword}"`);
      }
    });
  });
  
  // Interval selector
  document.querySelectorAll('.interval-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      settings.checkInterval = parseInt(btn.dataset.interval);
      document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await saveSettings();
    });
  });
  
  // Setting toggles
  document.getElementById('desktopNotifs').addEventListener('change', async (e) => {
    settings.desktopNotifs = e.target.checked;
    if (e.target.checked) {
      await requestNotificationPermission();
    }
    await saveSettings();
  });
  
  document.getElementById('soundAlert').addEventListener('change', async (e) => {
    settings.soundAlert = e.target.checked;
    await saveSettings();
  });
  
  document.getElementById('autoOpen').addEventListener('change', async (e) => {
    settings.autoOpen = e.target.checked;
    await saveSettings();
  });
  
  // Good value filter toggle
  document.getElementById('goodValueOnly').addEventListener('change', async (e) => {
    settings.goodValueOnly = e.target.checked;
    const toleranceContainer = document.getElementById('toleranceContainer');
    if (toleranceContainer) {
      toleranceContainer.style.display = e.target.checked ? 'block' : 'none';
    }
    await saveSettings();
    showToast(e.target.checked ? '💰 Good value filter ON' : 'Filter OFF - all prices shown');
  });
  
  // Value tolerance slider
  document.getElementById('valueTolerance').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('toleranceValue').textContent = `${value}%`;
  });
  
  document.getElementById('valueTolerance').addEventListener('change', async (e) => {
    settings.valueTolerance = parseInt(e.target.value);
    await saveSettings();
  });

  // Test sound button
  document.getElementById('testSound').addEventListener('click', async () => {
    const btn = document.getElementById('testSound');
    btn.disabled = true;
    btn.textContent = '🔊';
    
    try {
      await chrome.runtime.sendMessage({ type: 'TEST_SOUND', soundType: 'catch' });
      showToast('🔊 Sound played!', 'success');
    } catch (error) {
      console.error('Failed to test sound:', error);
      showToast('Sound test failed', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔊';
    }
  });
  
  // Test notification button
  document.getElementById('testNotification').addEventListener('click', async () => {
    const btn = document.getElementById('testNotification');
    btn.disabled = true;
    
    try {
      await chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' });
      showToast('📬 Test notification sent!', 'success');
    } catch (error) {
      console.error('Failed to test notification:', error);
      showToast('Notification test failed - check Mac settings', 'error');
    } finally {
      btn.disabled = false;
    }
  });
  
  // Test with sample data button
  document.getElementById('testWithSampleData').addEventListener('click', async () => {
    const btn = document.getElementById('testWithSampleData');
    btn.disabled = true;
    btn.textContent = 'Testing...';
    
    hideRecentDrops();
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'TEST_CHECK' });
      
      if (response?.success) {
        await loadSettings();
        updateStats();
        
        const drops = response.drops || [];
        showRecentDrops(drops);
        
        if (drops.length > 0) {
          showToast(`🎉 Test complete! Found ${drops.length} sample drops`, 'success');
        }
      }
    } catch (error) {
      console.error('Test failed:', error);
      showToast('Test failed', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <path d="M12 8v8"/>
          <path d="M8 12h8"/>
        </svg>
        Test Full Flow (Sample Data)
      `;
    }
  });
  
  // View debug log button
  document.getElementById('viewDebugLog').addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_DEBUG_LOG' });
      showDebugModal(response?.log || []);
    } catch (error) {
      showToast('Failed to get debug log', 'error');
    }
  });
  
  // Clear known products button
  document.getElementById('clearKnownProducts').addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_KNOWN_PRODUCTS' });
      showToast('Cache cleared - next check will find all products as new', 'success');
    } catch (error) {
      showToast('Failed to clear cache', 'error');
    }
  });
  
  // Close debug modal
  document.getElementById('closeDebug').addEventListener('click', () => {
    document.getElementById('debugModal').classList.remove('active');
  });
  
  document.getElementById('debugModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove('active');
    }
  });
  
  // Price filters
  document.getElementById('minPrice').addEventListener('change', async (e) => {
    settings.minPrice = parseInt(e.target.value) || 0;
    await saveSettings();
  });
  
  document.getElementById('maxPrice').addEventListener('change', async (e) => {
    settings.maxPrice = parseInt(e.target.value) || 500;
    await saveSettings();
  });
  
  // Force check - Updated to show recent drops
  document.getElementById('forceCheck').addEventListener('click', async () => {
    const btn = document.getElementById('forceCheck');
    btn.classList.add('loading');
    btn.disabled = true;
    
    // Hide any existing recent drops panel
    hideRecentDrops();
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'FORCE_CHECK' });
      
      if (response?.success) {
        await loadSettings();
        updateStats();
        
        // Show recent drops panel with results
        const drops = response.drops || [];
        showRecentDrops(drops);
        
        if (drops.length > 0) {
          showToast(`🎉 Found ${drops.length} drop${drops.length > 1 ? 's' : ''}!`, 'success');
        } else {
          showToast('Check complete - no new drops', 'success');
        }
      }
    } catch (error) {
      console.error('Check failed:', error);
      showToast('Check failed', 'error');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
  
  // Close recent drops panel
  document.getElementById('closeRecentDrops').addEventListener('click', hideRecentDrops);
  
  // View history
  document.getElementById('viewHistory').addEventListener('click', () => {
    showHistoryModal();
  });
  
  // Close history modal
  document.getElementById('closeHistory').addEventListener('click', () => {
    document.getElementById('historyModal').classList.remove('active');
  });
  
  document.getElementById('historyModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove('active');
    }
  });
  
  // Clear data
  document.getElementById('clearData').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      settings = { ...DEFAULT_SETTINGS };
      await saveSettings();
      // Also clear known products
      await chrome.storage.local.remove('pokedrop_known_products');
      renderUI();
      showToast('All data cleared', 'success');
    }
  });
  
  // Status indicator click to toggle pause
  document.getElementById('statusIndicator').addEventListener('click', async () => {
    settings.isPaused = !settings.isPaused;
    updateStatusIndicator();
    await saveSettings();
    showToast(settings.isPaused ? 'Monitoring paused' : 'Monitoring resumed');
  });
}

// ============================================
// Helper Functions
// ============================================
function switchTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  
  // Update panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `${tabId}-panel`);
  });
}

async function addKeyword() {
  const input = document.getElementById('keywordInput');
  const keyword = input.value.trim();
  
  if (keyword && !settings.keywords.includes(keyword)) {
    settings.keywords.push(keyword);
    input.value = '';
    renderKeywords();
    await saveSettings();
    showToast(`Added "${keyword}"`);
  } else if (settings.keywords.includes(keyword)) {
    showToast('Keyword already exists', 'error');
  }
}

async function requestNotificationPermission() {
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('Notifications blocked', 'error');
      document.getElementById('desktopNotifs').checked = false;
      settings.desktopNotifs = false;
    }
  }
}

function showHistoryModal() {
  const modal = document.getElementById('historyModal');
  const historyList = document.getElementById('historyList');
  
  if (!settings.history || settings.history.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <p>No drops found yet.<br>Keep monitoring!</p>
      </div>
    `;
  } else {
    historyList.innerHTML = settings.history.slice(0, 50).map(item => `
      <div class="history-item" data-url="${item.url}">
        <div class="history-icon">🎴</div>
        <div class="history-info">
          <div class="history-title">${item.name}</div>
          <div class="history-meta">
            <span class="history-retailer">${item.retailer}</span>
            ${item.price ? `<span class="history-price">$${item.price}</span>` : ''}
            <span>${formatTimeAgo(item.foundAt)}</span>
          </div>
        </div>
      </div>
    `).join('');
    
    // Add click handlers to history items
    historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        if (url) {
          chrome.tabs.create({ url: url, active: true });
        }
      });
    });
  }
  
  modal.classList.add('active');
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function showDebugModal(logEntries) {
  const modal = document.getElementById('debugModal');
  const list = document.getElementById('debugLogList');
  
  if (!logEntries || logEntries.length === 0) {
    list.innerHTML = '<div class="debug-empty">No debug logs yet. Try running a check!</div>';
  } else {
    list.innerHTML = logEntries.map(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      return `
        <div class="debug-entry">
          <span class="debug-time">${time}</span>
          <span class="debug-type ${entry.type}">${entry.type}</span>
          <span class="debug-message">${entry.message}</span>
        </div>
      `;
    }).join('');
  }
  
  modal.classList.add('active');
}

function showToast(message, type = '') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Listen for updates from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATS_UPDATED') {
    settings.checksToday = message.checksToday;
    settings.dropsFound = message.dropsFound;
    settings.lastCheck = message.lastCheck;
    updateStats();
    
    // Show recent drops if any
    if (message.recentDrops && message.recentDrops.length > 0) {
      showRecentDrops(message.recentDrops);
    }
  }
  
  if (message.type === 'DROP_FOUND') {
    showToast(`🎉 New drop: ${message.product.name}`, 'success');
    loadSettings().then(() => {
      updateStats();
    });
  }
});
