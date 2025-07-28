import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

// 验证单个Telegram频道是否存在
async function verifyChannel(channelId, channelName) {
  try {
    console.log(`正在验证频道: ${channelName} (${channelId})...`)
    
    // 构建Telegram频道的公开URL
    const channelUrl = `https://t.me/s/${channelId}`
    
    // 设置请求超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时
    
    const response = await fetch(channelUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Connection': 'keep-alive'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      const html = await response.text()
      
      // 检查页面内容是否包含频道信息
      if (html.includes('tgme_page_title') || html.includes('tgme_channel_info')) {
        console.log(`✅ 频道 ${channelName} 存在且可访问`)
        return { 
          id: channelId, 
          name: channelName, 
          status: 'valid', 
          message: '频道存在且可访问' 
        }
      } else if (html.includes('tgme_page_description')) {
        console.log(`⚠️  频道 ${channelName} 可能存在但内容受限`)
        return { 
          id: channelId, 
          name: channelName, 
          status: 'restricted', 
          message: '频道可能存在但内容受限' 
        }
      } else {
        console.log(`❌ 频道 ${channelName} 页面异常`)
        return { 
          id: channelId, 
          name: channelName, 
          status: 'invalid', 
          message: '频道页面异常或不存在' 
        }
      }
    } else if (response.status === 404) {
      console.log(`❌ 频道 ${channelName} 不存在 (404)`)
      return { 
        id: channelId, 
        name: channelName, 
        status: 'not_found', 
        message: '频道不存在' 
      }
    } else {
      console.log(`⚠️  频道 ${channelName} 访问失败 (${response.status})`)
      return { 
        id: channelId, 
        name: channelName, 
        status: 'error', 
        message: `HTTP ${response.status}: ${response.statusText}` 
      }
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`⏰ 频道 ${channelName} 验证超时`)
      return { 
        id: channelId, 
        name: channelName, 
        status: 'timeout', 
        message: '验证超时' 
      }
    } else {
      console.log(`❌ 频道 ${channelName} 验证失败: ${error.message}`)
      return { 
        id: channelId, 
        name: channelName, 
        status: 'error', 
        message: error.message 
      }
    }
  }
}

// 验证最近添加的频道
async function verifyRecentlyAddedChannels() {
  try {
    // 读取频道配置文件
    const configPath = path.join(process.cwd(), 'resource_channel_config.json')
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    
    // 最近添加的频道ID列表
    const recentlyAddedChannelIds = [
      'guaguale115',
      'yunpanshare', 
      'tgsearchers',
      'yunpanall',
      'yunpanpan',
      'xxziliao',
      'sndkdkdl',
      'hsndn1',
      'xuexixiaonengshou1'
    ]
    
    // 找到最近添加的频道
    const recentChannels = configData.channels.filter(channel => 
      recentlyAddedChannelIds.includes(channel.id)
    )
    
    console.log(`\n开始验证 ${recentChannels.length} 个最近添加的频道...\n`)
    
    const results = []
    
    // 分批验证，避免过多并发请求
    const batchSize = 3
    for (let i = 0; i < recentChannels.length; i += batchSize) {
      const batch = recentChannels.slice(i, i + batchSize)
      console.log(`验证批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(recentChannels.length/batchSize)}...`)
      
      const batchPromises = batch.map(channel => 
        verifyChannel(channel.id, channel.name)
      )
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            id: batch[index].id,
            name: batch[index].name,
            status: 'error',
            message: result.reason?.message || '未知错误'
          })
        }
      })
      
      // 批次间等待，避免请求过于频繁
      if (i + batchSize < recentChannels.length) {
        console.log('等待2秒后继续下一批次...\n')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // 输出验证结果统计
    console.log('\n=== 验证结果统计 ===')
    const validChannels = results.filter(r => r.status === 'valid')
    const restrictedChannels = results.filter(r => r.status === 'restricted')
    const invalidChannels = results.filter(r => r.status === 'invalid' || r.status === 'not_found')
    const errorChannels = results.filter(r => r.status === 'error' || r.status === 'timeout')
    
    console.log(`✅ 有效频道: ${validChannels.length}个`)
    console.log(`⚠️  受限频道: ${restrictedChannels.length}个`)
    console.log(`❌ 无效频道: ${invalidChannels.length}个`)
    console.log(`🔴 错误频道: ${errorChannels.length}个`)
    
    // 输出详细结果
    console.log('\n=== 详细验证结果 ===')
    results.forEach(result => {
      const statusIcon = {
        'valid': '✅',
        'restricted': '⚠️ ',
        'invalid': '❌',
        'not_found': '❌',
        'error': '🔴',
        'timeout': '⏰'
      }[result.status] || '❓'
      
      console.log(`${statusIcon} ${result.name} (${result.id}): ${result.message}`)
    })
    
    // 如果有无效频道，提供建议
    if (invalidChannels.length > 0) {
      console.log('\n=== 建议 ===')
      console.log('以下频道可能需要从配置中移除或检查频道ID是否正确:')
      invalidChannels.forEach(channel => {
        console.log(`- ${channel.name} (${channel.id})`)
      })
    }
    
    return results
    
  } catch (error) {
    console.error('验证过程失败:', error)
    return []
  }
}

// 主函数
async function main() {
  console.log('Telegram频道验证工具')
  console.log('===================\n')
  
  const results = await verifyRecentlyAddedChannels()
  
  console.log('\n验证完成！')
  
  // 返回结果供其他模块使用
  return results
}

// 如果直接运行此脚本
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch(console.error)
}

export { verifyChannel, verifyRecentlyAddedChannels }