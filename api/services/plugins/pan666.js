import axios from 'axios'
import { isValidCloudLink } from '../telegramService.js'

const BASE_URL = 'https://pan666.net/api/discussions'

/**
 * Extract all cloud storage links from an HTML string.
 */
function extractLinks(html) {
  const links = []
  // href attributes
  const hrefRegex = /href="(https?:\/\/[^"]+)"/g
  let m
  while ((m = hrefRegex.exec(html)) !== null) {
    if (isValidCloudLink(m[1])) links.push(m[1])
  }
  // bare URLs in text (after stripping tags)
  const text = html.replace(/<[^>]+>/g, ' ')
  const urlRegex = /https?:\/\/[^\s"'<>\]]+/g
  while ((m = urlRegex.exec(text)) !== null) {
    const url = m[0].replace(/[).,;！。，；]+$/, '')
    if (isValidCloudLink(url) && !links.includes(url)) links.push(url)
  }
  return links
}

/**
 * Search pan666.net for cloud storage links.
 * Returns array of { title, links, datetime, channel, originalText }
 */
export async function search(query) {
  try {
    const resp = await axios.get(BASE_URL, {
      params: {
        'filter[q]': query,
        'include': 'mostRelevantPost',
        'page[offset]': 0,
        'page[limit]': 50
      },
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://pan666.net/'
      }
    })

    const data = resp.data
    if (!data || !Array.isArray(data.data)) return []

    // Build a map from post ID → contentHtml
    const postMap = {}
    if (Array.isArray(data.included)) {
      for (const item of data.included) {
        if (item.type === 'post' && item.attributes?.contentHtml) {
          postMap[item.id] = item.attributes.contentHtml
        }
      }
    }

    const results = []
    for (const discussion of data.data) {
      const title = discussion.attributes?.title || ''
      const datetime = discussion.attributes?.createdAt || new Date().toISOString()
      const postRel = discussion.relationships?.mostRelevantPost?.data
      const contentHtml = postRel ? (postMap[postRel.id] || '') : ''
      const links = extractLinks(contentHtml)

      if (links.length > 0) {
        results.push({
          title,
          links,
          datetime,
          channel: 'pan666.net',
          originalText: contentHtml.replace(/<[^>]+>/g, ' ').trim()
        })
      }
    }

    return results
  } catch (error) {
    console.error('pan666.net 搜索失败:', error.message)
    return []
  }
}
