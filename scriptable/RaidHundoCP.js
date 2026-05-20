const CONFIG = {
  DATA_URL: 'https://raw.githubusercontent.com/Kretkas/ScrapedDuck/data/raids.json',
  MAX_SMALL: 3,
  MAX_MEDIUM: 6,
  MAX_LARGE: 12,
  SHOW_TIER: true,
  SHOW_UPDATED_AT: true,
  REFRESH_HOURS: 1,
  PREVIEW_SIZE: 'medium',
  TITLE: 'Raid Hundo CP'
}

const fm = FileManager.local()
const cacheDir = fm.joinPath(fm.documentsDirectory(), 'RaidHundoCP')
const cacheFile = fm.joinPath(cacheDir, 'raids-cache.json')
const metaFile = fm.joinPath(cacheDir, 'raids-cache-meta.json')

if (!fm.fileExists(cacheDir)) {
  fm.createDirectory(cacheDir)
}

async function main() {
  const result = await loadData()
  const raids = normalizeRaids(result.data)

  const widget = await createWidget({
    raids,
    status: result.status,
    updatedAt: result.updatedAt,
    error: result.error
  })

  widget.refreshAfterDate = new Date(Date.now() + CONFIG.REFRESH_HOURS * 60 * 60 * 1000)

  if (config.runsInWidget) {
    Script.setWidget(widget)
  } else {
    if (CONFIG.PREVIEW_SIZE === 'small') await widget.presentSmall()
    else if (CONFIG.PREVIEW_SIZE === 'large') await widget.presentLarge()
    else await widget.presentMedium()
  }

  Script.complete()
}

async function loadData() {
  try {
    const req = new Request(CONFIG.DATA_URL)
    req.timeoutInterval = 10
    const json = await req.loadJSON()
    if (!json) throw new Error('Empty JSON')
    writeCache(json)
    return { data: json, status: 'network', updatedAt: new Date(), error: null }
  } catch (error) {
    console.log('Network error:')
    console.log(error)

    const cached = readCache()
    if (cached) return { data: cached.data, status: 'cache', updatedAt: cached.updatedAt, error }
    return { data: null, status: 'error', updatedAt: null, error }
  }
}

function writeCache(data) {
  fm.writeString(cacheFile, JSON.stringify(data))
  fm.writeString(metaFile, JSON.stringify({ updatedAt: new Date().toISOString(), source: 'network' }))
}

function readCache() {
  try {
    if (!fm.fileExists(cacheFile)) return null
    const data = JSON.parse(fm.readString(cacheFile))
    let updatedAt = null
    if (fm.fileExists(metaFile)) {
      const meta = JSON.parse(fm.readString(metaFile))
      if (meta.updatedAt) updatedAt = new Date(meta.updatedAt)
    }
    return { data, updatedAt }
  } catch (error) {
    console.log('Cache error:')
    console.log(error)
    return null
  }
}

function normalizeRaids(data) {
  const list = Array.isArray(data) ? data : Array.isArray(data?.raids) ? data.raids : []
  return list
    .map((item) => ({
      name: item.name || 'Unknown',
      tier: item.tier || '',
      tierLabel: item.tierLabel || tierLabel(item.tier),
      normalHundo: item.combatPower?.normal?.max ?? null,
      boostedHundo: item.combatPower?.boosted?.max ?? null
    }))
    .filter((r) => r.name && r.name !== 'Unknown' && (r.normalHundo != null || r.boostedHundo != null))
}

async function createWidget({ raids, status, updatedAt }) {
  const widget = new ListWidget()
  widget.backgroundColor = new Color('#111111')
  widget.setPadding(12, 12, 12, 12)

  const title = widget.addText(config.widgetFamily === 'small' ? 'Hundo CP' : CONFIG.TITLE)
  title.textColor = Color.white()
  title.font = Font.boldSystemFont(13)

  if (CONFIG.SHOW_UPDATED_AT && config.widgetFamily !== 'small') {
    const subtitle = widget.addText(buildStatusText(status, updatedAt))
    subtitle.textColor = new Color('#999999')
    subtitle.font = Font.systemFont(9)
    widget.addSpacer(6)
  } else {
    widget.addSpacer(6)
  }

  if (!raids.length) {
    const noData = widget.addText('No data')
    noData.textColor = Color.white()
    noData.font = Font.systemFont(12)
    const hint = widget.addText('Check DATA_URL')
    hint.textColor = new Color('#999999')
    hint.font = Font.systemFont(9)
    return widget
  }

  for (const raid of raids.slice(0, getMaxRows())) addRaidRow(widget, raid)
  return widget
}

function addRaidRow(widget, raid) {
  const row = widget.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  if (CONFIG.SHOW_TIER && config.widgetFamily !== 'small') {
    const tier = row.addText((raid.tierLabel || '').padEnd(3, ' '))
    tier.textColor = new Color('#777777')
    tier.font = Font.systemFont(10)
  }

  const maxNameLength = config.widgetFamily === 'small' ? 11 : config.widgetFamily === 'large' ? 22 : 18
  const name = row.addText(shortenName(raid.name, maxNameLength))
  name.textColor = Color.white()
  name.font = Font.systemFont(11)

  row.addSpacer()

  const compact = config.widgetFamily === 'small'
  const cpText = `${fmtCp(raid.normalHundo)}${compact ? '/' : ' / '}${fmtCp(raid.boostedHundo)}`
  const cp = row.addText(cpText)
  cp.textColor = Color.white()
  cp.font = Font.mediumMonospacedSystemFont(11)

  widget.addSpacer(3)
}

function getMaxRows() {
  if (config.widgetFamily === 'small') return CONFIG.MAX_SMALL
  if (config.widgetFamily === 'large') return CONFIG.MAX_LARGE
  return CONFIG.MAX_MEDIUM
}

function fmtCp(value) {
  return value == null ? '—' : String(value)
}

function shortenName(name, maxLength) {
  const s = String(name || 'Unknown')
  return s.length <= maxLength ? s : s.slice(0, maxLength - 1) + '…'
}

function buildStatusText(status, updatedAt) {
  const time = updatedAt ? formatTime(updatedAt) : ''
  if (status === 'network') return time ? `Updated ${time}` : 'Updated'
  if (status === 'cache') return time ? `Offline · cached ${time}` : 'Offline · cached'
  if (status === 'error') return 'No data'
  return ''
}

function formatTime(date) {
  try {
    const df = new DateFormatter()
    df.dateFormat = 'HH:mm'
    return df.string(date)
  } catch (_) {
    return ''
  }
}

function tierLabel(tier) {
  const t = String(tier || '').toLowerCase()
  const shadow = t.includes('shadow')
  if (t.includes('primal')) return 'P'
  if (t.includes('mega')) return 'M'
  if (t.includes('5')) return shadow ? 'S5★' : '5★'
  if (t.includes('4')) return shadow ? 'S4★' : '4★'
  if (t.includes('3')) return shadow ? 'S3★' : '3★'
  if (t.includes('1')) return shadow ? 'S1★' : '1★'
  return ''
}

await main()
