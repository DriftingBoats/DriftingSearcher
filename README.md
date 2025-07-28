# DriftingSearcher

> 🚢 A modern cloud storage resource searcher for Telegram channels

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)

## 🌟 Features

- 🔍 **Smart Search**: Intelligent search across multiple Telegram channels
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ⚡ **Real-time Streaming**: Live search results with progress tracking
- 🗂️ **Auto Categorization**: Automatically categorizes results by cloud storage type
- 📋 **One-click Copy**: Quick copy resource links to clipboard
- 🎯 **Duplicate Removal**: Smart deduplication for cleaner results
- 🔄 **Concurrent Search**: Parallel searching for faster results
- 📊 **Progress Tracking**: Real-time search progress with active channel display

## 🌐 Supported Cloud Storage

- 夸克网盘 (Quark)
- 阿里云盘 (Aliyun Drive)
- 天翼云盘 (China Telecom Cloud)
- 百度网盘 (Baidu Pan)
- 115网盘 (115 Cloud)
- 迅雷网盘 (Xunlei Cloud)
- UC网盘 (UC Cloud)
- Pikpak网盘 (Pikpak)
- 123云盘 (123 Cloud)

## 🚀 Quick Start

### 📦 One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDriftingBoats%2FDriftingSearcher&env=TELEGRAM_CHANNELS&envDescription=Telegram%20channels%20configuration%20in%20JSON%20format&envLink=https%3A%2F%2Fgithub.com%2FDriftingBoats%2FDriftingSearcher%23configuration&project-name=drifting-searcher&repository-name=DriftingSearcher)

**部署步骤：**
1. 点击上方 "Deploy with Vercel" 按钮
2. 连接你的 GitHub 账户
3. 填写必要的环境变量：
   - `TELEGRAM_CHANNELS` - 频道配置（JSON格式） 
4. 点击 "Deploy" 开始部署
5. 部署完成后，访问提供的 URL

### 🛠️ Local Development

### Prerequisites

- Node.js 16.0 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DriftingBoats/DriftingSearcher.git
   cd DriftingSearcher
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Configure environment**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env file with your configuration
   ```

5. **Start the application**
   
   **Backend (Terminal 1):**
   ```bash
   cd server
   npm start
   ```
   
   **Frontend (Terminal 2):**
   ```bash
   npm run dev
   ```

6. **Access the application**
   
   Open your browser and visit `http://localhost:3000`

## 📁 Project Structure

```
DriftingSearcher/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   └── SearchView.tsx       # Main search component
│   ├── utils/                   # Utility functions
│   │   ├── format.ts           # Text formatting utilities
│   │   └── telegram.ts         # Telegram-related utilities
│   ├── types.ts                # TypeScript type definitions
│   └── App.tsx                 # Main App component
├── server/                      # Backend API server
│   ├── services/               # Business logic services
│   │   ├── channelService.js   # Channel management
│   │   └── telegramService.js  # Telegram search logic
│   ├── index.js               # Server entry point
│   └── package.json           # Backend dependencies
├── resource_channel_config.json # Channel configuration
├── DEPLOYMENT.md               # Deployment guide
└── package.json               # Frontend dependencies
```

## ⚙️ Configuration

### Channel Configuration

Edit `resource_channel_config.json` to configure Telegram channels:

```json
{
  "channels": [
    {
      "id": "channel_id",
      "name": "channel_name",
      "enable": true
    }
  ]
}
```

### Performance Tuning

Adjust search parameters in `server/services/telegramService.js`:

- `batchSize`: Number of concurrent channel searches (default: 6)
- `batchDelay`: Delay between batches in milliseconds (default: 500)
- `timeout`: Single channel search timeout in seconds (default: 8)

## 🛠️ Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### API Endpoints

- `GET /health` - Health check
- `POST /api/search` - Standard search
- `POST /api/search/stream` - Streaming search with real-time updates
- `GET /api/channels/stats` - Channel statistics

## 🐳 Docker Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:

- Local development setup
- Production deployment with PM2 + Nginx
- Docker containerization
- docker-compose orchestration

## ☁️ Vercel Deployment

### Automatic Deployment

Use the one-click deploy button above for the fastest deployment experience.

### Manual Deployment

1. **Fork this repository** to your GitHub account

2. **Import to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your forked repository

3. **Configure Environment Variables:**
   ```bash
   TELEGRAM_CHANNELS='[{"id":"@your_channel","name":"Channel Name","enable":true}]'
   NODE_ENV=production
   ```
   
   **频道配置说明：**
   - `TELEGRAM_CHANNELS`: JSON 格式的频道配置，替代 `resource_channel_config.json` 文件
   - 这样可以避免将敏感的频道信息提交到公开仓库
   - 格式：`[{"id":"@channel_username","name":"显示名称","enable":true}]`

4. **Deploy:**
   - Vercel will automatically build and deploy your application
   - Your app will be available at `https://your-project.vercel.app`

### Vercel Configuration

The project includes:
- `vercel.json` - Vercel deployment configuration
- `.env.vercel.example` - Environment variables template
- `deploy.json` - One-click deploy configuration

### Custom Domain

To use a custom domain:
1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- Backend powered by [Express.js](https://expressjs.com/)
- UI components styled with modern CSS
- Search functionality optimized for Telegram channels

## 📞 Support

If you encounter any issues or have questions:

1. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) for common solutions
2. Review existing [Issues](https://github.com/DriftingBoats/DriftingSearcher/issues)
3. Create a new issue with detailed information

---

<div align="center">
  <strong>🚢 Happy Searching with DriftingSearcher! 🔍</strong>
</div>