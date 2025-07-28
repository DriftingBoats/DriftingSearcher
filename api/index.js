import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { searchTelegramChannels } from './services/telegramService.js'
import { getEnabledChannels, getChannelStats } from './services/channelService.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())

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

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 流式搜索资源
app.post('/api/search/stream', async (req, res) => {
  try {
    const { query } = req.body
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: '搜索关键词不能为空' })
    }

    console.log(`开始流式搜索: ${query}`)
    
    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    })
    
    // 获取启用的频道
    const enabledChannels = await getEnabledChannels()
    
    if (enabledChannels.length === 0) {
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        query,
        totalResults: 0,
        channelsSearched: 0,
        message: '没有启用的搜索频道'
      })}\n\n`)
      res.end()
      return
    }
    
    // 发送开始搜索事件
    res.write(`data: ${JSON.stringify({
      type: 'start',
      query,
      totalChannels: enabledChannels.length
    })}\n\n`)
    
    const uniqueResultsMap = new Map()
    let totalResults = 0
    
    // 并发搜索所有频道，实现先搜索到的结果先显示
    let completedChannels = 0
    
    // 创建所有频道的搜索Promise
    const searchPromises = enabledChannels.map(async (channel) => {
      try {
        // 发送开始搜索该频道的信息
        res.write(`data: ${JSON.stringify({
          type: 'channel_start',
          channel: channel.name
        })}\n\n`)
        
        // 搜索单个频道
        const channelResults = await searchTelegramChannels(query.trim(), [channel])
        
        // 处理该频道的结果
        for (const result of channelResults) {
          if (!result.links || result.links.length === 0) continue
          
          for (const link of result.links) {
            if (link.includes('t.me')) continue // 跳过 Telegram 链接
            
            const existing = uniqueResultsMap.get(link)
            const currentTime = new Date(result.datetime).getTime()
            
            if (!existing || currentTime > new Date(existing.datetime || '').getTime()) {
              const newResult = {
                title: result.title,
                link,
                datetime: result.datetime,
                channel: result.channel,
                type: getLinkType(link)
              }
              
              uniqueResultsMap.set(link, newResult)
              
              // 实时发送新结果
              res.write(`data: ${JSON.stringify({
                type: 'result',
                result: newResult,
                totalResults: uniqueResultsMap.size
              })}\n\n`)
              
              totalResults = uniqueResultsMap.size
            }
          }
        }
        
        // 频道搜索完成
        completedChannels++
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          currentChannel: channel.name,
          progress: completedChannels,
          total: enabledChannels.length,
          completed: true
        })}\n\n`)
        
      } catch (error) {
        console.error(`搜索频道 ${channel.name} 失败:`, error)
        completedChannels++
        
        // 发送错误信息
        res.write(`data: ${JSON.stringify({
          type: 'error',
          channel: channel.name,
          error: error.message
        })}\n\n`)
        
        // 发送进度更新
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          currentChannel: channel.name,
          progress: completedChannels,
          total: enabledChannels.length,
          completed: true
        })}\n\n`)
      }
    })
    
    // 等待所有搜索完成
    await Promise.allSettled(searchPromises)
    
    // 发送搜索完成事件
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      query,
      totalResults,
      channelsSearched: enabledChannels.length
    })}\n\n`)
    
    res.end()
    
  } catch (error) {
    console.error('流式搜索错误:', error)
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: '搜索失败',
      message: error.message
    })}\n\n`)
    res.end()
  }
})

// 搜索资源（保留原有接口）
app.post('/api/search', async (req, res) => {
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
})

// 获取频道统计信息
app.get('/api/channels/stats', async (req, res) => {
  try {
    const stats = await getChannelStats()
    res.json(stats)
  } catch (error) {
    console.error('获取频道统计失败:', error)
    res.status(500).json({
      error: '获取频道统计失败',
      message: error.message
    })
  }
})

// 本地开发服务器
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 DriftingSearcher API服务器启动成功`)
    console.log(`📡 服务地址: http://localhost:${PORT}`)
    console.log(`🔍 搜索接口: http://localhost:${PORT}/api/search`)
    console.log(`🌊 流式搜索接口: http://localhost:${PORT}/api/search/stream`)
    console.log(`📊 健康检查: http://localhost:${PORT}/health`)
  })
}

export default app