# 🚀 Vercel 一键部署指南

## 快速部署

### 方式一：一键部署（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDriftingBoats%2FDriftingSearcher&env=TELEGRAM_CHANNELS&envDescription=Telegram%20channels%20configuration%20in%20JSON%20format&envLink=https%3A%2F%2Fgithub.com%2FDriftingBoats%2FDriftingSearcher%23configuration&project-name=drifting-searcher&repository-name=DriftingSearcher)

**步骤：**
1. 点击上方部署按钮
2. 登录/注册 Vercel 账户
3. 连接 GitHub 账户
4. 填写环境变量（见下方配置说明）
5. 点击 "Deploy" 开始部署
6. 等待部署完成（通常 2-3 分钟）

### 方式二：手动部署

1. **Fork 项目**
   - 访问 [GitHub 项目页面](https://github.com/DriftingBoats/DriftingSearcher)
   - 点击右上角 "Fork" 按钮

2. **导入到 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "New Project"
   - 选择你 Fork 的仓库
   - 点击 "Import"

3. **配置环境变量**
   - 在部署配置页面添加环境变量
   - 或部署后在项目设置中添加

4. **部署**
   - 点击 "Deploy" 开始部署
   - Vercel 会自动构建和部署

## 🔧 环境变量配置

### 必需变量

| 变量名 | 描述 | 获取方式 |
|--------|------|----------|
| `TELEGRAM_CHANNELS` | 频道配置（JSON格式） | 见下方频道配置说明 |

### 可选变量

| 变量名 | 默认值 | 描述 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `MAX_SEARCH_RESULTS` | `50` | 每个频道最大搜索结果数 |
| `SEARCH_TIMEOUT` | `30000` | 搜索超时时间（毫秒） |
| `CONCURRENT_CHANNELS` | `5` | 并发搜索频道数 |

### 配置搜索频道

**方式一：使用环境变量（推荐用于 Vercel）**

在 Vercel 环境变量中添加 `TELEGRAM_CHANNELS`，值为 JSON 格式的频道配置：

```json
[
  {
    "id": "your_channel_username",
    "name": "频道显示名称",
    "enable": true
  },
  {
    "id": "another_channel",
    "name": "另一个频道",
    "enable": true
  }
]
```

**注意事项：**
- 频道 ID 可以是 `username` 格式或数字 ID
- 确保 Bot 已加入所有配置的频道
- `enable` 设为 `false` 可临时禁用某个频道
- JSON 格式必须正确，建议使用在线 JSON 验证工具检查

**方式二：使用配置文件**

如果不使用环境变量，系统会尝试读取 `resource_channel_config.json` 文件。但在 Vercel 部署时，建议使用环境变量方式。

## 📁 项目文件说明

### Vercel 配置文件

- **`vercel.json`** - Vercel 部署配置
  - 定义构建和路由规则
  - 配置 serverless 函数
  - 设置重写规则

- **`.env.vercel.example`** - 环境变量模板
  - 包含所有需要的环境变量
  - 复制到 Vercel 环境变量设置

- **`deploy.json`** - 一键部署配置
  - 定义部署按钮的行为
  - 预设环境变量

## 🔄 自动部署

部署完成后，每次推送到 GitHub 主分支都会自动触发重新部署：

1. 修改代码并推送到 GitHub
2. Vercel 自动检测变更
3. 自动构建和部署新版本
4. 部署完成后自动更新线上版本

## 🌐 自定义域名

### 添加自定义域名

1. 在 Vercel 项目面板中点击 "Settings"
2. 选择 "Domains" 选项卡
3. 输入你的域名（如：`search.yourdomain.com`）
4. 按照提示配置 DNS 记录

### DNS 配置示例

```
# CNAME 记录
search.yourdomain.com -> cname.vercel-dns.com

# 或 A 记录
search.yourdomain.com -> 76.76.19.61
```

## 🔍 故障排除

### 常见问题

1. **部署失败**
   - 检查环境变量是否正确设置
   - 确认 Telegram 凭据有效
   - 查看 Vercel 部署日志

2. **API 请求失败**
   - 确认 Bot Token 有效
   - 检查 API ID 和 Hash 是否正确
   - 验证网络连接

3. **搜索无结果**
   - 检查频道配置文件
   - 确认 Bot 已加入目标频道
   - 验证搜索关键词

### 查看日志

1. 在 Vercel 项目面板中点击 "Functions"
2. 选择相应的函数查看日志
3. 或在 "Deployments" 中查看构建日志

## 📞 技术支持

如果遇到问题：

1. 查看 [项目文档](https://github.com/DriftingBoats/DriftingSearcher)
2. 提交 [Issue](https://github.com/DriftingBoats/DriftingSearcher/issues)
3. 参考 [Vercel 官方文档](https://vercel.com/docs)

---

**🎉 恭喜！你的 DriftingSearcher 已成功部署到 Vercel！**