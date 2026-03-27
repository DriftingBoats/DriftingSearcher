import React from 'react'
import SearchView from './components/SearchView'

function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>DriftingSearcher</h1>
          <p className="subtitle">智能网盘资源搜索引擎</p>
        </div>
      </header>

      <main className="main-content">
        <SearchView />
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>© 2024 <a href="https://github.com/DriftingBoats/DriftingSearcher" target="_blank" rel="noopener noreferrer" className="title-link">DriftingSearcher - 智能网盘资源搜索引擎</a></p>
        </div>
      </footer>
    </div>
  )
}

export default App
