# DriftingSearcher 部署文档

## 项目简介

DriftingSearcher 是一个智能网盘资源搜索引擎，支持搜索多个 Telegram 频道中的网盘资源，提供流式搜索和实时结果展示功能。

## 系统要求

- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器
- 稳定的网络连接（用于访问 Telegram 频道）

## 项目结构

```
DriftingSearcher/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── utils/             # 工具函数
│   └── types.ts           # TypeScript 类型定义
├── server/                # 后端服务
│   ├── services/          # 业务逻辑服务
│   ├── index.js           # 服务器入口文件
│   └── package.json       # 后端依赖配置
├── resource_channel_config.json  # 频道配置文件
├── package.json           # 前端依赖配置
└── vite.config.ts         # Vite 构建配置
```

## 本地开发部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd DriftingSearcher
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 安装后端依赖

```bash
cd server
npm install
cd ..
```

### 4. 配置环境变量

在 `server` 目录下创建 `.env` 文件：

```bash
cd server
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：

```env
PORT=3001
# 其他配置项...
```

### 5. 启动服务

#### 启动后端服务

```bash
cd server
npm start
```

后端服务将在 `http://localhost:3001` 启动

#### 启动前端开发服务器

在新的终端窗口中：

```bash
npm run dev
```

前端服务将在 `http://localhost:3000` 启动

### 6. 访问应用

打开浏览器访问 `http://localhost:3000` 即可使用 DriftingSearcher。

## 生产环境部署

### 1. 构建前端

```bash
npm run build
```

构建产物将生成在 `dist` 目录中。

### 2. 部署到服务器

#### 使用 PM2 部署后端服务

```bash
# 安装 PM2
npm install -g pm2

# 启动后端服务
cd server
pm2 start index.js --name "drifting-searcher-api"
```

#### 使用 Nginx 部署前端

1. 将 `dist` 目录内容复制到 Nginx 网站根目录
2. 配置 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/dist;
    index index.html;
    
    # 处理前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 代理 API 请求到后端
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 配置 HTTPS（推荐）

使用 Let's Encrypt 获取免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

## Docker 部署

### 1. 创建 Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
# 多阶段构建
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS backend
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
COPY resource_channel_config.json ./

# 最终镜像
FROM nginx:alpine
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY --from=backend /app /backend

# 安装 Node.js
RUN apk add --no-cache nodejs npm

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 启动脚本
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
```

### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  drifting-searcher:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
    volumes:
      - ./resource_channel_config.json:/backend/resource_channel_config.json:ro
```

### 3. 部署

```bash
docker-compose up -d
```

## 配置说明

### 频道配置

编辑 `resource_channel_config.json` 文件来配置要搜索的 Telegram 频道：

```json
{
  "channels": [
    {
      "id": "chanel_id",
      "name": "示范配置",
      "enable": true
    }
  ]
}
```

### 性能优化配置

在 `server/services/telegramService.js` 中可以调整以下参数：

- `batchSize`: 并发搜索的频道数量（默认：6）
- `batchDelay`: 批次间延迟时间（默认：500ms）
- `timeout`: 单个频道搜索超时时间（默认：8秒）

## 监控和维护

### 日志查看

```bash
# PM2 日志
pm2 logs drifting-searcher-api

# Docker 日志
docker-compose logs -f
```

### 健康检查

访问 `http://your-domain.com/health` 检查服务状态。

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建和部署
npm run build
pm2 restart drifting-searcher-api

# 或使用 Docker
docker-compose down
docker-compose up -d --build
```

## 故障排除

### 常见问题

1. **端口冲突**：确保 3000 和 3001 端口未被占用
2. **网络问题**：检查防火墙设置和网络连接
3. **依赖问题**：删除 `node_modules` 重新安装依赖
4. **权限问题**：确保有足够的文件读写权限

### 性能优化建议

1. 使用 CDN 加速静态资源
2. 启用 Gzip 压缩
3. 配置适当的缓存策略
4. 监控服务器资源使用情况
5. 定期更新依赖包

## 安全注意事项

1. 定期更新依赖包以修复安全漏洞
2. 使用 HTTPS 加密传输
3. 配置适当的 CORS 策略
4. 限制 API 访问频率
5. 定期备份配置文件

## 技术支持

如遇到部署问题，请检查：

1. Node.js 版本是否符合要求
2. 网络连接是否正常
3. 配置文件是否正确
4. 日志中的错误信息

---

**注意**：本文档基于当前版本编写，部署前请确保使用最新版本的代码和依赖。