# Using this in a ScrapedDuck fork

1. Fork `bigfoott/ScrapedDuck`.
2. Add the lightweight parser from `scripts/scrape-raids.js` or adapt it into the fork's existing parser layout.
3. Keep the implementation browserless:
   - Node.js native `fetch`
   - `cheerio`
   - `fs` / `path`
   - no Puppeteer, Playwright, Chromium, Chrome, Selenium, or headless browser
4. Ensure the generated file is published as:

   ```text
   data/raids.json
   ```

5. Check the raw URL:

   ```text
   https://raw.githubusercontent.com/Kretkas/ScrapedDuck/data/raids.json
   ```

6. Add `.github/workflows/update-raids.yml`.
7. Run the workflow manually with `workflow_dispatch`.
8. Confirm logs show:
   - `Found raid event links: N`
   - `Found ONGOING candidates: N`
   - `Selected event title: ...`
   - `Selected event URL: ...`
   - `Parsed raid bosses: N`
   - `Output file: data/raids.json`
9. Confirm future rotations select the new `ONGOING` event automatically.

If the parser cannot find the ongoing event or parses zero raids, it exits with an error and does not write an empty JSON file.
