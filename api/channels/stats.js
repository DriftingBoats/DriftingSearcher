import { getChannelStats } from '../services/channelService.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
}