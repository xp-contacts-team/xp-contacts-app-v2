# Atlas 通讯录 · EE308FZ 极限编程作业

> 把重要的人，放在触手可及的地方。

Atlas 是我们 EE308FZ《软件工程》极限编程作业做的通讯录 Web 应用。功能上主打三件事：**收藏联系人**、**一个联系人可以挂多条多种联系方式**、**Excel 导入导出**。联系人的真身存在阿里云 ECS 的 SQLite 数据库里，浏览器 localStorage 只当缓存用——服务器暂时连不上，也能从本地读出一份旧数据，不至于白屏。

- **在线仓库**：<https://github.com/xp-contacts-team/xp-contacts-app>
- **在线体验（阿里云 ECS）**：<http://120.55.102.189/>
- **所属组织**：xp-contacts-team
- **课程**：2601_FZU-MU_SE · 极限编程（通讯录应用）
- **技术栈**：React 19 + TypeScript + Vite 8 + SheetJS / Python 3.12 + SQLite
- **测试**：Vitest 34 个前端用例 + unittest 3 个后端用例
- **代码规范**：[docs/code-style.md](docs/code-style.md)
- **分工与提交方案**：[docs/team-division.md](docs/team-division.md)

![Atlas 通讯录 - 阿里云 ECS 部署](docs/screenshots/01-home.png)

## 功能清单

| 作业要求 | 实现情况 |
| --- | --- |
| 收藏联系人（25 分） | 卡片星标、详情页收藏按钮、侧边栏「我的收藏」独立视图、收藏数量与比例、收藏优先展示 |
| 多种联系方式（10 分） | 电话 / 邮箱 / 社交账号 / 地址四类，每类任意多条，每条可自定义标签（手机、工作、微信等） |
| Excel 导出（25 分） | 一个联系人一行；姓名、公司、职位、收藏、备注独立成列；每类联系方式都是「标签 + 内容」两列一组；可导出全部或仅收藏；附「填写说明」工作表 |
| Excel 导入（25 分） | 拖拽或选择 `.xlsx/.xls`；自动识别中英文表头；先预览、行级报错；智能合并 / 跳过重复 / 全部添加三种策略 |
| 响应式界面 | 桌面三栏、平板两栏、手机列表 + 全屏详情；`Ctrl/⌘ + K` 唤起搜索 |
| 测试 | 前端 34 个用例（领域逻辑、存储、Excel 往返、页面交互）；后端 3 个用例 |
| 数据库持久化 | SQLite 放在 Docker named volume 里，容器重启、重建都不丢联系人；localStorage 只是缓存 |
| 云部署（可选 +15） | 已部署到阿里云 ECS（华东1 杭州）：<http://120.55.102.189/>，Docker Compose + Nginx + Python API + SQLite |

## 快速开始

环境要求：Node.js ≥ 20（推荐 22/24）、pnpm ≥ 9（推荐 11）、Python ≥ 3.10。后端只用标准库，不用 pip 装任何东西。

```bash
git clone https://github.com/xp-contacts-team/xp-contacts-app.git
cd xp-contacts-app
pnpm install
```

后端一个终端，前端一个终端：

```bash
python server/app.py        # 终端 1，API 起在 8000
pnpm dev                    # 终端 2，默认 http://127.0.0.1:5173
```

Vite 会把 `/api` 代理到 `127.0.0.1:8000`，前端直接开页面就能用。

偷懒也可以一条命令起全部：

```bash
docker compose up -d --build
# 打开 http://127.0.0.1/
```

> 仓库在 `pnpm-workspace.yaml` 里写了 `nodeLinker: hoisted`，是为了兼容 Windows 下的 TypeScript / Vite / Vitest 工具链，pnpm 11+ 会自动生效，不用额外设置。

常用命令：

```bash
pnpm dev          # 本地开发
pnpm build        # 类型检查 + 生产构建（dist/）
pnpm preview      # 预览生产构建
pnpm test         # 跑全部测试
pnpm lint         # ESLint
pnpm format       # Prettier 格式化
```

## 使用说明

### 收藏联系人

卡片右上角的星标、详情页的「收藏」按钮都能切换收藏状态。侧边栏的「我的收藏」只放已收藏的人，并显示数量。收藏状态跟联系人一起存库，导出 Excel 时也会写进「收藏」列。

### 多种联系方式

新建 / 编辑联系人时，电话、邮箱、社交账号、地址四类可以各加多条。每条都是「标签 + 内容」的结构，比如：

- 电话：`手机 / 138 0013 8000`、`工作 / 010-8888 6666`
- 邮箱：`工作 / name@company.com`、`个人 / name@home.com`
- 社交：`微信 / wechat_id`、`LinkedIn / name`
- 地址：`公司 / 北京市海淀区…`、`家庭 / 杭州市西湖区…`

详情页里电话可以直接拨号、邮箱可以直接发信，所有内容都支持一键复制。

### Excel 导出

列表右上角「导出」，三选一：全部联系人、仅收藏、下载导入模板。

导出的文件有两个工作表：

1. `通讯录`：一个联系人一行，首行字段名，带列宽和自动筛选。
2. `填写说明`：导出时间、字段含义、导入方式。

表头顺序：

```text
姓名 | 公司 | 职位 | 收藏 | 备注 |
电话1标签 | 电话1号码 | 电话2标签 | 电话2号码 | … |
邮箱1标签 | 邮箱1地址 | … |
社交1标签 | 社交1账号 | … |
地址1标签 | 地址1详细地址 | …
```

每种联系方式的列数按实际最多的条数自动扩展（至少 2 组），收藏列写「是 / 否」。

### Excel 导入

侧边栏、列表工具栏、空状态都有「导入」入口：

1. 拖进去或者选一个 `.xlsx / .xls` 文件（最大 10 MB）。
2. 应用自动找表头，预览前 5 行，识别不了的行会标出来。
3. 选重复联系人的处理策略：
   - **智能合并**（推荐）：同名且至少有一个联系方式相同，就补充新联系方式、更新公司 / 职位 / 备注。
   - **跳过重复**：只导入通讯录里没有的人。
   - **全部添加**：不去重。
4. 确认导入，看新增 / 合并 / 跳过的统计。

能认的表头比较宽松：

- 中文：`姓名`、`公司`、`职位`、`收藏`、`备注`、`电话1标签`、`电话1号码`、`邮箱1地址`、`社交1账号`、`地址1详细地址`……
- 英文：`Name`、`Company`、`Job Title`、`Favorite`、`Notes`、`Phone`、`Email`、`Social`、`Address`……
- 简写也行：只有 `电话` / `手机` / `邮箱` 一列照样导，标签自动补成「手机 / 个人」。
- 认不出来的列直接忽略，导入界面会提示。

## 架构与模块边界

```text
src/                          # React 前端
├── App.tsx                   # 页面状态编排、API 同步、视图/弹窗
├── components/               # 展示与交互
│   ├── Sidebar.tsx           # 品牌、视图切换、数据操作入口
│   ├── ContactList.tsx       # 搜索后的列表、星标
│   ├── ContactDetail.tsx     # 联系人档案、联系方式分组、复制
│   ├── ContactForm.tsx       # 新建 / 编辑、多值联系方式编辑器
│   ├── ImportDialog.tsx      # 文件拖拽、解析预览、重复策略
│   ├── ExportMenu.tsx        # 导出全部 / 收藏 / 模板
│   ├── Modal.tsx             # 通用对话框（Esc、滚动锁定）
│   └── ...
├── lib/
│   ├── api.ts                # 调 /api/contacts，失败时回退本地缓存
│   ├── contacts.ts           # 纯函数领域逻辑：CRUD、搜索、排序、合并
│   ├── excel.ts              # SheetJS 导入解析 / 导出工作簿
│   ├── storage.ts            # localStorage 缓存、schema 校验
│   ├── format.ts             # 头像、姓名缩写、日期格式化
│   └── labels.ts             # 联系方式类型元数据
├── data/seed.ts              # 首次启动的 10 位示例联系人（前端兜底）
├── types.ts                  # Contact / ContactMethod / ContactInput
└── test/                     # 测试工厂与 setup

server/                       # Python 标准库后端
├── app.py                    # REST API + SQLite（零第三方依赖）
├── seed.json                 # 首次建库的 10 位示例联系人
├── test_app.py               # SQLite 仓储测试（3 个）
└── Dockerfile

docker-compose.yml            # api + web 两个容器
nginx.conf                    # 静态文件 + /api 反向代理
```

请求链路很简单：

```text
Browser -> Nginx :80 -> /            -> dist/ 静态文件
                     -> /api/*       -> Python API :8000 -> SQLite /data/atlas.db
```

几个设计上的取舍：

- **数据库为准，缓存为辅**：前端启动先从 `/api/contacts` 拉数据；服务器挂了才显示 localStorage 缓存，并提示"修改暂存在本机"。
- **自动同步**：联系人一变，400ms 防抖后把完整列表 `PUT /api/contacts` 写进 SQLite；失败会出重试条。
- **持久化卷**：SQLite 文件在 Docker named volume `atlas-contacts_atlas-data` 里，容器重启、重建都不丢。
- **领域逻辑和 UI 分开**：`lib/contacts.ts`、`lib/excel.ts` 都是纯函数，好测试。
- **导入先预览**：解析和写库是两步，确认之前不动通讯录。
- **可访问性**：按钮都有可读名称，星标用 `aria-pressed`，对话框支持 Esc 和焦点管理，手机上看详情能退回来。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查，返回联系人数量 |
| GET | `/api/contacts` | 获取全部联系人 |
| PUT | `/api/contacts` | 全量替换（前端同步用） |
| POST | `/api/contacts` | 新增/覆盖单个联系人 |
| PUT | `/api/contacts/{id}` | 更新单个联系人 |
| DELETE | `/api/contacts/{id}` | 删除联系人 |

## 测试

```text
src/lib/contacts.test.ts   11 个：创建、更新、收藏、搜索、排序、统计、合并策略
src/lib/excel.test.ts      10 个：导出表头、往返、模板、中文 / 英文表头、错误行、示例文件
src/lib/storage.test.ts     6 个：持久化、空通讯录、坏数据、schema 迁移
src/App.test.tsx            7 个：收藏视图、搜索、新建多电话、校验、删除
server/test_app.py          3 个：SQLite 种子、全量替换、删除、非法数据
```

跑法：

```bash
pnpm test
python -m unittest server.test_app -v
```

## 云部署（可选加分项）

已经部署到阿里云 ECS，直接能玩：

**<http://120.55.102.189/>**

- 平台：阿里云云服务器 ECS，华东1（杭州）
- 实例：`i-bp1gaq04aqbxqx3g4l8z`，2 核 2 GiB，Ubuntu 22.04
- 运行方式：Docker Compose 起 `api`（Python + SQLite）和 `web`（Nginx）两个容器
- 数据持久化：SQLite 在 Docker volume `atlas-contacts_atlas-data:/data/atlas.db`
- 安全组：`nas-sg`，入方向放行 22 / 80
- 验证过：首页 200；`/api/health` 返回 `{"status":"ok","contacts":10}`；重启 API 容器后联系人还在（当时测完是 11 条，清掉测试数据恢复 10）
- API 健康检查：<http://120.55.102.189/api/health>

仓库里带了这些东西：

- `docker-compose.yml`：API + Nginx 两个服务，命名卷持久化 SQLite。
- `Dockerfile` / `Dockerfile.runtime` + `nginx.conf`：静态站点和 API 反代。
- `docs/deployment-aliyun.md`：阿里云 OSS / ECS / FC 三种部署方式的完整步骤。
- `scripts/deploy_ecs.ps1` + `scripts/ecs_bootstrap.sh`：ECS 一键部署脚本。

```bash
docker compose up -d --build
# 浏览器访问 http://<服务器公网IP>/
```

> 部署细节都写在 `docs/deployment-aliyun.md`，这里不重复。

## 项目文档

- [两人分工与 GitHub 提交方案](docs/team-division.md)
- [代码规范](docs/code-style.md)
- [阿里云部署指南](docs/deployment-aliyun.md)
- [运行截图](docs/screenshots)
- [Excel 示例导入文件](docs/screenshots)

> 博客正文和 PSP 是发在 CSDN 上的，不进仓库；仓库里只保留运行、部署、分工、规范这几类文档。

## 团队

| 角色 | 姓名 | GitHub | 主要职责 |
| --- | --- | --- | --- |
| 成员 A | 靳立一 | [@Lucas-JIN-cloud](https://github.com/Lucas-JIN-cloud) | 工程配置、领域模型（收藏/搜索/合并）、Python API、SQLite、Docker/Nginx、云部署、CI |
| 成员 B | 程思扬 | 待补充 | React 界面与样式、多联系方式表单/详情、Excel 导入导出、前端测试、视频/截图/博客 |

两人是结对完成的，工作按五五开划分，**贡献比例各 50%**。详细的分工、提交拆分和合并流程见 [docs/team-division.md](docs/team-division.md)。

## License

MIT
