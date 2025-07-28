import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 频道配置文件路径
const CHANNEL_CONFIG_PATH = path.join(__dirname, '../../resource_channel_config.json')

// 获取频道配置
export async function getChannelConfig() {
  // 优先使用环境变量配置
  if (process.env.TELEGRAM_CHANNELS) {
    try {
      const channels = JSON.parse(process.env.TELEGRAM_CHANNELS)
      return Array.isArray(channels) ? channels : []
    } catch (error) {
      console.error('解析环境变量TELEGRAM_CHANNELS失败:', error)
    }
  }
  
  // 回退到文件配置
  try {
    const configData = await fs.readFile(CHANNEL_CONFIG_PATH, 'utf-8')
    const config = JSON.parse(configData)
    return config.channels || []
  } catch (error) {
    console.error('读取频道配置失败:', error)
    // 如果文件不存在且没有环境变量，返回默认配置
    return getDefaultChannels()
  }
}

// 默认频道配置（示例）
function getDefaultChannels() {
  return [
    {
      "id": "example_channel",
      "name": "示例频道",
      "enable": false
    }
  ]
}

// 获取启用的频道
export async function getEnabledChannels() {
  const channels = await getChannelConfig()
  return channels.filter(channel => channel.enable)
}

// 获取频道统计信息
export async function getChannelStats() {
  const channels = await getChannelConfig()
  const enabled = channels.filter(c => c.enable)
  
  return {
    total: channels.length,
    enabled: enabled.length,
    disabled: channels.length - enabled.length,
    enabledChannels: enabled.map(c => ({ id: c.id, name: c.name }))
  }
}

// 验证频道ID是否存在
export async function isValidChannelId(channelId) {
  const channels = await getChannelConfig()
  return channels.some(channel => channel.id === channelId)
}

// 获取频道信息
export async function getChannelInfo(channelId) {
  const channels = await getChannelConfig()
  return channels.find(channel => channel.id === channelId)
}

// 按类型分组频道
export async function getChannelsByType() {
  const channels = await getChannelConfig()
  const grouped = {
    '夸克网盘': [],
    '阿里云盘': [],
    '天翼云盘': [],
    '百度网盘': [],
    '115网盘': [],
    '迅雷网盘': [],
    '综合资源': [],
    '其他': []
  }
  
  channels.forEach(channel => {
    const name = channel.name.toLowerCase()
    
    if (name.includes('夸克')) {
      grouped['夸克网盘'].push(channel)
    } else if (name.includes('阿里') || name.includes('aliyun') || name.includes('alipan')) {
      grouped['阿里云盘'].push(channel)
    } else if (name.includes('天翼') || name.includes('189')) {
      grouped['天翼云盘'].push(channel)
    } else if (name.includes('百度')) {
      grouped['百度网盘'].push(channel)
    } else if (name.includes('115')) {
      grouped['115网盘'].push(channel)
    } else if (name.includes('迅雷')) {
      grouped['迅雷网盘'].push(channel)
    } else if (name.includes('综合') || name.includes('合集')) {
      grouped['综合资源'].push(channel)
    } else {
      grouped['其他'].push(channel)
    }
  })
  
  return grouped
}