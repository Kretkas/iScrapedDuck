const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BASE_URL = 'https://leekduck.com';
const RAID_BOSSES_URL = process.env.RAID_BOSSES_URL || `${BASE_URL}/raid-bosses/`;
const RAID_MANIFEST_URL = process.env.RAID_MANIFEST_URL || `${BASE_URL}/raids/manifest.json`;
const OUT_FILE = path.join(process.cwd(), 'files', 'raids.json');
const OUT_MIN_FILE = path.join(process.cwd(), 'files', 'raids.min.json');
const USER_AGENT = 'Mozilla/5.0 iScrapedDuck for personal Pokemon GO hundo widget';

function get() {
    return main().catch((err) => {
        console.error(err);
        process.exitCode = 1;
    });
}

async function main() {
    console.log(`Fetching index: ${RAID_BOSSES_URL}`);
    const indexHtml = await fetchText(RAID_BOSSES_URL);

    const manifest = await fetchRaidManifest().catch((err) => {
        console.warn(`Could not fetch raid manifest, falling back to index HTML only: ${err.message}`);
        return null;
    });

    const event = manifest ? extractOngoingRaidEventFromManifest(manifest, 'regular') : extractOngoingRaidEvent(indexHtml);
    const shadowEvent = manifest ? extractOngoingRaidEventFromManifest(manifest, 'shadow', { optional: true }) : null;

    if (!event || !event.url) {
        throw new Error('Could not find ONGOING raid event URL');
    }

    console.log(`Selected event title: ${event.title}`);
    console.log(`Selected event URL: ${event.url}`);

    const eventHtml = event.contentUrl ? await fetchText(event.contentUrl) : event.url === RAID_BOSSES_URL ? indexHtml : await fetchText(event.url);
    const raids = parseRaidEventPage(eventHtml, event, event.type || 'regular');

    if (shadowEvent && shadowEvent.contentUrl) {
        console.log(`Selected shadow event title: ${shadowEvent.title}`);
        console.log(`Selected shadow event URL: ${shadowEvent.url}`);
        const shadowHtml = await fetchText(shadowEvent.contentUrl);
        raids.push(...parseRaidEventPage(shadowHtml, shadowEvent, 'shadow'));
    }

    const outputRaids = dedupeRaids(raids).sort((a, b) => tierPriority(a.tier) - tierPriority(b.tier) || a.name.localeCompare(b.name));
    if (!outputRaids.length) {
        throw new Error('Parsed zero raid bosses. Refusing to overwrite raids.json');
    }

    const output = {
        updatedAt: new Date().toISOString(),
        source: 'LeekDuck via iScrapedDuck',
        event: stripInternalEventFields(event),
        raids: outputRaids
    };

    writeRaidsJson(output);
    console.log(`Parsed raid bosses: ${outputRaids.length}`);
    console.log(`Output file: ${OUT_FILE}`);
}

async function fetchText(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }

    return await res.text();
}

async function fetchRaidManifest() {
    console.log(`Fetching raid manifest: ${RAID_MANIFEST_URL}`);
    const res = await fetch(RAID_MANIFEST_URL, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json,text/plain,*/*'
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch ${RAID_MANIFEST_URL}: ${res.status} ${res.statusText}`);
    }

    return await res.json();
}

function absoluteUrl(href) {
    return new URL(href, BASE_URL).toString();
}

function extractOngoingRaidEventFromManifest(manifest, type = 'regular', options = {}) {
    const key = type === 'shadow' ? 'shadow_raids' : 'regular_raids';
    const entries = Array.isArray(manifest && manifest[key]) ? manifest[key] : [];
    const now = new Date();
    const candidates = entries.map((raid) => Object.assign({}, raid, raidStatus(raid, now)));
    const ongoing = candidates.filter((raid) => raid.isActive && !raid.isInactive && !hasTag(raid, 'Exclusive'));

    console.log(`Found ${type} raid manifest entries: ${entries.length}`);
    if (type === 'regular') {
        console.log(`Found raid event links: ${entries.length}`);
        console.log(`Found ONGOING candidates: ${ongoing.length}`);
    }
    console.log(`Found ${type.toUpperCase()} ONGOING candidates: ${ongoing.length}`);

    if (!ongoing.length) {
        if (options.optional) return null;
        throw new Error(`Could not find ONGOING ${type} raid event in manifest`);
    }

    return buildEventFromManifest(ongoing.sort(compareActiveRaidEvents)[0]);
}

function buildEventFromManifest(event) {
    return {
        title: event.title,
        status: 'ONGOING',
        url: `${BASE_URL}/raids/${event.slug}`,
        contentUrl: `${BASE_URL}/raids/${event.slug}.html`,
        starts: formatManifestDate(event.start_date),
        ends: formatManifestDate(event.end_date),
        type: event.type || 'regular',
        dataPath: event.data_path || null
    };
}

function raidStatus(event, now) {
    const startDate = parseManifestDate(event.start_date, event.local_time);
    const endDate = parseManifestDate(event.end_date, event.local_time);

    return {
        startDate,
        endDate,
        isActive: !!startDate && !!endDate && now >= startDate && now <= endDate,
        isUpcoming: !!startDate && startDate > now,
        isEnded: !!endDate && endDate < now,
        isInactive: hasTag(event, 'Inactive') || event.isInactive === true
    };
}

function compareActiveRaidEvents(a, b) {
    const aEvent = hasTag(a, 'Event') ? 0 : 1;
    const bEvent = hasTag(b, 'Event') ? 0 : 1;
    if (aEvent !== bEvent) return aEvent - bEvent;

    const aEnd = a.endDate ? a.endDate.getTime() : Infinity;
    const bEnd = b.endDate ? b.endDate.getTime() : Infinity;
    if (aEnd !== bEnd) return aEnd - bEnd;

    const aDuration = a.endDate && a.startDate ? a.endDate - a.startDate : Infinity;
    const bDuration = b.endDate && b.startDate ? b.endDate - b.startDate : Infinity;
    if (aDuration !== bDuration) return aDuration - bDuration;

    const aStart = a.startDate ? a.startDate.getTime() : 0;
    const bStart = b.startDate ? b.startDate.getTime() : 0;
    return bStart - aStart;
}

function parseManifestDate(value, localTime = false) {
    if (!value) return null;

    if (localTime) {
        const match = String(value).match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
        if (match) return new Date(`${match[1]}T${match[2]}`);
    }

    return new Date(String(value).replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, '$1T$2').replace(/\s+([+-])(\d{2})(\d{2})$/, '$1$2:$3'));
}

function formatManifestDate(value) {
    const date = parseManifestDate(value, true);
    if (!date || Number.isNaN(date.getTime())) return value || null;

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(date);
}

function hasTag(event, tag) {
    return Array.isArray(event && event.tags) && event.tags.includes(tag);
}

function extractOngoingRaidEvent(html) {
    const $ = cheerio.load(html);
    const linkCandidates = collectRaidLinkCandidates($);
    const selectedBlock = extractSelectedEventBlock($, 'regular');

    console.log(`Found raid event links: ${linkCandidates.length}`);
    console.log(`Found ONGOING candidates: ${linkCandidates.filter((c) => c.isOngoing).length + (selectedBlock && selectedBlock.isOngoing ? 1 : 0)}`);

    const ongoingLinks = linkCandidates.filter((c) => c.isOngoing);
    if (ongoingLinks.length) return buildEventFromCandidate(pickBestOngoingCandidate(ongoingLinks));

    if (selectedBlock && selectedBlock.isOngoing) {
        return {
            title: selectedBlock.title,
            status: 'ONGOING',
            url: selectedBlock.url || RAID_BOSSES_URL,
            starts: selectedBlock.starts,
            ends: selectedBlock.ends,
            dataPath: selectedBlock.dataPath || null,
            type: 'regular'
        };
    }

    const hasOngoing = /ONGOING|Ongoing/i.test(html);
    console.log(`HTML contains ONGOING: ${hasOngoing}`);
    console.log('All /raids/ links found:');
    for (const c of linkCandidates) console.log(`- ${c.url} | ${c.text.slice(0, 220)}`);
    throw new Error('Could not find ONGOING raid event');
}

function collectRaidLinkCandidates($) {
    const candidates = [];

    $('a[href*="/raids/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        const url = absoluteUrl(href);
        let bestText = '';
        let node = $(el);

        for (let depth = 0; depth < 8; depth++) {
            const text = cleanText(node.text());
            if (text.length > bestText.length) bestText = text;
            if (/ONGOING/i.test(text)) break;
            node = node.parent();
            if (!node.length) break;
        }

        candidates.push({
            url,
            text: bestText,
            title: extractEventTitle(bestText),
            starts: extractTimeValue(bestText, 'Starts'),
            ends: extractTimeValue(bestText, 'Ends'),
            isOngoing: /ONGOING/i.test(bestText),
            isUpcoming: /UPCOMING/i.test(bestText),
            isEnded: /ENDED/i.test(bestText)
        });
    });

    return dedupeBy(candidates, (c) => `${c.url}|${c.title}`);
}

function extractSelectedEventBlock($, type = 'regular') {
    const block = $(`#${type}-raid-selector .custom-dropdown-selected`).first();
    if (!block.length) return null;

    const title = cleanText(block.find('.title-text').first().text()) || extractEventTitle(block.text());
    const text = cleanText(block.text());
    const dataPath = $(`[data-raid-type="${type}"]`).first().attr('data-current-raid') || null;

    return {
        title,
        text,
        status: /ONGOING/i.test(text) ? 'ONGOING' : '',
        isOngoing: /ONGOING/i.test(text),
        starts: cleanText(block.find('.time-row').filter((_, el) => /Starts:/i.test($(el).text())).find('.time-value').text()) || extractTimeValue(text, 'Starts'),
        ends: cleanText(block.find('.time-row').filter((_, el) => /Ends:/i.test($(el).text())).find('.time-value').text()) || extractTimeValue(text, 'Ends'),
        url: null,
        dataPath
    };
}

function pickBestOngoingCandidate(candidates) {
    const raidTitleCandidates = candidates.filter((c) => /in Raids/i.test(c.text) || /in Raids/i.test(c.title));
    return raidTitleCandidates[0] || candidates[0];
}

function buildEventFromCandidate(candidate) {
    return {
        title: candidate.title || extractEventTitle(candidate.text),
        status: 'ONGOING',
        url: candidate.url,
        starts: candidate.starts || null,
        ends: candidate.ends || null,
        type: 'regular'
    };
}

function extractEventTitle(text) {
    const cleaned = cleanText(text);
    const withoutStatus = cleaned.replace(/^(ONGOING|ENDED|UPCOMING)\s*/i, '');
    const match = withoutStatus.match(/(.+?in Raids)/i);
    if (match) return match[1].trim();
    return withoutStatus.slice(0, 140);
}

function extractTimeValue(text, label) {
    const match = cleanText(text).match(new RegExp(`${label}:\\s*([^:]+?)(?=\\s*(?:Starts:|Ends:|$))`, 'i'));
    return match ? cleanText(match[1]) : null;
}

function parseRaidEventPage(html, event, forcedRaidType = null) {
    const $ = cheerio.load(html);
    const raids = [];
    const containers = $('.raid-bosses, .shadow-raid-bosses').filter((_, el) => $(el).find('.card').length > 0);

    if (containers.length) {
        containers.each((_, containerEl) => {
            const container = $(containerEl);
            const raidType = container.attr('data-raid-type') || (container.hasClass('shadow-raid-bosses') ? 'shadow' : 'regular');
            parseRaidContainer($, container, raidType, event, raids);
        });
    } else {
        parseRaidContainer($, $('body'), forcedRaidType || 'regular', event, raids);
    }

    return dedupeRaids(raids);
}

function parseRaidContainer($, container, raidType, event, raids) {
    container.find('.tier').each((_, tierEl) => {
        const tierNode = $(tierEl);
        const baseTier = cleanText(tierNode.find('.tier-label').first().text()) || cleanText(tierNode.find('h2,h3').first().text());
        const tier = normalizeTier(baseTier, raidType);

        tierNode.find('.card').each((_, cardEl) => {
            const raid = parseRaidCard($, $(cardEl), tier, event);
            if (raid) raids.push(raid);
        });
    });
}

function parseRaidCard($, card, tier, event) {
    const name = normalizeRaidName(cleanText(card.find('.name').first().text()));
    if (!name) return null;

    const cpRange = cleanText(card.find('.cp-range').first().text());
    const boostedRange = cleanText(card.find('.boosted-cp').first().text() || card.find('.boosted-cp-row').first().text());
    const normalMax = parseMaxCp(cpRange);
    const boostedMax = parseMaxCp(boostedRange);

    if (normalMax == null && boostedMax == null) return null;

    const weather = [];
    card.find('.weather-pill').each((_, el) => {
        const label = cleanText($(el).find('.label').first().text()) || cleanText($(el).text()) || cleanText($(el).find('img').first().attr('alt'));
        if (label) weather.push(label);
    });

    return {
        name,
        tier,
        tierLabel: parseTierLabel(tier),
        combatPower: {
            normal: { max: normalMax },
            boosted: { max: boostedMax }
        },
        weather: [...new Set(weather)],
        canBeShiny: detectShiny($, card),
        source: {
            eventTitle: event.title,
            eventUrl: event.url
        }
    };
}

function parseMaxCp(text) {
    if (!text) return null;
    const cleaned = cleanText(text);
    const match = cleaned.match(/CP\s*[\d,]+\s*[-–]\s*([\d,]+)/i);
    if (!match) return null;
    return Number(match[1].replace(/,/g, ''));
}

function parseTierLabel(tier) {
    const t = String(tier || '').toLowerCase();
    const shadow = t.includes('shadow');

    if (t.includes('primal')) return 'P';
    if (t.includes('mega')) return 'M';
    if (t.includes('5')) return shadow ? 'S5★' : '5★';
    if (t.includes('4')) return shadow ? 'S4★' : '4★';
    if (t.includes('3')) return shadow ? 'S3★' : '3★';
    if (t.includes('1')) return shadow ? 'S1★' : '1★';

    return '';
}

function normalizeRaidName(name) {
    return cleanText(name);
}

function normalizeTier(tier, raidType) {
    const clean = cleanText(tier);
    if (raidType === 'shadow' && clean && !/^shadow\b/i.test(clean)) return `Shadow ${clean}`;
    return clean;
}

function detectShiny($, card) {
    if (card.find('.shiny-icon').length > 0) return true;

    const text = card.text();
    const html = card.html() || '';
    if (/shiny/i.test(text) || /shiny/i.test(html)) return true;

    return null;
}

function dedupeRaids(raids) {
    return dedupeBy(raids, (raid) => `${raid.tier}|${raid.name}|${raid.combatPower.normal.max}|${raid.combatPower.boosted.max}`);
}

function dedupeBy(items, keyFn) {
    const seen = new Set();
    const out = [];

    for (const item of items) {
        const key = keyFn(item);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }

    return out;
}

function tierPriority(tier) {
    const t = String(tier || '').toLowerCase();
    const shadow = t.includes('shadow');

    if (!shadow && t.includes('1')) return 1;
    if (!shadow && t.includes('3')) return 2;
    if (!shadow && t.includes('5')) return 3;
    if (t.includes('primal')) return 4;
    if (t.includes('mega')) return 5;
    if (shadow && t.includes('1')) return 6;
    if (shadow && t.includes('3')) return 7;
    if (shadow && t.includes('5')) return 8;

    return 99;
}

function writeRaidsJson(data) {
    if (!Array.isArray(data && data.raids) || data.raids.length === 0) {
        throw new Error('Refusing to write raids.json without raid data');
    }

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_MIN_FILE, JSON.stringify(data), 'utf8');
}

function stripInternalEventFields(event) {
    const { title, status, url, starts, ends } = event;
    return { title, status, url, starts, ends };
}

function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

module.exports = {
    get,
    fetchText,
    extractOngoingRaidEvent,
    extractOngoingRaidEventFromManifest,
    parseRaidEventPage,
    parseMaxCp,
    parseTierLabel,
    normalizeRaidName,
    writeRaidsJson
};
