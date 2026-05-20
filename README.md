# ScrapedDuck fork — Raid Hundo CP Widget

This fork keeps ScrapedDuck's general LeekDuck scraping, but replaces raid output with a stable JSON format for a personal iPhone Scriptable widget.

## Goal

Show current Pokémon GO raid bosses and only their 100% IV CP values:

```text
Raid Hundo CP
5★ Tapu Bulu 1953 / 2442
M  Mega Altaria 1145 / 1432
1★ Gible 635 / 794
```

## JSON URL

Scriptable reads:

```text
https://raw.githubusercontent.com/Kretkas/ScrapedDuck/data/raids.json
```

The file format is:

```js
{
  updatedAt: string,
  source: 'LeekDuck via ScrapedDuck fork',
  event: { title, status, url, starts, ends },
  raids: [
    {
      name,
      tier,
      tierLabel,
      combatPower: {
        normal: { max },
        boosted: { max }
      },
      weather,
      canBeShiny
    }
  ]
}
```

## Why this fork

LeekDuck's `/raid-bosses/` page can involve `ENDED`, `ONGOING`, and `UPCOMING` raid rotations. A simple server-side scrape of the first visible grid can pick the wrong rotation.

This fork uses the lightweight LeekDuck raid manifest (`/raids/manifest.json`) to select the active `ONGOING` event, then fetches `/raids/<slug>.html` and parses the cards. It also has HTML fallbacks for `/raid-bosses/`.

No Puppeteer, Playwright, Chromium, Selenium, or headless browser is used.

## Local checks

```bash
npm install
npm run scrape:raids
npm run check:raids
```

The parser refuses to write `files/raids.json` if it parses zero raid bosses.

## iPhone widget

Copy `scriptable/RaidHundoCP.js` into Scriptable. The default `DATA_URL` already points to this fork's data branch URL.

See `docs/setup-ios.md` for step-by-step setup.

## Credits

Raid data sourced from LeekDuck. Scraping approach based on ScrapedDuck. This fork is for personal use.
