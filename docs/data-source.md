# Data source

The iPhone widget reads prepared JSON from GitHub raw:

```text
https://raw.githubusercontent.com/Kretkas/iScrapedDuck/data/raids.json
```

Scriptable does not scrape LeekDuck directly.

## Source pages

The parser uses:

- `https://leekduck.com/raid-bosses/`
- `https://leekduck.com/raids/manifest.json`
- `https://leekduck.com/raids/<slug>.html`

## Why manifest-first

`/raid-bosses/` can involve multiple raid event states:

- `ENDED`
- `ONGOING`
- `UPCOMING`

The URL may stay the same while the visible event changes. A naive parser can pick an outdated grid. iScrapedDuck selects the active `ONGOING` event from `/raids/manifest.json`, then parses that event's `/raids/<slug>.html` content.

HTML fallbacks are still kept for resilience.

## Used fields

- `name`
- `tier`
- `tierLabel`
- `combatPower.normal.max`
- `combatPower.boosted.max`
- `weather`
- `canBeShiny`

## Why `max` CP

Raid encounters have fixed levels:

- level 20 without weather boost
- level 25 with weather boost

So the max value of a LeekDuck CP range is the 15/15/15, 100% IV CP.

## Not included

- min CP
- PvP IV
- IV rank
- DPS / TDO
- movesets
- counters
- maps / scanners
- account login or Pokémon GO automation
