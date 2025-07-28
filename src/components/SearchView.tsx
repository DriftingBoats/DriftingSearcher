import React, { useState, useRef } from 'react'
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
  const eventSourceRef = useRef<EventSource | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('请输入搜索内容')
      return
    }

    // 关闭之前的连接
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
      // 使用流式搜索
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
        // 频道开始搜索，添加到活跃频道列表
        setActiveChannels(prev => [...prev, data.channel])
        setSearchProgress(prev => ({ 
          ...prev,
          channel: `并发搜索中...` 
        }))
        break
        
      case 'progress':
        if (data.completed) {
          // 频道搜索完成，从活跃列表中移除
          setActiveChannels(prev => prev.filter(ch => ch !== data.currentChannel))
          setSearchProgress({ 
            current: data.progress, 
            total: data.total, 
            channel: data.progress === data.total ? '搜索完成' : '并发搜索中...' 
          })
        } else {
          // 常规进度更新
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
          
          // 检查是否已存在相同链接
          const exists = newResults[type].some(item => item.link === result.link)
          if (!exists) {
            newResults[type].push({
              title: result.title,
              link: result.link,
              datetime: result.datetime,
              channel: result.channel
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
        <input
          type="text"
          className="search-input"
          placeholder="请输入影视名称..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSearching}
        />
        <button
          className="search-button"
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? '搜索中...' : '搜索'}
        </button>
      </div>

      <div className="search-info">
        <p>智能搜索多个Telegram频道中的网盘资源</p>
      </div>

      {isSearching && (
        <div className="loading">
          <div className="spinner"></div>
          <p>正在搜索资源: {query}...</p>
          {searchProgress.total > 0 && (
            <div className="search-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(searchProgress.current / searchProgress.total) * 100}%` }}
                ></div>
              </div>
              <div className="progress-text">
                <div>状态: {searchProgress.channel}</div>
                <div>进度: {searchProgress.current}/{searchProgress.total}</div>
                <div>已找到: {totalResults} 个结果</div>
                {activeChannels.length > 0 && (
                  <div className="active-channels">
                    <div>正在搜索 ({activeChannels.length}): </div>
                    <div className="channel-list">
                      {activeChannels.slice(0, 5).map((channel, index) => (
                        <span key={index} className="channel-tag">{channel}</span>
                      ))}
                      {activeChannels.length > 5 && <span className="channel-tag">+{activeChannels.length - 5}更多</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasSearched && !isSearching && (
        <div className="results-section">
          {Object.keys(searchResults).length === 0 ? (
            <div className="no-results">
              <p>未找到相关资源</p>
              <p>请尝试其他关键词或检查频道设置</p>
              <div className="alternative-suggestion">
                <p>或者试试其他搜索平台：</p>
                <button 
                  className="action-button primary aipan-button"
                  onClick={() => window.open('https://www.aipan.me/', '_blank', 'noopener,noreferrer')}
                >
                  🔍 使用爱盼搜索
                </button>
              </div>
            </div>
          ) : (
            Object.entries(searchResults).map(([type, items]) => (
              <div key={type} className="result-group">
                <div className="result-group-header">
                  {type} ({items.length})
                </div>
                {items.map((item, index) => (
                  <div key={`${item.link}-${index}`} className="result-item">
                    <div className="result-title">
                      {truncateText(item.title, 100)}
                    </div>
                    <div className="result-actions">
                      <button
                        className="action-button primary"
                        onClick={() => openLink(item.link)}
                      >
                        打开
                      </button>
                      <button
                        className="action-button"
                        onClick={() => handleCopy(item.link)}
                      >
                        {copiedUrl === item.link ? '已复制' : '复制链接'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {!hasSearched && !isSearching && (
        <div className="welcome-message">
          <h3>欢迎使用 DriftingSearcher</h3>
          <p>在上方输入影视名称，点击搜索按钮开始查找资源</p>
          <p>支持搜索电影、电视剧、动漫等各类影视资源</p>
        </div>
      )}

      <style>{`
        .search-info {
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f7fafc;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #4a5568;
        }
        
        .channel-names {
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: #718096;
        }
        
        .no-results {
          text-align: center;
          padding: 2rem;
          color: #718096;
        }
        
        .welcome-message {
          text-align: center;
          padding: 3rem 2rem;
          color: #4a5568;
        }
        
        .welcome-message h3 {
          margin-bottom: 1rem;
          color: #2d3748;
        }
        
        .welcome-message p {
          margin-bottom: 0.5rem;
        }
        
        .search-progress {
          margin-top: 1rem;
          width: 100%;
        }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          background-color: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4299e1, #3182ce);
          transition: width 0.3s ease;
        }
        
        .progress-text {
          font-size: 0.9rem;
          color: #4a5568;
          text-align: center;
          margin: 0;
          line-height: 1.4;
        }
        
        .result-item {
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .active-channels {
          margin-top: 8px;
          font-size: 12px;
          color: #666;
        }
        
        .channel-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }
        
        .channel-tag {
          background: #e3f2fd;
          color: #1976d2;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 11px;
          white-space: nowrap;
        }
        
        .alternative-suggestion {
          margin-top: 1.5rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #007bff;
          text-align: center;
        }
        
        .alternative-suggestion p {
          margin: 0 0 0.75rem 0;
          color: #495057;
          font-size: 0.9rem;
        }
        
        .aipan-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 25px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .aipan-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .aipan-button:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  )
}

export default SearchView