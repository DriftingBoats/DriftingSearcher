import React from 'react'
import SearchView from './components/SearchView'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>DriftingSearcher</h1>
        <p className="subtitle">智能网盘资源搜索引擎</p>
      </header>

      <main className="main-content">
        <SearchView />
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>© 2024 <a href="https://github.com/DriftingBoats/DriftingSearcher" target="_blank" rel="noopener noreferrer" className="title-link">DriftingSearcher - 智能网盘资源搜索引擎</a></p>
        </div>
      </footer>

      <style>
        {`
          .header {
            text-align: center;
            padding: 2rem 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin-bottom: 2rem;
          }
          
          .header h1 {
            margin: 0 0 0.5rem 0;
            font-size: 2.5rem;
            font-weight: 700;
          }
          
          .subtitle {
            margin: 0;
            opacity: 0.9;
            font-size: 1.1rem;
          }
          
          .footer {
            background: #2d3748;
            color: white;
            padding: 2rem 1rem;
            margin-top: 3rem;
            text-align: center;
          }
          
          .footer-content {
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .footer-content p {
            margin: 0 0 1rem 0;
            opacity: 0.8;
            font-size: 0.9rem;
          }
          

          
          .title-link {
            color: inherit;
            text-decoration: none;
            transition: opacity 0.2s ease;
          }
          
          .title-link:hover {
            opacity: 0.8;
            text-decoration: underline;
          }
        `}
      </style>
    </div>
  )
}

export default App