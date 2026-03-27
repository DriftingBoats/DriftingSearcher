import axios from 'axios'

const TIMEOUT = 5000
const BATCH_SIZE = 6
const BATCH_DELAY = 300

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

/**
 * 检测单条链接是否有效
 * 保守策略：只有明确 404/410 才判定为失效，其他情况（302到登录页、403、超时）均保留
 * @returns {Promise<boolean>} true = 有效或不确定，false = 明确失效
 */
export async function validateLink(url) {
  try {
    const response = await axios.head(url, {
      timeout: TIMEOUT,
      maxRedirects: 3,
      headers: REQUEST_HEADERS,
      validateStatus: () => true, // 不抛出任何状态码的异常
    })
    const status = response.status
    return status !== 404 && status !== 410
  } catch {
    // 超时、DNS 解析失败、网络错误 → 保留（避免误删）
    return true
  }
}

/**
 * 批量校验链接，每发现失效链接立即回调通知
 * @param {string[]} links - 待校验链接列表
 * @param {(link: string, valid: boolean) => void} onResult - 每条链接校验完成的回调
 */
export async function validateLinks(links, onResult) {
  for (let i = 0; i < links.length; i += BATCH_SIZE) {
    const batch = links.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (link) => {
        const valid = await validateLink(link)
        onResult(link, valid)
      })
    )
    // 批次间隔，避免对同一云盘服务集中发请求
    if (i + BATCH_SIZE < links.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
    }
  }
}
