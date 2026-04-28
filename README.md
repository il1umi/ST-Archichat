# ST-Archichat（对话规则构筑扩展）

本扩展聚焦于 **对话规则构筑**：提供 noass（对话合并/压缩、clewd 正则处理、世界书提取与传递管线）与宏模块（roulette/cascade/flow）。

> 说明：原先 ST-Diff 内的「世界书对比」功能已拆分为独立扩展 **`ST-Diff`**（仅世界书对比）。本目录不包含世界书对比 UI/页面。

## 主要功能

- **noass（对话合并与规则处理）**
  - 对话合并/压缩（自定义角色映射、消息拼接）
  - clewd 正则处理（兼容 order-1/2/3 等阶段）
  - 世界书提取与传递（按深度/白名单包裹启用条目，按锚点注入并清理标记）
  - Dry-Run 与日志（可预览命中与迁移过程，辅助排错）
- **宏模块（roulette / cascade / flow）**
  - UI 配置宏组，并以“键名宏”形式注册到酒馆宏引擎
  - 支持导入/导出配置，便于备份与迁移

## 配置持久化（重要）

- **当前设置 key**：`st-archichat`
- **一次性迁移**：启动时若检测到旧的设置 key `st-diff`（历史遗留），会将其内容复制到 `st-archichat`（不删除旧 key）。
  - 这样做是为了不影响已拆分的新扩展 `ST-Diff` 继续使用 `st-diff`。

## 项目结构

```text
ST-Archichat/
├── index.js
├── manifest.json
├── modules/
│   ├── noass/
│   ├── macros/
│   └── presets/                 # 占位
└── presentation/
    ├── styles/
    ├── templates/
    └── docs/
```

## 安装与启用（概要）

将 `ST-Archichat/` 作为一个独立扩展目录放入酒馆扩展目录（例如 `scripts/extensions/third-party/`）后，在酒馆「扩展」面板启用即可。

> 若你计划通过 GitHub 链接安装，请确保仓库根目录就是一个扩展（包含 `manifest.json` 与 `index.js`），或为 `ST-Archichat` 单独建仓库。

## 致谢

感谢类脑 Discord 社区 tera 佬及折戟沉沙佬的 clewd 正则、jsrunner 代码及思路启发，对本扩展 noass 功能有重要贡献。

## 许可证

本项目采用 GNU AGPLv3 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

