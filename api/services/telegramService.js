import fetch from 'node-fetch'

// Telegram搜索服务 - 使用原始的搜索方法
export async function searchTelegramChannels(query, channels) {
  console.log(`开始搜索: "${query}"`)
  console.log(`查询字符编码检查: ${Buffer.from(query, 'utf8').toString('hex')}`)
  console.log(`使用 ${channels.length} 个频道进行搜索`)
  
  const results = []
  
  // 优化性能：减少并发数量，增加延迟，避免被限制
  const batchSize = 6 // 进一步减少并发数提高稳定性
  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize)
    console.log(`处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(channels.length/batchSize)}: ${batch.map(c => c.name).join(', ')}`)
    
    const searchPromises = batch.map(channel => 
      searchSingleChannel(query, channel.id, channel.name)
    )
    
    try {
      const batchResults = await Promise.allSettled(searchPromises)
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(...result.value)
          console.log(`频道 ${batch[index].name} 成功返回 ${result.value.length} 条结果`)
        } else {
          console.warn(`频道 ${batch[index].name} 搜索失败:`, result.reason?.message)
        }
      })
      
      // 减少批次间延迟，提高搜索速度
      if (i + batchSize < channels.length) {
        console.log('等待0.5秒后继续下一批次...')
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
    } catch (error) {
      console.error(`批次搜索失败:`, error)
    }
  }
  
  // 去重处理
  const uniqueResults = removeDuplicates(results)
  console.log(`搜索完成，总共找到 ${results.length} 条结果，去重后 ${uniqueResults.length} 条`)
  return uniqueResults
}

// 搜索单个频道（带重试机制）
async function searchSingleChannel(query, channelId, channelName, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 确保查询字符串正确编码
      const encodedQuery = encodeURIComponent(query.trim())
      const searchUrl = `https://t.me/s/${channelId}?q=${encodedQuery}`
      
      if (attempt > 1) {
        console.log(`重试搜索频道: ${channelName} (第${attempt}次尝试)`)
        // 重试前等待，减少等待时间
        await new Promise(resolve => setTimeout(resolve, 500 * attempt))
      } else {
        console.log(`搜索频道: ${channelName} (${channelId})...`)
      }
      
      // 使用fetch获取页面内容，优化超时时间
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 进一步减少到8秒超时
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const html = await response.text()
      
      // 检查是否获取到有效内容
      if (!html || html.length < 100) {
        console.warn(`频道 ${channelName} 返回内容过短，可能被限制访问`)
        if (attempt < maxRetries) continue
        return []
      }
      
      // 调试：输出HTML片段来检查内容
      if (attempt === 1 && channelId === 'hdhhd21' && html.length > 1000) {
        console.log(`\n=== 调试频道 ${channelName} ===`)
        console.log(`HTML总长度: ${html.length}`)
        console.log(`HTML片段:`, html.substring(0, 800))
        console.log(`=== 调试结束 ===\n`)
      }
      
      // 解析HTML内容
      const results = parseSearchResults(html, channelId, channelName)
      
      console.log(`频道 ${channelName} 找到 ${results.length} 条结果`)
      return results
      
    } catch (error) {
      const isLastAttempt = attempt === maxRetries
      
      if (error.name === 'AbortError') {
        console.error(`搜索频道 ${channelName} 超时${isLastAttempt ? '' : '，准备重试'}`)
      } else {
        console.error(`搜索频道 ${channelName} 失败${isLastAttempt ? '' : '，准备重试'}: ${error.message}`)
      }
      
      if (isLastAttempt) {
        return []
      }
    }
  }
  
  return []
}

// 解析搜索结果HTML
function parseSearchResults(html, channelId, channelName) {
  const results = []
  
  try {
    // 使用正则表达式解析HTML（简化版本）
    const messageRegex = /<div class="tgme_widget_message_wrap[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g
    const textRegex = /<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/
    const timeRegex = /<time[^>]*datetime="([^"]*)"/
    const linkRegex = /<a[^>]*href="([^"]*)"/g
    
    let messageMatch
    while ((messageMatch = messageRegex.exec(html)) !== null) {
      const messageHtml = messageMatch[1]
      
      // 提取文本内容
      const textMatch = textRegex.exec(messageHtml)
      if (!textMatch) continue
      
      const textHtml = textMatch[1]
      const textContent = textHtml.replace(/<[^>]*>/g, '').trim()
      
      // 提取标题（第一行）
      const lines = textContent.split('\n').filter(line => line.trim())
      const title = lines[0]?.trim() || ''
      
      if (!title) continue
      
      // 提取时间
      const timeMatch = timeRegex.exec(messageHtml)
      const datetime = timeMatch ? timeMatch[1] : new Date().toISOString()
      
      // 提取链接
      const links = []
      let linkMatch
      while ((linkMatch = linkRegex.exec(textHtml)) !== null) {
        const link = linkMatch[1]
        if (isValidCloudLink(link)) {
          links.push(link)
        }
      }
      
      if (links.length > 0) {
        results.push({
          title,
          datetime,
          links,
          channel: channelName
        })
      }
    }
    
  } catch (error) {
    console.error('解析HTML失败:', error)
  }
  
  return results
}

// 去重处理函数
function removeDuplicates(results) {
  const seen = new Set()
  return results.filter(result => {
    // 基于标题和第一个链接进行去重
    const key = `${result.title.toLowerCase().trim()}_${result.links[0] || ''}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

// 验证链接是否有效
export function isValidCloudLink(url) {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  // 检查是否为有效的网盘链接
  const validDomains = [
    'pan.baidu.com',
    'aliyundrive.com',
    'alipan.com',
    'cloud.189.cn',
    'quark.cn',
    '115.com',
    'xunlei.com',
    'pan.xunlei.com',
    'uc.cn',
    'pikpak.com',
    '123pan.com'
  ]
  
  return validDomains.some(domain => url.includes(domain))
}