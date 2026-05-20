# Changelog

## v1.0.0 - 2026-05-20

Initial stable release of iScrapedDuck.

### Added

- Lightweight Pokémon GO raid hundo CP parser for LeekDuck.
- ONGOING raid event selection via LeekDuck `/raids/manifest.json`.
- Fallback HTML parsing for `/raid-bosses/` when manifest data is unavailable.
- Stable `data.raids` JSON format for Scriptable.
- Hundo CP-only output:
  - `combatPower.normal.max`
  - `combatPower.boosted.max`
- Tier labels for regular, Mega/Primal, and Shadow raids.
- Widget-focused sorting:
  - regular 1★, 3★, 5★
  - Mega / Primal
  - Shadow 1★, 3★, 5★
- Scriptable iPhone widget with local cache/offline fallback.
- GitHub Actions workflow that publishes generated data to the `data` branch.
- README installation guide for iPhone / Scriptable.
- Data source and fork notes documentation.

### Safety

- No Puppeteer, Playwright, Chromium, Selenium, or headless browser.
- Parser refuses to write empty raid data.
- Workflow validates `raids.json` before publishing generated data.

### Data URL

```text
https://raw.githubusercontent.com/Kretkas/iScrapedDuck/data/raids.json
```
