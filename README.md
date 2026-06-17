# ST-Archichat（对话规则构筑扩展）

插件功能主要在于对话规则构筑，在提示词发送给模型之前完成合并、改写与按需激活：

- **noass**：对话合并/压缩、clewd正则处理、世界书提取与传递
- **宏模块**：roulette / cascade / flow 三类可配置宏
- **预设关键词触发**：为预设条目添加按关键词的条件激活

> **说明**：原先扩展内的世界书对比功能已迁移为独立扩展 **ST-Diff**（仅世界书对比），本扩展不再包含世界书对比的功能与页面。

## 主要功能

### noass（对话合并与规则处理）

- **对话合并/压缩**：自定义角色前缀映射（Human/Assistant/SYSTEM 等），将连续消息合并为单条消息发送；支持 `single_user` 模式与 prefill 注入
- **clewd 正则处理**：兼容 order-1/2/3 阶段的 `<regex>` 指令、system 前缀重写、相邻角色合并、`@` 区块重定位等
- **内容捕获与回填**：按正则规则捕获消息内容存入 `stored_data`（支持叠加/替换模式与范围筛选），以占位标签在提示词中回填
- **世界书提取与传递**：按深度/白名单包裹运行时已激活的世界书条目，按锚点（before/after/header/memory/custom）重新注入并清理标记
- **保留消息**：含 `<|no-trans|>` 标记的消息与多模态消息不参与合并，原样保留
- **Dry-Run 与日志**：可预览世界书命中与迁移过程，辅助排错

### 宏模块（roulette / cascade / flow）

- **roulette**：加权随机宏，如 `{{roulette:金币|3::银币|1}}`
- **cascade**：瀑布式多行宏，按范围随机行数、支持权重、行前缀自动编号
- **flow**：顺序流式展开，支持防重复与输出上限
- UI 配置宏组，以「键名宏」形式（如 `{{roulette_<组ID>}}`）注册到酒馆宏引擎
- 支持导入/导出配置，便于备份与迁移
- 详细用法见扩展内置文档（`presentation/docs/macros.md`）

### 预设条目关键词触发（presets）

- 为预设（Prompt Manager）中的条目配置触发关键词：仅当扫描文本命中关键词时，该条目才会被包含进本次提示词
- 未配置关键词的条目照常工作，并作为关键词扫描的文本来源
- 支持大小写敏感与全词匹配选项
- 配置随预设条目一同保存，导出预设时自动携带

## 项目结构

```text
ST-Archichat/
├── index.js
├── manifest.json
├── modules/
│   ├── noass/                   # 对话合并、clewd 处理、世界书提取与传递
│   ├── macros/                  # roulette / cascade / flow 宏
│   └── presets/                 # 预设条目关键词触发
├── presentation/
│   ├── styles/
│   ├── templates/
│   └── docs/                    # 内置用户文档（宏使用说明等）
└── tests/                       # 测试
```

## 安装与启用

将 `ST-Archichat/` 作为一个独立扩展目录放入酒馆扩展目录（例如 `scripts/extensions/third-party/`）后，在酒馆「扩展」面板启用即可。

> 通过GitHub链接 https://github.com/il1umi/ST-Archichat.git 安装，请确保仓库根目录就是一个扩展（包含 `manifest.json` 与 `index.js`），或为 `ST-Archichat` 单独建仓库。

## 致谢

感谢类脑Discord社区tera佬及折戟沉沙佬的clewd正则、jsrunner代码及思路启发，对本扩展noass功能有极其重要的贡献。

## 许可证

GNU AGPLv3
