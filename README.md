# 科技刘-IPTV

## 基于 Gemini 3 Pro开发的在线播放器，项目在继续开发中…

## 开发指南

### 代码检查

项目配置了 ESLint 和 Prettier 用于代码质量检查和格式化。

#### 可用命令：

- `npm run lint` - 检查代码质量（ESLint）
- `npm run lint:fix` - 自动修复 ESLint 错误
- `npm run format` - 格式化代码（Prettier）
- `npm run format:check` - 检查代码格式
- `npm run type-check` - TypeScript 类型检查
- `npm run check` - 运行所有检查（类型检查 + ESLint + 格式检查）

#### 推荐工作流程：

1. 开发时定期运行 `npm run lint:fix` 自动修复代码问题
2. 提交代码前运行 `npm run check` 确保代码质量
3. 使用 `npm run format` 统一代码格式

<p align="center">
  <img src="./zxlwq.webp" alt="Site" />
</p>

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 预览

<div align="center">
<img width="1920" height="879" alt="Site" src="./ZxlwqIPTV.webp" />
</div>

# Cloudflare Pages 部署

## 部署步骤：

1. **Fork该项目**
2. **部署到 Cloudflare Pages**
   - 访问 [Cloudflare](https://pages.cloudflare.com/)
   - 创建D1 数据库
   - 进入Workers 和 Pages
   - 连接 GitHub 仓库
   - 选择框架：React(Vite)
   - 部署完成后在Pages项目设置中绑定D1 数据库，绑定名称为 `TV`
   - 添加自定义名
   - 重试部署

3. **初始化/更新数据库 Schema**
   - 在 Cloudflare Dashboard 中，进入您的 D1 数据库
   - 在 **Console** 标签页中执行 `schema.sql` 文件中的 SQL 语句来创建或更新表结构
   - 如果数据库已存在，需要手动添加 `custom_urls` 字段：
     ```sql
     ALTER TABLE user_settings ADD COLUMN custom_urls TEXT;
     ```

## 密码保护设置（可选）

如果需要为播放器添加密码保护：

1. **设置环境变量**
   - 在 Cloudflare Pages 项目设置中，进入 **Settings** > **Environment Variables**
   - 添加环境变量：
     - **Variable name**: `PASSWORD`
     - **Value**: 您想要设置的密码（例如：`mySecurePassword123`）
     - **Environment**: 选择 **Production**（或根据需要选择其他环境）
   - 点击 **Save**

2. **功能说明**
   - 设置密码后，用户首次访问需要输入密码才能进入播放器
   - 密码验证成功后，会在浏览器中保存认证状态（24小时有效）
   - 如果未设置 `PASSWORD` 环境变量，播放器将直接开放访问（无需密码）

3. **安全提示**
   - 请使用强密码保护您的播放器
   - 密码存储在 Cloudflare Pages 环境变量中，不会暴露在前端代码中
   - 认证状态存储在浏览器的 localStorage 中，清除浏览器数据后需要重新输入密码

## 频道列表格式支持

播放器支持多种频道列表格式：

### 1. JSON 格式（推荐，支持预览图）

JSON 格式允许您在文件中直接硬编码预览图（logo），格式如下：

```json
[
  {
    "name": "频道名称",
    "url": "https://example.com/stream.m3u8",
    "group": "分组名称",
    "logo": "https://example.com/logo.jpg",
    "tvgId": "optional-channel-id"
  }
]
```

或者使用对象格式：

```json
{
  "channels": [
    {
      "name": "频道名称",
      "url": "https://example.com/stream.m3u8",
      "group": "分组名称",
      "logo": "https://example.com/logo.jpg"
    }
  ]
}
```

**字段说明：**

- `name` (必需): 频道名称
- `url` (必需): 视频流地址
- `group` (可选): 分组名称，默认为文件名
- `logo` (可选): 预览图/封面图 URL
- `tvgId` (可选): 频道ID

### 2. M3U 格式

支持标准的 M3U/M3U8 格式，预览图通过 `tvg-logo` 属性指定：

```
#EXTINF:-1 tvg-id="channel1" tvg-logo="https://example.com/logo.jpg" group-title="电影",频道名称
https://example.com/stream.m3u8
```

### 3. TXT 格式

简单的文本格式，每行一个频道：

```
频道名称,https://example.com/stream.m3u8
```

或使用分组标记：

```
#Genre#电影
频道1,https://example.com/stream1.m3u8
频道2,https://example.com/stream2.m3u8
```

## 预览图编辑功能

播放器支持在前端页面编辑频道卡片的预览图：

1. **硬编码预览图**：在 JSON/M3U 文件中直接指定 `logo` 字段
2. **前端编辑**：点击频道卡片上的编辑按钮，可以自定义预览图链接
3. **优先级**：前端编辑的预览图会覆盖文件中硬编码的预览图
4. **重置功能**：点击"重置"按钮可以恢复为文件中硬编码的预览图

**注意**：前端编辑的预览图和频道 URL 会同时保存在：

- 浏览器的 localStorage 中（用于快速访问）
- Cloudflare D1 数据库中（持久化存储，清除浏览器数据后不会丢失）

清除浏览器数据后，应用会自动从 D1 数据库同步恢复所有自定义设置。
