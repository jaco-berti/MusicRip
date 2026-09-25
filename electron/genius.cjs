const cheerio = require('cheerio')

const SERPAPI_URL = 'https://serpapi.com/search'
const SERPAPI_KEY = ""
const REQUEST_TIMEOUT = 15000

function requestOptions(signal) {
  return {
    signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT)]),
    headers: {
      Accept: 'application/json, text/html',
      'User-Agent': 'MusicRip/1.0',
    },
  }
}

function extractLyricsText(value) {
  const text = value.replace(/\r/g, '').trim()
  const firstVerse = /\[\s*verse\b[^\]]*\]/i.exec(text)
  if (!firstVerse) return ''

  return text
    .slice(firstVerse.index + firstVerse[0].length)
    .replace(/\s*\[[^\]]*\]\s*/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getSearchResults(payload) {
  return (payload.organic_results || [])
    .filter(result => result.link && /^https?:\/\/(www\.)?genius\.com\//i.test(result.link))
    .slice(0, 5)
    .map(result => ({
      id: result.position,
      title: result.title || 'Titolo sconosciuto',
      artist: result.displayed_link || 'Genius',
      url: result.link,
    }))
}

async function searchLyrics(query, signal = new AbortController().signal) {
  if (typeof query !== 'string' || !query.trim() || query.length > 500) {
    throw new Error('Inserisci un titolo valido per cercare il testo.')
  }
  if (!SERPAPI_KEY) throw new Error('Chiave SerpApi non configurata. Imposta SERPAPI_KEY.')

  const params = new URLSearchParams({
    engine: 'google',
    api_key: SERPAPI_KEY,
    q: `genius ${query.trim()} lyrics`,
    num: '10',
  })
  const response = await fetch(`${SERPAPI_URL}?${params}`, requestOptions(signal))
  const payload = await response.json()
  if (!response.ok || payload.error) {
    throw new Error(payload.error || 'SerpApi non è disponibile in questo momento.')
  }

  const results = getSearchResults(payload)
  if (!results.length) throw new Error('Nessun risultato Genius trovato.')
  return results
}

async function fetchLyrics(url, signal = new AbortController().signal) {
  let parsedUrl
  try { parsedUrl = new URL(url) } catch { throw new Error('Pagina Genius non valida.') }
  if (parsedUrl.hostname !== 'genius.com' && parsedUrl.hostname !== 'www.genius.com') {
    throw new Error('La pagina selezionata non appartiene a Genius.')
  }

  const response = await fetch(parsedUrl, {
    ...requestOptions(signal),
    headers: { Accept: 'text/html', 'User-Agent': 'MusicRip/1.0' },
  })
  if (!response.ok) throw new Error('Impossibile leggere la pagina del testo su Genius.')

  const html = await response.text()
  const $ = cheerio.load(html)
  const containers = $('div[class^="Lyrics__Container"]')
  const lyricsSource = containers.toArray().map(container => {
    const content = $(container)
    content.find('br').replaceWith('\n')
    return content.text()
  }).join('\n\n')
  const lyrics = extractLyricsText(lyricsSource)

  if (!lyrics) throw new Error('Il testo della canzone non è disponibile in questa pagina Genius.')
  return lyrics
}

module.exports = { searchLyrics, fetchLyrics }
