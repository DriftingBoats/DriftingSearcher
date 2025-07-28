import { searchTelegramChannels } from '../services/telegramService.js'
import { getEnabledChannels } from '../services/channelService.js'

function getLinkType(link) {
  if (link.includes('115') || link.includes('115.com')) return '115网盘'
  if (link.includes('123') || link.includes('123pan')) return '123网盘'
  if (link.includes('189') || link.includes('cloud.189') || link.includes('caiyun.139.com')) return '天翼云盘'
  if (link.includes('aliyundrive') || link.includes('alipan')) return '阿里云盘'
  if (link.includes('baidu') || link.includes('pan.baidu') || link.includes('yun.baidu')) return '百度网盘'
  if (link.includes('lanzou') || link.includes('lanzoui') || link.includes('lanzoux')) return '蓝奏云'
  if (link.includes('pikpak')) return 'Pikpak网盘'
  if (link.includes('quark') || link.includes('pan.quark') || link.includes('drive.uc.cn')) return '夸克网盘'
  if (link.includes('uc')) return 'UC网盘'
  if (link.includes('weiyun.com')) return '微云'
  if (link.includes('xunlei') || link.includes('pan.xunlei')) return '迅雷网盘'
  return '其他'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { query } = req.body
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: '搜索关键词不能为空' })
    }

    console.log(`开始搜索: ${query}`)
    
    // 获取启用的频道
    const enabledChannels = await getEnabledChannels()
    
    if (enabledChannels.length === 0) {
      return res.json({
        query,
        results: [],
        totalResults: 0,
        channelsSearched: 0,
        message: '没有启用的搜索频道'
      })
    }
    
    // 搜索所有启用的频道
    const searchResults = await searchTelegramChannels(query.trim(), enabledChannels)
    
    // 去重和处理结果
    const uniqueResultsMap = new Map()
    
    for (const result of searchResults) {
      if (!result.links || result.links.length === 0) continue
      
      for (const link of result.links) {
        if (link.includes('t.me')) continue // 跳过 Telegram 链接
        
        const existing = uniqueResultsMap.get(link)
        const currentTime = new Date(result.datetime).getTime()
        
        if (!existing || currentTime > new Date(existing.datetime || '').getTime()) {
          uniqueResultsMap.set(link, {
            title: result.title,
            link,
            datetime: result.datetime,
            channel: result.channel,
            type: getLinkType(link)
          })
        }
      }
    }
    
    const finalResults = Array.from(uniqueResultsMap.values())
      .sort((a, b) => new Date(b.datetime || '').getTime() - new Date(a.datetime || '').getTime())
    
    console.log(`搜索完成，找到 ${finalResults.length} 个结果`)
    
    res.json({
      query,
      results: finalResults,
      totalResults: finalResults.length,
      channelsSearched: enabledChannels.length
    })
    
  } catch (error) {
    console.error('搜索错误:', error)
    res.status(500).json({
      error: '搜索失败',
      message: error.message
    })
  }
}