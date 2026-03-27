import axios from 'axios'
import { isValidCloudLink } from '../telegramService.js'

const BUILD_ID_TTL = 30 * 60 * 1000 // 30 minutes
let buildIdCache = { id: null, ts: 0 }

/**
 * Fetch the current Next.js buildId from pansearch.me homepage.
 */
async function getBuildId() {
  if (buildIdCache.id && Date.now() - buildIdCache.ts < BUILD_ID_TTL) {
    return buildIdCache.id
  }
  const resp = await axios.get('https://www.pansearch.me/', {
    timeout: 8000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html'
    }
  })
  const match = resp.data.match(/\/_next\/data\/([^/]+)\//)
  if (!match) throw new Error('无法提取 pansearch.me buildId')
  buildIdCache = { id: match[1], ts: Date.now() }
  return match[1]
}

/**
 * Extract cloud storage links from HTML/text.
 */
function extractLinks(html) {
  const links = []
  const hrefRegex = /href="(https?:\/\/[^"]+)"/g
  let m
  while ((m = hrefRegex.exec(html)) !== null) {
    if (isValidCloudLink(m[1])) links.push(m[1])
  }
  const text = html.replace(/<[^>]+>/g, ' ')
  const urlRegex = /https?:\/\/[^\s"'<>\]]+/g
  while ((m = urlRegex.exec(text)) !== null) {
    const url = m[0].replace(/[).,;！。，；]+$/, '')
    if (isValidCloudLink(url) && !links.includes(url)) links.push(url)
  }
  return links
}

/**
 * Search pansearch.me for cloud storage links.
 * Returns array of { title, links, datetime, channel, originalText }
 */
export async function search(query) {
  try {
    let buildId
    try {
      buildId = await getBuildId()
    } catch (e) {
      console.error('pansearch.me: 获取 buildId 失败:', e.message)
      return []
    }

    const url = `https://www.pansearch.me/_next/data/${buildId}/search.json`
    let resp
    try {
      resp = await axios.get(url, {
        params: { keyword: query, offset: 0 },
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.pansearch.me/'
        }
      })
    } catch (e) {
      // buildId might be stale — invalidate and retry once
      if (e.response?.status === 404) {
        buildIdCache = { id: null, ts: 0 }
        try {
          buildId = await getBuildId()
          resp = await axios.get(`https://www.pansearch.me/_next/data/${buildId}/search.json`, {
            params: { keyword: query, offset: 0 },
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Referer': 'https://www.pansearch.me/'
            }
          })
        } catch (retryErr) {
          console.error('pansearch.me 重试失败:', retryErr.message)
          return []
        }
      } else {
        throw e
      }
    }

    const items = resp.data?.pageProps?.data?.data
    if (!Array.isArray(items)) return []

    const results = []
    for (const item of items) {
      const content = item.content || ''
      const links = extractLinks(content)
      if (links.length > 0) {
        results.push({
          title: content.replace(/<[^>]+>/g, ' ').trim().split('\n')[0].slice(0, 120) || query,
          links,
          datetime: item.time || new Date().toISOString(),
          channel: 'pansearch.me',
          originalText: content.replace(/<[^>]+>/g, ' ').trim()
        })
      }
    }

    return results
  } catch (error) {
    console.error('pansearch.me 搜索失败:', error.message)
    return []
  }
}
