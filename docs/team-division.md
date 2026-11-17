# Atlas 通讯录 · 两人分工与 GitHub 提交方案

> 关联：`assignment.md`（截止 **2026-11-17 23:59:59**）
> 项目：React 19 + TypeScript + Vite / Python 3.12 + SQLite / Docker + Nginx
> 成员 A：靳立一（[@Lucas-JIN-cloud](https://github.com/Lucas-JIN-cloud)） · 成员 B：程思扬

---

## 0. 先说结论

**不要各自 fork 两个仓库。** 建一个两人共用的 public 仓库，按文件边界把已完成的代码拆开交：

- **A（靳立一，平台与领域线）**：工程配置、领域模型（收藏/搜索/合并）、Python API、SQLite、Docker/Nginx、部署、CI —— **7 次提交**
- **B（程思扬，界面与数据交换线）**：React 页面、多联系方式、Excel 导入导出、前端测试、文档与交付 —— **5 次提交**

两人在各自的电脑上配置**本人的** GitHub 提交身份。A 先把 A0–A2（初始化 + 工程 + 领域模型）推到 `main` 当共同基线；然后 A3–A5 走 `feat/a-platform`、B1–B5 走 `feat/b-product`，两条分支各交各的、互不依赖；最后按 A → B → CI 的顺序合回 `main`，由对方 review 后点 **Create a merge commit**（千万别用 Squash），打完 `v1.0.0` 标签发 Release。总共 12 次提交，两人各 5 次以上，满足"提交次数 ≥ 3"和"每位贡献者提交次数统计"的要求。

还有一句要提前说的：这些文档最后是要给老师看的，提交前请通读一遍，把机器腔、模板腔改掉，写得像两个人真的坐下来做过这个项目一样。博客也是一样。

---

## 1. 仓库核查结果（2026-11-16 20:45）

| 项目 | 结果 |
|---|---|
| 压缩包 | `xp-contacts-app-github.zip`，67 个文件，`MANIFEST.sha256` 全部校验通过 |
| 解压位置 | `C:\Users\Lenovo\Documents\GitHub\project2` |
| Git 仓库 | **尚未初始化**（没有 `.git`） |
| 这台电脑的 Git 身份 | `fu-yi-hang <3266389474@qq.com>`；另一台电脑必须配置**另一人本人**的姓名/邮箱，两台电脑不要共用身份 |
| 后端测试 | `python -m unittest server.test_app -v` → 3 个用例全过 |
| 前端验证 | `pnpm test` → 34/34 通过；`pnpm build` 成功；`pnpm lint` 退出码 0（21:02 复验） |
| 线上部署 | `http://120.55.102.189/` 返回 HTTP 200，就是当前 Atlas 页面 |
| 不能进仓库的打包元数据 | `xp-contacts-app-github.zip`、`MANIFEST.sha256`、`EXPORT_INFO.txt`、`GIT_UPLOAD_GUIDE.md`，别 `git add` |

---

## 2. 分工原则

1. **按文件边界切，不空泛地按"前端归谁、后端归谁"切**：同一个文件只能有一个 owner，避免两边同时改一份文件。
2. **一人一台电脑、一条分支**：`feat/a-platform`、`feat/b-product`，最后补一条 `ci/verify`；两台电脑各登录各的 GitHub 账号。
3. **每台电脑只配置本人身份**：`user.name`、`user.email` 必须是本人的，另一台电脑配另一个人，不要共用。
4. **交叉 review**：A 审 B 的 PR，B 审 A 的 PR；作者不合并自己的 PR。
5. **合并必须保留提交历史**：用 *Create a merge commit*。Squash 会把多条提交压成一条，作者变成点合并的人，贡献统计直接失真。
6. **最终 `main` 必须能构建、能测试**：中间提交不要求单独能跑，但每个 PR 合并前跑一次全量检查。
7. **B 必须有一个能构建的起点**：A 先把 A0–A2 推到 `main`，A、B 都从 `main` 拉自己的分支。这样两条分支都能独立 `pnpm install / build / test`。

---

## 3. 文件归属（按实际目录）

### A（靳立一）—— 平台与领域线

| 范围 | 文件 |
|---|---|
| 工程配置 | `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`tsconfig.json`、`tsconfig.app.json`、`tsconfig.node.json`、`vite.config.ts`、`index.html`、`eslint.config.js`、`.prettierrc.json`、`.prettierignore`、`.editorconfig`、`.gitignore`、`public/`、`LICENSE` |
| 领域模型 | `src/types.ts`、`src/lib/contacts.ts`、`src/lib/storage.ts`、`src/lib/api.ts`、`src/lib/format.ts`、`src/lib/labels.ts`、`src/lib/id.ts`、`src/data/seed.ts` |
| 后端 | `server/app.py`、`server/seed.json`、`server/__init__.py`、`server/test_app.py` |
| 容器与部署 | `Dockerfile`、`Dockerfile.runtime`、`docker-compose.yml`、`nginx.conf`、`server/Dockerfile`、`.dockerignore`、`.env.aliyun.example`、`deploy/`、`scripts/deploy_ecs.ps1`、`scripts/deploy_oss.py`、`scripts/ecs_bootstrap.sh` |
| CI | `.github/workflows/ci.yml` |

### B（程思扬）—— 界面与数据交换线

| 范围 | 文件 |
|---|---|
| 页面与组件 | `src/main.tsx`、`src/App.tsx`、`src/styles.css`、`src/vite-env.d.ts`、`src/components/` 全部 |
| Excel | `src/lib/excel.ts`、`src/components/ImportDialog.tsx`、`ExportMenu.tsx`、`docs/fixtures/`、`scripts/make-import-fixture.py` |
| 前端测试 | `src/lib/contacts.test.ts`、`src/lib/storage.test.ts`、`src/lib/excel.test.ts`、`src/App.test.tsx`、`src/test/` |
| 文档与交付 | `README.md`、`docs/deployment-aliyun.md`（A 编写，随 B5 提交）、`docs/screenshots/`、`scripts/capture-screenshots.mjs`、`docs/team-division.md`、`docs/code-style.md`、`assignment.md`、`分工协作.md` |

### 不属于任何人的提交

`xp-contacts-app-github.zip`、`MANIFEST.sha256`、`EXPORT_INFO.txt`、`GIT_UPLOAD_GUIDE.md` 是打包导出的元数据，**不要 `git add`**。`.env.aliyun`、`node_modules/`、`dist/`、`server/*.db` 已经被 `.gitignore` 盖住，不用管。

---

## 4. 提交拆分（12 次，A 7 + B 5）

提交图（按实际执行顺序）：

```text
main ── A0 ── A1 ── A2 ─────────────● PR #1(A3–A5) ──● PR #2(B1–B5) ──● PR #3(CI) / v1.0.0
         ├─ feat/a-platform: A3 ─ A4 ─ A5
         └─ feat/b-product:  B1 ─ B2 ─ B3 ─ B4 ─ B5
```

A0–A2 先落在 `main` 当共同基线；A3–A5 和 B1–B5 分别从 `main` 拉出来，两条分支互相不包含对方的提交。最后先合 A 再合 B；B 在开 PR 前把 `main` 合进自己的分支就行。A6（CI）最后合。

| # | 分支 | 作者 | 提交信息 | 包含文件 | 验收 |
|---|---|---|---|---|---|
| A0 | `main` | A 靳立一 | `chore: 初始化仓库与许可` | `.gitignore`、`.gitattributes`、`LICENSE` | `git log` 能看到首个提交 |
| A1 | `main` | A 靳立一 | `chore: 搭建 React + TypeScript + Vite 工程` | 工程配置文件、`index.html`、`public/` | `pnpm install` 成功 |
| A2 | `main` | A 靳立一 | `feat(domain): 实现联系人模型、收藏、搜索与本地缓存` | `src/types.ts`、`src/lib/{contacts,storage,api,format,labels,id}.ts`、`src/data/seed.ts` | 收藏/搜索/合并的单元测试可在 B4 复跑 |
| A3 | `feat/a-platform` | A 靳立一 | `feat(api): 实现 SQLite 通讯录 REST API` | `server/app.py`、`server/seed.json`、`server/__init__.py` | `python server/app.py` 后 `/api/health` 返回 200 |
| A4 | `feat/a-platform` | A 靳立一 | `test(api): 覆盖仓储校验与种子数据` | `server/test_app.py` | 3 个后端用例通过 |
| A5 | `feat/a-platform` | A 靳立一 | `chore(deploy): 增加 Docker/Nginx 与阿里云部署` | Docker/Nginx/部署脚本（部署 md 放 B5） | `docker compose config` 通过；公网 URL 200 |
| B1 | `feat/b-product` | B 程思扬 | `feat(ui): 搭建响应式通讯录界面与收藏视图` | `App.tsx`、`main.tsx`、`styles.css`、列表/侧边栏/弹窗组件 | `pnpm dev` 页面可用；星标与收藏视图正常 |
| B2 | `feat/b-product` | B 程思扬 | `feat(contacts): 实现多联系方式表单与详情展示` | `ContactForm.tsx`、`ContactDetail.tsx` | 可加多条不同类型；详情按类型分组 |
| B3 | `feat/b-product` | B 程思扬 | `feat(excel): 实现 Excel 导入导出` | `excel.ts`、导入/导出对话框、样例文件 | 导出后一人一行、每类一列；回灌成功 |
| B4 | `feat/b-product` | B 程思扬 | `test(ui): 覆盖领域逻辑、Excel 与页面交互` | 前端测试 | `pnpm test` 全绿 |
| B5 | `feat/b-product` | B 程思扬 | `docs: add project documentation` | `README.md`、项目文档、截图（不含博客/PSP） | 链接可点；项目文档已入库 |
| A6 | `ci/verify` | A 靳立一 | `ci: 增加 lint/test/build 流水线` | `.github/workflows/ci.yml` | GitHub Actions 绿 |

几点说明：

- **为什么 A 7 次、B 5 次**：A0 是仓库初始化，A 还多了领域模型、后端、部署、CI 四条线；B 的 5 次覆盖了全部界面、Excel 和测试/文档。两人都 ≥ 5 次，统计好看，也是真实发生的工作量。
- **项目文档统一放 B5**：`README.md`、`assignment.md`、`分工协作.md`、`docs/deployment-aliyun.md`、`docs/team-division.md`、`docs/code-style.md`。A5 只交 Docker/Nginx/部署脚本，不要再把部署文档重复 add 进去。
- **博客正文、PSP、博客模板不进 GitHub**：它们发在 CSDN；本地审核副本在 `release/blog-docs/`。B5 只交项目运行/部署/分工/规范文档。
- 每次提交的代码/文档已经按提交打成 zip 放在 `release/commits/`（A0–A6、B1–B5 共 12 个），文件名就是提交名；`release/` 在 `.gitignore` 里，只作本地交接核对用。

---

## 5. 两台电脑：各自配置本人的 GitHub 身份

GitHub 是按 commit 的 **author email** 归属贡献的，不看电脑、不看谁 push。两台电脑反而省事：一台机器对应一个人，不用在同一台机器上切来切去。

1. 用本人的 **GitHub 已验证邮箱**，或者 noreply 邮箱；
2. 每台电脑的 `user.name` / `user.email` 只配置本人；
3. 每台电脑用本人的 GitHub 账号登录 / SSH key 推送；
4. 两台电脑不共用账号，也不共用 Personal Access Token。

### 5.1 取 noreply 邮箱

GitHub → **Settings → Emails → Keep my email addresses private**，会显示：

```text
12345678+github-username@users.noreply.github.com
```

前面的数字是 GitHub 用户 ID，必须带上，不要自己拼。也可以直接用账号主邮箱。

### 5.2 每台电脑配置本人身份（只做一次）

**A 的电脑（靳立一）：**

```powershell
git config --global user.name  "靳立一"
git config --global user.email "靳立一的noreply邮箱"
git var GIT_AUTHOR_IDENT          # 应显示靳立一的名字/邮箱
```

**B 的电脑（程思扬）：**

```powershell
git config --global user.name  "程思扬"
git config --global user.email "程思扬的noreply邮箱"
git var GIT_AUTHOR_IDENT          # 应显示程思扬的名字/邮箱
```

每次 commit 后顺手查一下：

```powershell
git log -1 --format="%h  author=%an <%ae>  committer=%cn <%ce>  %s"
```

author 和 committer 都该是本人。如果只有 author 对、committer 是别人，说明这台机器的 Git 身份配错了。

> 两台电脑不要共用同一套 `--global` 配置。如果某台电脑以前配过队友的身份，先 `git config --global user.name/user.email` 改成本人。

### 5.3 每台电脑的 GitHub 认证

**HTTPS（推荐，最省事）：**

第一次 `git push` 时 Git Credential Manager 会弹窗，登录本人账号就行。如果这台电脑以前登录过别人的账号，先清掉旧凭据：

```powershell
cmdkey /delete:git:https://github.com
```

再 push，重新用本人账号登录。

**SSH（可选）：**

每台电脑生成自己的 key，公钥加到本人 GitHub → Settings → SSH and GPG keys：

```powershell
ssh-keygen -t ed25519 -C "本人的GitHub邮箱"
Get-Content "$HOME\.ssh\id_ed25519.pub" | Set-Clipboard
ssh -T git@github.com      # 应显示 Hi 本人username!
```

不需要 `github-a` / `github-b` 两个 Host，也不需要 `push-a` / `push-b` remote。两台电脑各用各的账号，天然隔离。

### 5.4 remote 与推送

每台电脑只加一个 `origin`：

```powershell
git remote add origin https://github.com/<org>/<repo>.git
# 或者 SSH：git@github.com:<org>/<repo>.git
```

- A 的电脑推：`main`、`feat/a-platform`、`ci/verify`
- B 的电脑推：`feat/b-product`
- 拉取统一 `git pull origin main`

---

## 6. 建仓、提交、PR、Release 的完整顺序

### 6.1 建仓库

1. 在 GitHub 新建 **public** 仓库（建议组织 `xp-contacts-team`，或者队长账号）。
2. **Settings → Collaborators → Add people**，把队友加成 **Write**。
3. 不要让两人各自 fork 再互提 PR：提交历史会被拆到两个仓库，贡献者统计不完整。
4. 如果课程要求先 Fork 课程模板，**只由队长 Fork 一次**，再把队友加成 collaborator；之后都往这一个仓库交。

### 6.2 A 的电脑：初始化 + A0 + 推 main

在 A 的电脑上，项目根目录（`C:\Users\Lenovo\Documents\GitHub\project2`）：

```powershell
git init -b main

git config user.name  "靳立一"
git config user.email "靳立一的noreply邮箱"

git add .gitignore .gitattributes LICENSE
git commit -m "chore: 初始化仓库与许可"

git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main
```

> GitHub 建仓库时如果勾了 README，先 `git pull --rebase origin main` 再推，避免 non-fast-forward。

### 6.3 A 的电脑：A1–A2 直接推 main 当共同基线

```powershell
# 仍在 main 分支
# A1 工程配置
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html eslint.config.js .prettierrc.json .prettierignore .editorconfig public
git commit -m "chore: 搭建 React + TypeScript + Vite 工程"

# A2 领域模型与本地存储
git add src/types.ts src/lib/contacts.ts src/lib/storage.ts src/lib/api.ts src/lib/format.ts src/lib/labels.ts src/lib/id.ts src/data/seed.ts
git commit -m "feat(domain): 实现联系人模型、收藏、搜索与本地缓存"

git push origin main
```

A1/A2 直接落在 `main`，作为两条功能分支的共同基线。B 的界面依赖 `package.json`、`src/types.ts`、`src/lib/*`；没有这两个提交，B 的分支连 `pnpm install` 都过不了。

如果 `main` 开了分支保护，就把 A1/A2 交到 `chore/base` 开个 base PR 让 B 先合，再从最新 `main` 拉功能分支；没保护就直接推。

这时候 A 的工作区里还有 B 的文件和没提交的 A3–A5，`git status` 会列出一大堆未跟踪文件，正常；**只 add 本文列出的文件，不要 `git add -A`**。

### 6.4 B 的电脑：从 main 拉 B 分支

A 推完 A1–A2 后，B 在自己电脑上操作。前提：

- B 的电脑上有完整项目文件（拷 `xp-contacts-app-github.zip` 过去解压，或从共享盘复制）；
- 装好 Node.js ≥ 20、pnpm 11、Python ≥ 3.10。

先 clone 含基线的 `main`，再把完整源码覆盖进工作区：

```powershell
git clone https://github.com/<org>/<repo>.git
cd <repo>

git config user.name  "程思扬"
git config user.email "程思扬的noreply邮箱"

git fetch origin
git checkout -b feat/b-product origin/main

# 把完整项目文件复制/解压到当前目录，覆盖同名文件
# 确认基线在（两个都应输出 True）
Test-Path package.json
Test-Path src\types.ts
```

clone 下来只包含 A0–A2 的基线；`src/components/`、`src/lib/excel.ts` 这些 B 的文件要靠压缩包覆盖进来。覆盖后 `git status` 会看到 A3–A5、部署文件等未跟踪文件，正常，**不要 `git add -A`**，只 add 下面列出的 B 文件。

然后交 B1–B5：

```powershell
# B1 页面骨架与收藏视图
git add src/main.tsx src/App.tsx src/styles.css src/vite-env.d.ts src/components/Sidebar.tsx src/components/ContactList.tsx src/components/Modal.tsx src/components/ConfirmDialog.tsx src/components/Toast.tsx src/components/Avatar.tsx
git commit -m "feat(ui): 搭建响应式通讯录界面与收藏视图"

# B2 多联系方式表单与详情
git add src/components/ContactForm.tsx src/components/ContactDetail.tsx
git commit -m "feat(contacts): 实现多联系方式表单与详情展示"

# B3 Excel
git add src/lib/excel.ts src/components/ImportDialog.tsx src/components/ExportMenu.tsx docs/fixtures scripts/make-import-fixture.py
git commit -m "feat(excel): 实现 Excel 导入导出"

# B4 测试
git add src/lib/contacts.test.ts src/lib/storage.test.ts src/lib/excel.test.ts src/App.test.tsx src/test
git commit -m "test(ui): 覆盖领域逻辑、Excel 与页面交互"

# B5 项目文档（博客/PSP 不提交）
git add README.md docs/screenshots docs/deployment-aliyun.md docs/team-division.md docs/code-style.md assignment.md 分工协作.md scripts/capture-screenshots.mjs
git commit -m "docs: add project documentation"

git push -u origin feat/b-product
```

B 的分支从 `main` 拉出，包含 A0–A2 基线，不含 A3–A5，这是正常的，B 可以独立 `pnpm test / build`。A3–A5 合进 `main` 之后，B 再 `git merge origin/main` 就行。

先把 B 分支推上去备份，**PR #2 等 A 合并后再开**，这样 main 合并后一次就能构建通过。

### 6.5 A 的电脑：从 main 拉 A 分支，做 A3–A5

```powershell
git checkout main
git pull origin main
git checkout -b feat/a-platform

# A3 Python API
git add server/app.py server/seed.json server/__init__.py
git commit -m "feat(api): 实现 SQLite 通讯录 REST API"

# A4 后端测试
git add server/test_app.py
git commit -m "test(api): 覆盖仓储校验与种子数据"

# A5 部署（部署 md 统一放 B5）
git add Dockerfile Dockerfile.runtime docker-compose.yml nginx.conf server/Dockerfile .dockerignore .env.aliyun.example deploy scripts/deploy_ecs.ps1 scripts/deploy_oss.py scripts/ecs_bootstrap.sh
git commit -m "chore(deploy): 增加 Docker/Nginx 与阿里云部署"

git push -u origin feat/a-platform
```

A 和 B 并行，A 不需要 B 的界面文件，A3–A5 里也不该出现 B1–B5 的提交。

### 6.6 合并 PR #1 / #2

1. A 开 **PR #1：`feat/a-platform` → `main`**，描述里贴：
   - 改动范围（API / SQLite / Docker / 部署）
   - `python -m unittest server.test_app -v`、`docker compose config` 的输出
   - 线上地址 `http://120.55.102.189/` 的截图

   由 **B（程思扬）review 并 merge**（Create a merge commit）。

   > PR #1 合并后 `main` 还没有 `src/main.tsx`，`pnpm build` 会挂，正常。CI 故意放到最后的 A6，等 PR #2 合并后再加，免得 PR #1 亮红灯。

2. A 合并后，B 把最新 `main` 合进自己的分支：

   ```powershell
   git fetch origin
   git checkout feat/b-product
   git merge origin/main
   # 文件不重叠，正常无冲突；真有冲突当场解决
   git push origin feat/b-product
   ```

3. B 开 **PR #2：`feat/b-product` → `main`**，描述里贴：
   - `pnpm test`、`pnpm build`、`pnpm lint` 的输出
   - 收藏/多联系方式/Excel 导入导出的截图或短视频
   - 注明"本 PR 只改 `src/` 与文档，未动 `server/`"

   由 **A（靳立一）review 并 merge**。

先合 A 是为了让 PR #2 合完后的 `main` 一次就能构建通过；B 的 PR 里只会有 B 自己的提交，不会出现 A 的 commit。PR #2 合完后，`main` 才是完整应用，随便哪台电脑跑一次 `pnpm test && pnpm build` 确认。

### 6.7 PR #3：CI 收尾

```powershell
git checkout main
git pull origin main
git checkout -b ci/verify

git add .github/workflows/ci.yml
git commit -m "ci: 增加 lint/test/build 流水线"
git push -u origin ci/verify
```

开 **PR #3：`ci/verify` → `main`**。这时 `main` 代码齐了，CI 应该绿。由 **B review 并 merge**。

### 6.8 打版本

```powershell
git checkout main
git pull origin main

git tag -a v1.0.0 -m "Atlas 通讯录 v1.0.0：收藏、多联系方式、Excel 导入导出、云部署"
git push origin v1.0.0
```

GitHub → **Releases → Draft a new release** → 选 `v1.0.0`，标题 `Atlas 通讯录 v1.0.0`，正文写功能清单 + 线上地址 + 构建/测试结果。

### 6.9 合并后的身份核对

```powershell
git shortlog -sne --all
git log --format="%an <%ae>" | Sort-Object | Group-Object | Select-Object Count,Name
git rev-list --count HEAD
git log --oneline --graph --all -20
```

期望看到两个人名（靳立一、程思扬）、两个邮箱、A ≥ 7 次、B ≥ 5 次、总数 ≥ 12。截图存到 `docs/screenshots/`，博客要用。

GitHub 的 merge commit 也是提交，作者是点合并的人。3 个 PR 合并后，再加上 B 在 PR #2 前 `git merge origin/main` 的那次合并，`git shortlog` 会比 12 多 2–3 条（B 一般多 2 条、A 多 1 条），正常。博客里写"提交次数"就按最终 `git shortlog -sne --all` 的实际数字来，别硬写 12。

截图在 B5 里已经带了；运行视频传到 B 站/网盘后把链接写进 CSDN 博客即可，不再为此新增仓库提交，保持 B5 是最后一个含 md 的提交。

---

## 7. 合并规则（最容易翻车的地方）

| 规则 | 说明 |
|---|---|
| 只允许 **Create a merge commit** | Squash 会把多条提交压成 1 条，作者变成合并人，贡献统计失真 |
| 作者不合并自己的 PR | A 的 PR 由 B 点合并，B 的 PR 由 A 点合并 |
| 每个 PR 至少 1 条 review | 重点看三件事：有没有越界文件、能不能构建/测试、提交信息规不规范 |
| 合并顺序 | PR #1（A）→ PR #2（B）→ PR #3（CI）；不要并行合并 |
| B 的分支落后 | 开 PR #2 前 `git merge origin/main`，不要 `rebase` 已推送的共享分支 |
| 合并后 | 立刻 `git pull origin main`，再拉下一条分支 |

---

## 8. 最终验收命令

```powershell
# 提交统计（博客截图用）
git shortlog -sne --all
git log --format="%an <%ae>" | Sort-Object | Group-Object | Select-Object Count,Name
git rev-list --count HEAD

# 构建与测试
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
python -m unittest server.test_app -v

# 部署
curl.exe -I http://120.55.102.189/
curl.exe http://120.55.102.189/api/health
```

最终 `main` 必须四项全绿：**lint / test / build / 后端测试**。CI 绿的话本地也再跑一遍，博客里贴 CI 截图和本地输出。

---

## 9. 对照作业要求的缺口清单

| 要求 | 当前状态 | 还需要做什么 | 负责人 | 建议截止 |
|---|---|---|---|---|
| 公共 GitHub 仓库 | 未建 | 建 public 仓库，加 collaborator | A 靳立一 | 11-16 21:30 |
| 提交次数 ≥ 3 | 0 | 按本文做 12 次 | 共同 | 11-17 12:00 |
| 每位贡献者统计 | 两台电脑需各配本人身份 | 各自 `git config` + 按第 5 节核对 | 共同 | 11-17 12:00 |
| 发起 Pull Request | 无 | 3 个 PR，交叉 review | 共同 | 11-17 15:00 |
| 发布版本 | 无 | `v1.0.0` + Release | A 靳立一 | 11-17 16:00 |
| 代码规范链接 | 已补 `docs/code-style.md` | 博客/README 引用 | B 程思扬 | 11-16 22:00 |
| 博客 Markdown | 模板在 `release/blog-docs/docs/blog-outline.md`（不推 GitHub） | 两人各写/各发一份到 CSDN | 共同 | **11-17 19:00 发布** |
| 提交历史截图 | 无 | `git shortlog` + GitHub Contributors 截图 | A 靳立一 | 11-17 15:30 |
| 功能实现思路 | 模板已写 | 收藏/多联系方式/Excel/部署四段按实际补 | A+B | 11-17 18:00 |
| 程序截图 | 已生成 7 张 + Excel 导出样例（`docs/screenshots/`） | 写进博客，检查截图里没有密钥/隐私 | B 程思扬 | 11-17 18:00 |
| 完整运行视频 | 无 | 3–5 分钟，按博客模板里的脚本录 | B 程思扬 | 11-17 17:30 |
| 成员分工 | 本文 | 博客引用本文 | 共同 | 11-17 18:00 |
| 贡献比例合计 100 | 已定 | 两人各 50%，见第 10 节 | 共同 | 11-17 19:00 |
| 困难与解决 | 无 | 写 3–5 条真实发生的 | 共同 | 11-17 18:00 |
| PSP 表（每人一张） | 模板在 `release/blog-docs/docs/psp/`（不推 GitHub） | 按实际工时填，贴进 CSDN 博客 | 各自 | 11-17 19:00 |
| 开头作业信息表 | 模板已写 | 放进博客开头 | B 程思扬 | 11-17 18:00 |
| 两人各自提交博客 | 无 | 两个 CSDN 账号各发一份 | 共同 | 11-17 19:00 |
| 构建通过 | 待验证 | `pnpm build` | A 靳立一 | 11-17 15:00 |
| 云部署 | 已 200 | 保持可访问，手机 4G 再验一次 | A 靳立一 | 11-17 16:00 |
| 无密钥/无数据库 | 已检查 | 提交前再扫一遍关键字 | A 靳立一 | 11-17 16:00 |

---

## 10. 贡献比例（合计 100）

填 **50 / 50**，靳立一、程思扬各一半。

理由很简单：这个项目是两个人结对赶出来的——A 写的后端、领域模型和部署，B 写的前端、Excel 和文档测试，谁也离不开谁。按提交条数拆比例既费劲又显得计较，五五开最诚实，加起来正好 100。

---

## 11. 时间安排

这份时间表是 11-16 晚上排的（按当时还剩约 26 小时估算）。**现在已经 11-17 下午，截止今晚 23:59**——先对照下面打勾，看哪些已经完成，剩下的按优先级往后压：git 提交和 PR 必须最先做完（这是硬指标），博客和视频尽早发（CSDN 审核要时间），截图、PSP 往后排。

```text
11-16 21:00  A 电脑：建仓、配 A 身份、A0 推 main
11-16 21:30  A 电脑：A1-A2 推 main（共同基线）
11-16 22:00  A 拉 feat/a-platform；B 电脑 clone main、配 B 身份、拉 feat/b-product
11-16 24:00  A3-A5 与 B1-B5 两条分支并行、各自 push
11-17 09:00  A 完成 A3-A5；B 完成 B1-B5
11-17 12:00  PR #1 合并；B git merge origin/main 后开 PR #2
11-17 14:00  PR #2 合并；PR #3（CI）合并，main 全量 lint/test/build
11-17 15:00  打 v1.0.0、发 Release、截提交统计图
11-17 16:30  补截图、跑公网冒烟
11-17 17:30  录 3–5 分钟视频
11-17 19:00  两人各自发布博客（必须提前，审核要时间）
11-17 21:00  PSP、贡献比例、自查表、提交任务
11-17 23:59  截止（预留缓冲）
```

---

## 12. 最后提醒

- **不要**用 GitHub 网页 "Upload files" 传整包：作者归属会错，diff 没法看。
- **不要** `git add -A`：容易把对方的文件、`node_modules`、数据库一起交上去。
- **不要**两台电脑共用同一个 GitHub 账号、PAT 或 SSH key；每台机器只登录本人。
- **不要**让 B 从空的 `main` 直接开工：先等 A 把 A0–A2 推上去。
- **不要**伪造提交日期或作者；提交时间就是现在，作业只看次数和内容。
- **不要**把 `.env.aliyun`、AccessKey、SSH 私钥、`*.db` 提交进仓库。
- 提交前把 `assignment.md` 最后的自查表逐项打勾，别漏了"两人各自发博客"和"PSP 每人一张"。
