# Data source

The parser reads LeekDuck raid data and publishes a stable JSON file for the iPhone widget.

## Main problem

`https://leekduck.com/raid-bosses/` can contain multiple raid event states:

- `ENDED`
- `ONGOING`
- `UPCOMING`

The page URL does not necessarily change when the visible event changes. A naive parser can accidentally read an old or first grid instead of the active ongoing raid event.

## Parser approach

1. Fetch `https://leekduck.com/raid-bosses/` with normal Node `fetch`.
2. Fetch `/raids/manifest.json`, select the active `ONGOING` event using LeekDuck-style date logic, and fetch `/raids/<slug>.html`.
3. Fallback: search `/raid-bosses/` for `/raids/<slug>` links and surrounding `ONGOING` event blocks when present.
4. Support current LeekDuck markup where the selected `ONGOING` event and raid grid are embedded directly on `/raid-bosses/`.
5. Parse raid cards from the selected/current grid.
6. Extract only stable widget fields.
7. Refuse to write `data/raids.json` if no raid bosses were parsed.

No Puppeteer, Playwright, Chromium, Selenium, or headless browser is used.

## Used fields

- `name`
- `tier`
- `tierLabel`
- `combatPower.normal.max`
- `combatPower.boosted.max`
- `weather`
- `canBeShiny`

## Not used

- min CP
- PvP IV
- IV rank
- DPS
- TDO
- movesets
- counters
