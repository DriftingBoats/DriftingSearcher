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
        `}
      </style>
    </div>
  )
}

export default App