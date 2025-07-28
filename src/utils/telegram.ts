import { TelegramSearchResult, ChannelConfig } from '../types'

// 由于浏览器环境限制，这里提供模拟的Telegram搜索功能
// 在实际部署中，需要通过后端API来实现Telegram搜索
export async function searchTelegramChannels(
  query: string, 
  channels: ChannelConfig[]
): Promise<TelegramSearchResult[]> {
  // 模拟搜索延迟
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
  
  // 模拟搜索结果
  const mockResults: TelegramSearchResult[] = [
    {
      title: `${query} 4K蓝光原盘`,
      datetime: new Date().toISOString(),
      links: [
        'https://pan.quark.cn/s/example1',
        'https://cloud.189.cn/t/example2'
      ]
    },
    {
      title: `${query} 高清资源合集`,
      datetime: new Date(Date.now() - 3600000).toISOString(),
      links: [
        'https://www.aliyundrive.com/s/example3',
        'https://pan.baidu.com/s/example4'
      ]
    },
    {
      title: `${query} 完整版`,
      datetime: new Date(Date.now() - 7200000).toISOString(),
      links: [
        'https://115.com/s/example5',
        'https://pan.xunlei.com/s/example6'
      ]
    }
  ]
  
  // 根据启用的频道数量调整结果数量
  const resultCount = Math.min(mockResults.length, channels.length)
  return mockResults.slice(0, resultCount)
}

// 检测链接类型
export function getLinkType(link: string): string {
  if (link.includes('115')) return '115网盘'
  if (link.includes('123')) return '123云盘'
  if (link.includes('189') || link.includes('cloud.189')) return '天翼云盘'
  if (link.includes('aliyundrive') || link.includes('alipan')) return '阿里云盘'
  if (link.includes('baidu') || link.includes('pan.baidu')) return '百度网盘'
  if (link.includes('pikpak')) return 'Pikpak网盘'
  if (link.includes('quark')) return '夸克网盘'
  if (link.includes('uc')) return 'UC网盘'
  if (link.includes('xunlei') || link.includes('pan.xunlei')) return '迅雷网盘'
  return '其他'
}

// 复制到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

// 打开链接
export function openLink(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}