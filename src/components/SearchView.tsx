import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { SearchResultItem, GroupedResults } from '../types'
import { getLinkType, copyToClipboard, openLink } from '../utils/telegram'
import { truncateText } from '../utils/format'

function SearchView() {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<GroupedResults>({})
  const [copiedUrl, setCopiedUrl] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0, channel: '' })
  const [totalResults, setTotalResults] = useState(0)
  const [activeChannels, setActiveChannels] = useState<string[]>([])
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({})
  const [modalText, setModalText] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  // 网盘类型排序顺序
  const cloudTypeOrder = [
    '夸克网盘', '百度网盘', '阿里云盘', '115网盘', '蓝奏云',
    '123网盘', '天翼云盘', 'UC网盘', '迅雷网盘', 'Pikpak网盘', '微云', '其他'
  ]

  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const openTextModal = (text: string) => {
    setModalText(text)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setModalText('')
  }

  const getSortedResults = () => {
    const sortedEntries = Object.entries(searchResults).sort(([typeA], [typeB]) => {
      const indexA = cloudTypeOrder.indexOf(typeA)
      const indexB = cloudTypeOrder.indexOf(typeB)
      return (indexA === -1 ? cloudTypeOrder.length : indexA) - (indexB === -1 ? cloudTypeOrder.length : indexB)
    })
    return sortedEntries
  }

  useEffect(() => {
    const newExpandedGroups: {[key: string]: boolean} = {}
    Object.keys(searchResults).forEach(type => {
      if (expandedGroups[type] === undefined) {
        newExpandedGroups[type] = true
      }
    })
    if (Object.keys(newExpandedGroups).length > 0) {
      setExpandedGroups(prev => ({ ...prev, ...newExpandedGroups }))
    }
  }, [searchResults])

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('请输入搜索内容')
      return
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setIsSearching(true)
    setSearchResults({})
    setHasSearched(false)
    setSearchProgress({ current: 0, total: 0, channel: '' })
    setTotalResults(0)
    setActiveChannels([])

    try {
      const apiUrl = process.env.NODE_ENV === 'production' ? '/api/search/stream' : 'http://localhost:3001/api/search/stream'
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法获取响应流')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              handleStreamEvent(data)
            } catch (e) {
              console.error('解析SSE数据失败:', e)
            }
          }
        }
      }

    } catch (error: any) {
      console.error('流式搜索出错:', error)
      if (error.message.includes('Failed to fetch')) {
        alert('无法连接到搜索服务，请确保后端服务已启动')
      } else {
        alert('搜索失败，请稍后重试')
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleStreamEvent = (data: any) => {
    switch (data.type) {
      case 'start':
        setSearchProgress({ current: 0, total: data.totalChannels, channel: '' })
        break

      case 'channel_start':
        setActiveChannels(prev => [...prev, data.channel])
        setSearchProgress(prev => ({
          ...prev,
          channel: `并发搜索中...`
        }))
        break

      case 'progress':
        if (data.completed) {
          setActiveChannels(prev => prev.filter(ch => ch !== data.currentChannel))
          setSearchProgress({
            current: data.progress,
            total: data.total,
            channel: data.progress === data.total ? '搜索完成' : '并发搜索中...'
          })
        } else {
          setSearchProgress({
            current: data.progress,
            total: data.total,
            channel: data.currentChannel
          })
        }
        break

      case 'result':
        const result = data.result
        setTotalResults(data.totalResults)
        setSearchResults(prev => {
          const newResults = { ...prev }
          const type = result.type
          if (!newResults[type]) {
            newResults[type] = []
          }
          const exists = newResults[type].some(item => item.link === result.link)
          if (!exists) {
            newResults[type].push({
              title: result.title,
              link: result.link,
              datetime: result.datetime,
              channel: result.channel,
              originalText: result.originalText
            })
          }
          return newResults
        })
        break

      case 'complete':
        setHasSearched(true)
        setSearchProgress({ current: data.channelsSearched, total: data.channelsSearched, channel: '' })
        if (data.totalResults === 0) {
          alert(data.message || '未找到相关资源，请尝试其他关键词')
        }
        break

      case 'error':
        console.error('搜索错误:', data)
        if (data.channel) {
          console.error(`频道 ${data.channel} 搜索失败:`, data.error)
        } else {
          alert(data.error || '搜索失败')
        }
        break
    }
  }

  const handleCopy = async (url: string) => {
    const success = await copyToClipboard(url)
    if (success) {
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(''), 2000)
    } else {
      alert('复制失败')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="search-section">
      <div className="search-form">
        <div className="search-input-wrapper">
          <span className="search-input-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="请输入影视名称..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
          />
        </div>
        <button
          className="search-button"
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? '搜索中...' : '搜索'}
        </button>
      </div>

      <div className="search-info">
        <p style={{margin: 0}}>智能搜索多个 Telegram 频道中的网盘资源</p>
      </div>

      {isSearching && (
        <div className="loading">
          <div className="spinner"></div>
          <p style={{color: 'var(--text-secondary)', marginBottom: 'var(--space-3)'}}>
            正在搜索资源：<strong style={{color: 'var(--text-primary)'}}>{query}</strong>
          </p>
          {searchProgress.total > 0 && (
            <div className="search-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(searchProgress.current / searchProgress.total) * 100}%` }}
                ></div>
              </div>
              <div className="progress-stats">
                <span>状态：{searchProgress.channel || '初始化中...'}</span>
                <span>进度：{searchProgress.current}/{searchProgress.total}</span>
                <span>已找到：{totalResults} 条</span>
              </div>
              {activeChannels.length > 0 && (
                <div className="active-channels">
                  <div style={{marginBottom: 'var(--space-1)'}}>正在搜索 ({activeChannels.length} 个频道)：</div>
                  <div className="channel-list">
                    {activeChannels.slice(0, 5).map((channel, index) => (
                      <span key={index} className="channel-tag">{channel}</span>
                    ))}
                    {activeChannels.length > 5 && (
                      <span className="channel-tag">+{activeChannels.length - 5} 更多</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasSearched && !isSearching && (
        <div className="results-section">
          {Object.keys(searchResults).length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h4>未找到相关资源</h4>
              <p>请尝试其他关键词或检查频道设置</p>
              <div className="alternative-suggestion">
                <p>或者试试其他搜索平台：</p>
                <button
                  className="action-button aipan-button"
                  onClick={() => window.open('https://www.aipan.me/', '_blank', 'noopener,noreferrer')}
                >
                  🔍 使用爱盼搜索
                </button>
              </div>
            </div>
          ) : (
            getSortedResults().map(([type, items]) => (
              <div key={type} className="result-group">
                <div
                  className={`result-group-header ${expandedGroups[type] ? 'expanded' : 'collapsed'}`}
                  onClick={() => toggleGroup(type)}
                >
                  <div className="group-title">
                    {type}
                    <span className="group-count">{items.length}</span>
                  </div>
                  <div className="group-toggle">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {expandedGroups[type] && (
                  <div className="result-items-container">
                    {items.map((item, index) => (
                      <div key={`${item.link}-${index}`} className="result-item">
                        <div className="result-title">
                          {truncateText(item.title, 100)}
                        </div>
                        <div className="result-actions">
                          {item.originalText && (
                            <button
                              className="action-button view-text"
                              onClick={() => openTextModal(item.originalText!)}
                            >
                              查看原文
                            </button>
                          )}
                          <button
                            className="action-button primary"
                            onClick={() => openLink(item.link)}
                          >
                            打开
                          </button>
                          <button
                            className={`action-button${copiedUrl === item.link ? ' copied' : ''}`}
                            onClick={() => handleCopy(item.link)}
                          >
                            {copiedUrl === item.link ? '已复制 ✓' : '复制链接'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {!hasSearched && !isSearching && (
        <div className="welcome-message">
          <div className="welcome-icon">☁️</div>
          <h3>欢迎使用 DriftingSearcher</h3>
          <p>在上方输入影视名称，点击搜索按钮开始查找资源</p>
          <p>支持搜索电影、电视剧、动漫等各类影视资源</p>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>消息原文</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div
                className="modal-text"
                dangerouslySetInnerHTML={{
                  __html: modalText
                    .replace(/\n/g, '<br>')
                    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchView
