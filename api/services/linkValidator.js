import axios from 'axios'

/**
 * Extract Quark share pwd_id from URL.
 * e.g. https://pan.quark.cn/s/e8549e28fbc7#/list/share → e8549e28fbc7
 */
function extractQuarkPwdId(url) {
  const match = url.match(/pan\.quark\.cn\/s\/([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

/**
 * Validate a single Quark share link via their public API.
 * Returns true if valid, false if definitively expired/deleted (code 41006).
 */
async function validateQuarkLink(url) {
  const cookie = process.env.QUARK_COOKIE || ''
  // Without a valid session cookie, the token API returns 41006 for ALL shares
  // (including valid ones), making it impossible to distinguish deleted from existing.
  // Skip validation entirely when no cookie is configured.
  if (!cookie) return true

  const pwdId = extractQuarkPwdId(url)
  if (!pwdId) return true // can't parse → keep

  try {
    const resp = await axios.post(
      `https://drive-pc.quark.cn/1/clouddrive/share/sharepage/token?pr=ucpro&fr=pc&uc_param_str=&pwd_id=${pwdId}&passcode=`,
      {},
      {
        timeout: 6000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/json',
          'Referer': 'https://pan.quark.cn/',
          'Cookie': cookie
        },
        validateStatus: () => true
      }
    )
    // code 41006 = "分享不存在" (share deleted/expired)
    if (resp.data?.code === 41006) return false
    return true
  } catch {
    return true // network error → keep (avoid false positives)
  }
}

const BATCH_SIZE = 8
const BATCH_DELAY = 200 // ms between batches

/**
 * Validate all Quark links in the provided array.
 * Non-Quark links are skipped (treated as valid).
 * onResult(link, isValid) is called for each Quark link after checking.
 * Returns the count of Quark links that were actually checked.
 */
export async function validateLinks(links, onResult) {
  const quarkLinks = links.filter(l => l.includes('pan.quark.cn'))
  if (quarkLinks.length === 0) return 0

  for (let i = 0; i < quarkLinks.length; i += BATCH_SIZE) {
    const batch = quarkLinks.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(async link => {
      const valid = await validateQuarkLink(link)
      onResult(link, valid)
    }))
    if (i + BATCH_SIZE < quarkLinks.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY))
    }
  }

  return quarkLinks.length
}
