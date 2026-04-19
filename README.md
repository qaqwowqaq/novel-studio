<div align="center">

<img src="public/icons/juandeng-icon-v2.png" alt="卷灯" width="128" />

# 卷灯 · Novel Studio

本地优先的长篇小说写作软件

[![Release](https://img.shields.io/github/v/release/qaqwowqaq/novel-studio?display_name=tag&label=release)](https://github.com/qaqwowqaq/novel-studio/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## 设计哲学

**两种状态,各司其职。**

- **沉浸写作态** — 零干扰,只有正文与光标。
- **灵感工具态** — 快速调度大纲、设定、素材、AI 辅助。

功能齐全 ≠ 功能杂乱。一切围绕长篇创作的连续注意力服务。

## 主要特性

- **正文编辑器** — CodeMirror 6,Markdown,作者节奏优先。
- **作品 / 章节 / 大纲** — 多作品并行,章节目录与卡片视图自由切换。
- **素材库** — 设定、人物、地点、伏笔、灵感与图像参考统一收纳;⌘K 快速跳转。
- **侧边素材面板** — 写作时把任意素材以 Markdown 渲染挂在右侧参考,可拖拽宽度,可隐藏/恢复。
- **AI 协作** — 通过 Codex CLI 接入,用于扩写、续写、润色,数据完全本地。
- **关系图谱 / 写作统计 / 快照** — 长篇必备的辅助视图。
- **本地存储** — 所有数据写入用户目录,断网可用,无任何云依赖。

## 下载

前往 [Releases](https://github.com/qaqwowqaq/novel-studio/releases/latest) 下载对应平台的安装包:

| 平台 | 文件 |
| --- | --- |
| Windows 10/11 | `Novel-Studio-Setup-x.y.z.exe` |
| macOS (Apple Silicon / Intel) | `Novel-Studio-x.y.z-arm64.dmg` / `-x64.dmg` |
| Linux | `Novel-Studio-x.y.z.AppImage` |

> Windows 首次安装可能被 SmartScreen 提示"未签名",点击"更多信息 → 仍要运行"即可。
>
> macOS 若提示"无法打开",可在终端执行 `xattr -dr com.apple.quarantine "/Applications/Novel Studio.app"`。

## 自动更新

软件启动时会静默检查 GitHub Releases 是否有新版本,有则后台下载,完成后下次启动自动应用。无需手动操作。

## 本地开发

```bash
npm install
npm run dev          # 同时启动 Vite 与 Electron
```

如果 Electron 二进制因网络问题没装上:

```bash
npm run repair:electron
```

### 生产构建(本地预览)

```bash
npm run build        # 仅打 web 资源
npm start            # 用本地 electron 加载 dist/
```

### 打包安装器(本机)

```bash
npm run dist         # 当前平台,产物在 release/
```

### 发布新版本

1. 改动合入 main。
2. 升版本号:`npm version patch`(或 `minor` / `major`)。
3. 推 tag:`git push --follow-tags`。
4. GitHub Actions 自动构建 win / mac / linux 三平台并发布到 Releases,所有用户客户端将在下次启动时收到更新。

## 数据存储

桌面端通过 Electron IPC 写入用户目录:

- Windows:`%APPDATA%/Novel Studio/`
- macOS:`~/Library/Application Support/Novel Studio/`
- Linux:`~/.config/Novel Studio/`

主要文件:

- `novel-studio-data.json` — 全部作品数据
- `secrets.json` — 受 OS 加密 API 保护的密钥(如 OpenAI Key)

## 技术栈

- React 19 · TypeScript · Vite
- Electron 39
- CodeMirror 6
- electron-builder · electron-updater

## 协议

[MIT](LICENSE) © Novel Studio contributors
