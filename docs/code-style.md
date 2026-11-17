# Atlas 通讯录 · 代码规范

> 这份文件是作业要求里的"代码规范链接"入口。具体的工具配置以仓库根目录的
> `.editorconfig`、`.prettierrc.json`、`eslint.config.js` 为准，这里只说我们两人约定俗成的东西。

## 1. 通用

- 文件用 **UTF-8**，换行 **LF**，末尾留一个空行。
- 缩进 **2 个空格**，不用 Tab。
- 一行尽量不超过 **100** 个字符，超了就换行，别硬撑。
- 文件名：React 组件 `PascalCase.tsx`，普通模块 `camelCase.ts`，脚本 `kebab-case`。
- `node_modules/`、`dist/`、`*.db`、`.env*`（`.env.example` 除外）、日志和本地缓存一律不进仓库。
- 密钥、AccessKey、SSH 私钥、服务器密码，任何时候都不写进代码或文档。

## 2. TypeScript / React

- 函数组件 + Hooks，不写 class 组件。
- 类型用 `interface` / `type` 显式声明；尽量避开 `any`，实在躲不开就写注释说明为什么。
- 领域逻辑放 `src/lib/`，保持**纯函数**，方便 Vitest 测；组件只管展示和交互。
- 网络请求统一走 `src/lib/api.ts`，组件里不直接 `fetch`。
- 状态更新用不可变写法（展开、`map`、`filter`），不改原数组/对象。
- 副作用进 `useEffect`，依赖数组写全；定时器、监听器要清理的必须 `return` 清理函数。
- 组件 props 必须有类型；能复用的逻辑抽成自定义 Hook 或 `lib/` 函数。
- 可访问性：按钮要有可读文本或 `aria-label`；星标用 `aria-pressed`；对话框支持 Esc 关闭。

## 3. 样式

- 颜色、圆角、阴影、间距一律用 `src/styles.css` 里的 CSS 变量，不手写魔法值。
- 类名语义化小写 + 中划线，比如 `.contact-card`、`.contact-card__star`。
- 移动端优先保证 375px 无横向滚动；断点统一写在样式文件顶部的注释里。
- 不引入新的 UI 框架或 CSS-in-JS；要加新依赖先跟对方打声招呼。

## 4. Python

- 遵循 **PEP 8**：4 空格缩进、函数/变量 `snake_case`、常量 `UPPER_CASE`。
- 只用标准库（后端刻意保持零第三方依赖，部署省事）。
- 数据库访问集中在 `server/app.py`；SQL 一律参数化查询，不拼接用户输入。
- 对外返回结构统一；报错信息给人看，不泄露堆栈和服务器路径。
- 测试用 `unittest`，文件名 `test_*.py`，每个测试用独立临时数据库，互不污染。

## 5. Git 提交规范

提交信息格式：

```text
<type>(<scope>): <一句话说明>
```

| type | 什么时候用 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修 bug |
| `test` | 测试 |
| `docs` | 文档 |
| `style` | 格式/样式（不改逻辑） |
| `refactor` | 重构（不改功能） |
| `chore` | 构建、配置、部署 |
| `ci` | CI 配置 |

例子（都是本项目真实用过的）：

```text
feat(contacts): 实现收藏、搜索与多联系方式
feat(excel): 实现 Excel 导入导出
test(ui): 覆盖领域逻辑、Excel 与页面交互
chore(deploy): 增加 Docker/Nginx 与阿里云部署
docs: 补充运行说明、分工、规范与截图
```

- 一次提交只做一件事；信息中文英文都行，但同一个仓库里保持统一，我们统一用英文 type + 中文说明的混搭。
- 不捎带与本次任务无关的格式化改动。
- 提交前跑一眼 `git diff --stat`，改动文件应该和任务卡对得上。

## 6. 分支与 PR

```text
main                 默认分支，只通过 PR 合并
feat/a-platform      A：工程配置 + API + 部署
feat/b-product       B：界面 + 收藏 + 多联系方式 + Excel + 文档
ci/verify            A：CI 流水线
```

- 分支名小写，中划线分隔。
- PR 标题跟提交信息一个格式；描述里贴上验收命令的输出。
- 作者不合并自己的 PR；合并一律 **Create a merge commit**，禁止 Squash。
- 合并前至少一人 review，重点看：有没有越界文件、能不能构建/测试、有没有把密钥交上去。

## 7. 本地检查命令

```bash
pnpm format:check     # Prettier 检查
pnpm lint             # ESLint
pnpm test             # Vitest（前端）
pnpm build            # tsc + vite build
python -m unittest server.test_app -v
```

提交前至少跑：

```bash
pnpm lint && pnpm test && pnpm build
```

## 8. 目录边界

| 目录 | 负责人 | 说明 |
|---|---|---|
| `src/` | B 程思扬 | React 前端、领域逻辑、Excel、前端测试 |
| `server/` | A 靳立一 | Python API、SQLite、后端测试 |
| `deploy/`、Docker/Nginx | A 靳立一 | 部署配置 |
| `docs/` | 共同（按文件） | 分工、规范、博客、PSP；部署文档归 A |
| 根配置 | A 靳立一 | `package.json`、`tsconfig*`、`vite.config.ts` 等 |

完整的文件归属和提交拆分见 [`team-division.md`](./team-division.md)。
