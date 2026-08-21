# Event Studio

<br>
<p align="center">
  <h2><b>⚠️ 由于 Tauri 性能低于预期，本项目暂时停止更新 ⚠️</b></h2>
  <h2><b>⚠️Updates are temporarily suspended due to lower-than-expected Tauri performance ⚠️</b></h2>
  <h4><b>I guess I have some paranoia about performance. It's merely a tool, and I don't clearly know what I'm doing. EventStudio was nearing completion, yet at this moment, I've abandoned it. Perhaps it's because AI is involved in this project.</b></h2>
</p>
<br>

<p align="center">
  <strong>High-Performance Visual Event Flow & Script Editor for Nintendo Games</strong><br>
  <strong>高性能任天堂游戏可视化事件流与脚本编辑器</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPL%202.0-blue.svg" alt="License: GPL 2.0" /></a>
  <img src="https://img.shields.io/badge/Language-English%20%7C%20%E4%B8%AD%E6%96%87-blue" alt="Language" />
</p>

<p align="center">
  <a href="#-english-guide">English Guide</a> •
  <a href="#-chinese-guide--中文说明">中文说明 (Chinese)</a> •
  <a href="#-keyboard-shortcuts--快捷键清单">Keyboard Shortcuts</a> •
  <a href="#-disclaimer--免责声明">Disclaimer / 免责声明</a>
</p>

---

## 🇬🇧 English Guide

### 📖 Introduction
**Event Studio** is a high-performance, cross-platform visual **EventFlow** editor specifically designed for Nintendo games (such as *The Legend of Zelda: Breath of the Wild*, *Tears of the Kingdom*, and *Animal Crossing: New Horizons*).

Powered by a **Rust (Revfl/Tauri)** backend and a modern **React + TypeScript** frontend, it delivers lightning-fast parsing, visual diagramming, and byte-accurate repacking for `.bfevfl` event flows, `.sbeventpack` / `.pack` archives, and `.msbt` dialogue files.

> 💡 **Notice**: Approximately **40%** of this project's code was generated with **AI assistance**, and has undergone **human review, code auditing, and testing verification** to ensure reliability and performance.

> ⚠️ **Disclaimer**: This tool is developed primarily for the author's **personal MOD creation and testing**. While tested and verified, the author **assumes no liability for any file corruption, data loss, game crashes, or other damages** resulting from its use. **Always backup your original files before editing.** If you do not trust this tool, please refrain from using it.

---

### ✨ Key Features

- 🎯 **Intuitive Node-Based Flowchart**: Visualizes event logic as interactive DAG flowcharts with zooming, panning, Dagre auto-layout, and multi-directional edge routing.
- 📦 **Comprehensive File Format Support**:
  - `.bfevfl` / `.bfevtm`: Direct binary reading/writing with bi-directional JSON source synchronization.
  - `.sbeventpack` / `.pack` / `.sarc`: Hierarchical archive explorer with automatic Yaz0 decompression and transparent repacking.
  - `.msbt`: Localized dialogue editor featuring tag highlighting and live rich-text previews.
  - `.aamp` / `.byml`: Automatic decompile to YAML and instant recompile to binary.
- ✂️ **Knife Mode**: Quickly sever node connections with a single click, or drag output pins to empty space for rapid node creation and auto-linking.
- 💬 **Live In-Game Dialogue Lookup**: Integrates with game dictionaries to automatically resolve message keys and display localized NPC lines directly inside action nodes.
- ⏱️ **Persistent Auto-Save & Timeline**: Every modification generates a timestamped snapshot saved to disk, allowing seamless rollback across sessions.

---

### 🚀 Getting Started

#### 1. Open Files or Archives
- Click **File -> Open** or press `Ctrl + O`.
- Alternatively, drag and drop `.bfevfl` or `.sbeventpack` files directly into the window.

#### 2. Configure Game Paths (Recommended)
- Press `Ctrl + ,` or click **Settings** in the top right corner.
- Set your **Game Root Directory** and select the active language pack (e.g., `USen`, `CNzh`).
- The editor will index the game's MSBT dictionaries to display dialogue lines on nodes.

#### 3. Edit and Save
- **Add Nodes**: Right-click on empty canvas or drag out from any handle to open the creation menu.
- **Edit Parameters**: Double-click any node or use the inspector pane on the right.
- **Cut Connections**: Press `K` to enter Knife Mode, hover over an edge, and click to sever it.
- **Save**: Press `Ctrl + S`. Files inside archives are automatically repacked and compressed.

---

### 🧩 Core Node Types

| Node Type | Icon/Badge | Description |
| :--- | :--- | :--- |
| **Action** | 🟩 Rectangle | Concrete behavior executed by an actor or system (play animation, open dialogue, play sound, warp). |
| **Switch** | 🔶 Diamond | Conditional branching node routing to different cases based on the return value of a query function. |
| **Fork** | 🔷 Fork Bar | Splits a single execution line into multiple concurrent parallel branches. |
| **Join** | 🔷 Join Bar | Waits for all associated parallel branches to finish before resuming execution. |
| **SubFlow** | 🟪 SubFlow Frame | Calls and jumps into another standalone Flowchart file. |
| **EntryPoint** | 🔴 Entry Point | Identifies an event flow entry target where the game engine starts execution. |

---

<a name="-chinese-guide--中文说明"></a>
## 🇨🇳 Chinese Guide / 中文说明

<details open>
<summary><b>👉 点击切换/折叠中文说明 (Click to toggle Chinese Guide)</b></summary>
<br>

### 📖 项目简介
**Event Studio** 是一款专为任天堂游戏（如《塞尔达传说：旷野之息》、《王国之泪》、《集合啦！动物森友会》等）打造的高性能跨平台可视化事件流 (**EventFlow**) 脚本编辑器。

基于 **Rust (Revfl/Tauri)** 核心与 **React + TypeScript** 现代化前端构建，支持毫秒级解析、修改与重新打包 `.bfevfl` 事件流、`.sbeventpack` / `.pack` 归档以及 `.msbt` 对话文本。

> 💡 **说明与声明**：本项目约 **40%** 的代码由 **AI 辅助生成与编写**，但所有核心架构、数据流与业务逻辑均经过**人工审查、重构与测试验证**，确保代码质量与运行稳定性。

> ⚠️ **免责声明**：本项目主要为作者个人**创建与调试游戏 MOD 自用**而开发。尽管已做充分测试，作者**不对任何因使用本工具导致的文件损坏、数据丢失、游戏崩溃、存档异常或其他任何损失承担任何责任**。**使用前请务必自行备份原始文件**。若您对此工具存有疑虑或不信任，请谨慎或停止使用。

---

### ✨ 核心特性

- 🎯 **直观的可视化节点图表**：以树状与 DAG 有向无环图展示事件逻辑，支持缩放、平移、自动智能排版（Dagre 算法）与全向连线。
- 📦 **全套文件格式原生支持**：
  - `.bfevfl` / `.bfevtm`：事件流与时间线二进制文件，支持可视化编辑与底层 JSON 源码双向同步。
  - `.sbeventpack` / `.pack` / `.sarc`：多层级归档文件，内置快速解包与 Yaz0 自动透明压缩/写回。
  - `.msbt`：本地化剧情对话编辑器，支持颜色标签语法高亮与实时富文本预览。
  - `.aamp` / `.byml`：自动反编译为 YAML 源码进行参数修改并即时重编译回二进制。
- ✂️ **切刀模式 (Knife Mode)**：按下快捷键一键切断节点连线，支持拖拽引脚至空白画布快速创建并自动连线。
- 💬 **游戏文本字典联动**：配置游戏根目录与语言包后，动作节点中的对话 Key 自动解析并渲染对应语言的真实 NPC 台词。
- ⏱️ **时间轴快照与历史持久化**：每次节点操作均自动记录时间戳快照并持久化存储，意外退出或重新打开可随时回溯。

---

### 🚀 快速上手

#### 1. 打开文件或工程
- 点击顶部菜单 **文件 -> 打开** 或使用快捷键 `Ctrl + O`。
- 直接支持拖拽 `.bfevfl` 或 `.sbeventpack` 封包至编辑器窗口。

#### 2. 配置游戏路径（推荐）
- 按 `Ctrl + ,` 或点击右上角 **设置** 按钮。
- 配置游戏根目录 (**Game Dir**) 与目标语言包（如 `CNzh` / `USen`）。
- 软件将自动加载 MSBT 对话字典并在节点上即时显示对应中文/英文台词。

#### 3. 编辑与保存
- **添加节点**：右键点击空白画布或从节点引脚拖出连线即可唤出创建菜单。
- **编辑属性**：双击任意节点或在右侧属性检查器中直接调整 Actor、Action 与参数。
- **断开连线**：按 `K` 键开启切刀模式，鼠标悬停高亮连线后单击即可剪断。
- **保存写回**：按 `Ctrl + S`。若编辑的是封包内部文件，将自动写回归档并完成压缩。

---

### 🧩 核心节点类型说明

| 节点类型 | 图标/标识 | 说明 |
| :--- | :--- | :--- |
| **Action (动作)** | 🟩 矩形节点 | 角色或系统执行的具体行为，如播放动作、弹出对话、播放音效、传送角色。 |
| **Switch (分支)** | 🔶 菱形节点 | 条件分流节点，根据查询函数 (`Query`) 的返回值决定后续流转分支。 |
| **Fork (并行分流)** | 🔷 分流条 | 将单一执行流程拆分为多条同时执行的并行支线。 |
| **Join (并行汇合)** | 🔷 汇合条 | 等待所有关联的并行分支全部执行完毕后再继续向下流转。 |
| **SubFlow (子流程)** | 🟪 流程框 | 调用并跳转执行另一个独立的 Flowchart 流程图文件。 |
| **EntryPoint (入口)** | 🔴 标记点 | 标识事件流入口，游戏引擎从指定的入口节点开始流转。 |

</details>

---

<a name="-keyboard-shortcuts--快捷键清单"></a>
## ⌨️ Keyboard Shortcuts / 快捷键清单

| Shortcut (快捷键) | English (英文说明) | Chinese (中文说明) |
| :--- | :--- | :--- |
| `Ctrl + O` | Open file or archive (`.bfevfl`, `.pack`, `.msbt`) | 打开单个文件或归档包 |
| `Ctrl + N` | Create new empty event flow | 新建空白事件流文件 |
| `Ctrl + S` | Save current file (auto-repack into archive) | 保存当前文件（自动写回封包） |
| `Ctrl + Shift + S` | Save flowchart as a new file | 当前流程图另存为新文件 |
| `Ctrl + Z` | Undo last action | 撤销上一步操作 |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo | 重做上一步操作 |
| `Ctrl + Shift + R` | Recalculate auto-layout and refresh canvas | 重新自动计算排版并刷新图表 |
| `Ctrl + ,` | Open Settings & Game Preferences | 打开设置与游戏偏好 |
| `K` | Toggle Knife Mode (click edge to cut) | 开启/关闭切刀模式（单击连线快速断开） |
| `F` / `A` / `E` / `J` | Switch View (Flowchart / Actors / Events / JSON) | 快速切换视图（流程图 / 角色 / 事件 / JSON） |
| `F1` | Open User Guide & Help dialog | 打开使用说明与帮助窗口 |
| `Right Click Node` | Open node context menu | 打开节点快捷菜单（编辑/添加子节点等） |
| `Right Click Canvas` | Open global canvas create menu | 打开全局创建菜单 |
| `Double Click Node` | Open node properties and parameter editor | 打开节点属性与参数编辑窗口 |

---

## 🛠️ Development & Build / 构建与开发

### Prerequisites / 环境依赖
- [Node.js](https://nodejs.org/) (v24.19.0+) & `npm` / `pnpm`
- [Rust](https://www.rust-lang.org/) (Cargo 1.70+)

### Run Locally / 本地运行
```bash
# 1. 安装前端依赖 / Install frontend dependencies
npm install

# 2. 启动 Tauri 开发环境 / Start Tauri development app
npm run tauri dev
```

### Build Production Binary / 生产打包
```bash
# 运行构建脚本或使用 Tauri CLI / Build desktop installer
npm run tauri build
```

---

<a name="-disclaimer--免责声明"></a>
## ⚠️ Disclaimer / 免责声明

### 🇬🇧 English
1. **Personal Purpose**: This project was developed primarily for the author's personal workflow to create, modify, and debug game MODs.
2. **No Warranty / No Liability**: Although the software is tested, it is provided **"AS IS" WITHOUT WARRANTY OF ANY KIND**. The author shall not be held liable for any data loss, file corruption, game crashes, archive damage, or other damages arising from the use of this tool.
3. **Backup Recommendation**: **Always make backups of your original game files and MOD packages** before editing. If you do not trust the stability or safety of this tool, please refrain from using it.

### 🇨🇳 中文
1. **个人自用开发**：本项目主要为作者个人制作、修改与调试游戏 MOD 的工作流而开发。
2. **免责与风险自担**：尽管软件已经过测试与验证，但仍以 **"按现状"（AS IS）** 提供，不作任何明示或暗示的保证。作者**不对任何因使用本工具产生的文件损坏、数据丢失、游戏崩溃、存档异常或其他损失承担任何法律责任**。
3. **备份建议**：使用本软件修改任何文件前，**请务必自行备份原始游戏文件及 MOD 封包**。如果您对本软件的稳定性或安全性存有疑虑或不信任，请谨慎评估或停止使用。

---

## 🤝 Community & Support / 社区与支持

- **GitHub Issues**: Welcome to submit feedback & feature requests on [GitHub Issues](https://github.com/k-carbonatedtea/EventStudio/issues)
- **Discord**: `ylimhs_` or `carbonatedtea`
- **QQ Group / 交流**: `2875285430`

---

## 📄 License / 开源许可证

This project is licensed under the [GPL-2.0](LICENSE) License.
本项目基于 [GPL-2.0](LICENSE) 许可证开源发布。
