# PokéDrop AU 🎴

A Chrome extension to monitor and get instant notifications for new Pokemon card releases and restocks across Australian retailers.

## Features

- **Real-time Monitoring** - Automatically checks Australian retailers for new Pokemon card drops
- **Instant Notifications** - Desktop notifications when new products are detected
- **Multiple Retailers** - Supports EB Games, Big W, JB Hi-Fi, Target, Kmart, Zing, Gameology, and more
- **Keyword Filters** - Only get notified for specific sets (Prismatic Evolutions, ETB, Booster Box, etc.)
- **Price Range Filter** - Set minimum and maximum price thresholds
- **Customizable Intervals** - Check every 30 seconds to 5 minutes
- **Auto-Open Links** - Optionally auto-open product pages when drops are detected
- **Drop History** - Track all the drops you've found

## Supported Australian Retailers

| Retailer | Website |
|----------|---------|
| EB Games | ebgames.com.au |
| Big W | bigw.com.au |
| JB Hi-Fi | jbhifi.com.au |
| Target | target.com.au |
| Kmart | kmart.com.au |
| Zing Pop Culture | zingpopculture.com.au |
| Gameology | gameology.com.au |
| Good Games | goodgames.com.au |
| Pokemon Center | pokemoncenter.com |

## Installation

### Step 1: Generate Icons

1. Open `generate-icons.html` in your browser
2. Click each "Download" button to save the PNG icons
3. Move the downloaded files to the `icons/` folder

### Step 2: Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `PokeDropExtension` folder containing the extension files

### Step 3: Configure the Extension

1. Click the PokéDrop icon in your Chrome toolbar
2. Enable/disable retailers you want to monitor
3. Add keywords for specific products you're looking for
4. Adjust the check interval and notification settings

## Usage

### Monitoring Retailers

Toggle retailers on/off in the **Retailers** tab. Only enabled retailers will be checked for new drops.

### Setting Up Keywords

In the **Keywords** tab, add specific search terms to filter results:

- **Prismatic Evolutions** - Monitor for the latest set
- **ETB** - Elite Trainer Boxes
- **Booster Box** - Booster box products
- **UPC** - Ultra Premium Collections
- Leave empty to get notifications for ALL Pokemon TCG products

### Quick Tips

- Click the status indicator to pause/resume monitoring
- Use the "Check Now" button to force an immediate check
- View your drop history by clicking the "History" button
- Set a price range to avoid notifications for overpriced products

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Check Interval | How often to scan retailers | 1 minute |
| Desktop Notifications | Show system notifications for drops | On |
| Sound Alert | Play sound when drops are found | On |
| Auto-open Links | Automatically open product pages | Off |
| Price Range | Min/max price filter (AUD) | $0 - $500 |

## Privacy

This extension:
- ✅ Only accesses retailer websites you enable
- ✅ Stores all data locally on your device
- ✅ Does not collect or transmit personal information
- ✅ Does not require any account or login

## Troubleshooting

### Extension not detecting drops

1. Make sure the retailer is enabled in settings
2. Check that your keywords match actual product names
3. Try clearing data and refreshing known products
4. Some retailers may block automated requests - try increasing the check interval

### Notifications not showing

1. Check that notifications are enabled in extension settings
2. Ensure Chrome has permission to show notifications
3. Check your system notification settings

### High CPU/Memory usage

1. Increase the check interval to 2-5 minutes
2. Disable retailers you don't need
3. Clear drop history periodically

## Development

### File Structure

```
PokeDropExtension/
├── manifest.json       # Extension manifest (MV3)
├── popup.html          # Extension popup UI
├── popup.css           # Popup styles
├── popup.js            # Popup logic
├── background.js       # Service worker for monitoring
├── generate-icons.html # Icon generator tool
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (no frameworks)
- Chrome Storage API for persistence
- Chrome Alarms API for scheduling
- Chrome Notifications API for alerts

## Disclaimer

This extension is for personal use only. Please be respectful of retailer websites and avoid setting extremely short check intervals that could be considered abusive. I, the developer (ethanwongg) am not responsible for any purchases made or missed through use of this extension.

## License

MIT License - Feel free to modify and share!

---

Made with love for the Pokemon TCG

