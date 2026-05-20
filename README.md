# iScrapedDuck — Raid Hundo CP Widget

Personal ScrapedDuck fork for an iPhone Scriptable widget that shows current Pokémon GO raid bosses and their 100% IV CP values.

```text
Raid Hundo CP
1★ Gible 635 / 794
3★ Klawf 1373 / 1716
5★ Tapu Bulu 1953 / 2442
M  Mega Altaria 1145 / 1432
```

## What it does

- Finds the active `ONGOING` LeekDuck raid rotation.
- Parses raid boss cards without Puppeteer, Playwright, Chromium, Selenium, or any headless browser.
- Publishes a stable JSON file to the `data` branch.
- Lets Scriptable read ready-made JSON instead of scraping LeekDuck on iPhone.
- Shows only hundo CP: normal encounter CP and weather-boosted CP.

## Widget data URL

```text
https://raw.githubusercontent.com/Kretkas/iScrapedDuck/data/raids.json
```

`scriptable/RaidHundoCP.js` already uses this URL by default.

## Display order

The JSON is sorted for the widget in this order:

1. regular `1★`
2. regular `3★`
3. regular `5★`
4. Mega / Primal
5. Shadow `1★`
6. Shadow `3★`
7. Shadow `5★`

## JSON format

```json
{
  "updatedAt": "2026-05-20T18:45:00.000Z",
  "source": "LeekDuck via iScrapedDuck",
  "event": {
    "title": "Tapu Bulu and Mega Altaria in Raids",
    "status": "ONGOING",
    "url": "https://leekduck.com/raids/tapu-bulu-mega-altaria-may-2026",
    "starts": "May 20, 2026, 6:00 AM",
    "ends": "May 27, 2026, 6:00 AM"
  },
  "raids": [
    {
      "name": "Tapu Bulu",
      "tier": "5-Star Raids",
      "tierLabel": "5★",
      "combatPower": {
        "normal": { "max": 1953 },
        "boosted": { "max": 2442 }
      },
      "weather": ["Sunny", "Cloudy"],
      "canBeShiny": true
    }
  ]
}
```

## Install on iPhone

1. Install **Scriptable** from the App Store.
2. Open Scriptable.
3. Tap `+` to create a new script.
4. Name it `RaidHundoCP`.
5. Copy the contents of [`scriptable/RaidHundoCP.js`](scriptable/RaidHundoCP.js).
6. Paste it into the new Scriptable script.
7. Keep the default `CONFIG.DATA_URL`, or set it manually:

   ```js
   DATA_URL: 'https://raw.githubusercontent.com/Kretkas/iScrapedDuck/data/raids.json'
   ```

8. Run the script once inside Scriptable and check the preview.
9. On the iPhone Home Screen, long-press an empty area.
10. Tap `+`.
11. Search for **Scriptable**.
12. Choose a widget size. Large is best if you want all raid rows visible.
13. Add the widget.
14. Long-press the widget → `Edit Widget`.
15. Set `Script` to `RaidHundoCP`.

The widget caches the last successful JSON locally, so it can still show data when the phone is offline.

## Why this fork exists

LeekDuck's `/raid-bosses/` page can involve `ENDED`, `ONGOING`, and `UPCOMING` raid rotations. A naive server-side parser can accidentally read an old or first grid instead of the active ongoing raid event.

This fork uses LeekDuck's lightweight `/raids/manifest.json` to select the active `ONGOING` event, then fetches `/raids/<slug>.html` and parses the cards. HTML fallbacks are kept for resilience.

## Local development

```bash
npm install
npm run scrape:raids
npm run check:raids
```

The parser refuses to write `files/raids.json` if it parses zero raid bosses.

## GitHub Actions

The workflow runs on schedule and by `workflow_dispatch`. It writes generated files to the `data` branch, including:

- `raids.json`
- `raids.min.json`

## Credits

Raid data sourced from LeekDuck. Original scraping project: `bigfoott/ScrapedDuck`. This fork is for personal use.
