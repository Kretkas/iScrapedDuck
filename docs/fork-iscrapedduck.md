# iScrapedDuck fork notes

This repository is a personal fork of `bigfoott/ScrapedDuck` focused on raid hundo CP data for a Scriptable iPhone widget.

## What changed

- `pages/raids.js` now selects the active `ONGOING` raid event before parsing bosses.
- Raid output is written as an object with `updatedAt`, `source`, `event`, and `raids`.
- `data.raids` contains only widget-needed hundo CP fields.
- `scriptable/RaidHundoCP.js` reads the generated JSON from the `data` branch.

## Parser constraints

Allowed:

- Node.js native `fetch`
- `cheerio`
- `fs` / `path`
- plain HTML parsing

Not allowed:

- Puppeteer
- Playwright
- Chromium / Chrome
- Selenium
- any headless browser

## Generated data

Workflow output is published to the `data` branch:

```text
https://raw.githubusercontent.com/Kretkas/iScrapedDuck/data/raids.json
```

## Failure behavior

If the parser cannot find an ongoing event or parses zero raid bosses, it exits with an error and does not write an empty `raids.json`.

The workflow validates raid JSON before pushing generated data.
