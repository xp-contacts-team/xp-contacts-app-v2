# 阿里云部署指南（Atlas 通讯录）

## 这次实际部署的结果

| 项目 | 内容 |
| --- | --- |
| 平台 | 阿里云云服务器 ECS |
| 地域 | 华东1（杭州） |
| 实例 ID | `i-bp1gaq04aqbxqx3g4l8z` |
| 配置 | 2 核 2 GiB，Ubuntu 22.04 64 位 |
| 访问地址 | <http://120.55.102.189/> |
| 运行方式 | Docker Compose：`api`（Python + SQLite）+ `web`（Nginx） |
| 数据持久化 | Docker volume `atlas-contacts_atlas-data:/data/atlas.db` |
| 安全组 | `nas-sg` / `sg-bp12hwq93o8sca312eis`，入方向放行 22、80 |
| 验证情况 | 首页 HTTP 200；`/api/health` 返回 10 位联系人；重启 API 容器后测试联系人还在 |
| API 健康检查 | <http://120.55.102.189/api/health> |

部署用的命令：

```powershell
.\scripts\deploy_ecs.ps1 -HostName 120.55.102.189 -User root -KeyPath .deploy\ssh\atlas_ecs -SkipBuild
```

### 补充：OSS 方案试过，最后没用

OSS 文件上传本身是成功的，但阿里云 OSS 的默认域名对网页类型文件会强制返回 `Content-Disposition: attachment`——就算把对象元数据设成 `inline` 也会被覆盖。想让 OSS 当应用入口，必须绑定自定义域名（杭州 Bucket 还要求 ICP 备案）。折腾了一圈不划算，最终改用 ECS + Nginx 直接出页面。

---

这个项目是 React 前端 + Python/SQLite API，构建产物在 `dist/`，数据库文件躺在 Docker 卷里。阿里云上常见的部署方式有三种，按我们的情况列一下：

| 方式 | 适合场景 | 成本 | 公开 URL 形式 |
| --- | --- | --- | --- |
| **OSS 静态网站**（需自定义域名） | 想最快拿到公网链接，不想管服务器 | 按存储/请求计费，作业期间通常几毛钱 | `http://<自定义域名>/`；默认域名会把 HTML 强制下载 |
| **ECS + Docker/Nginx** | 已经有云服务器，想自己控制 Nginx | 按 ECS 规格计费 | `http://<公网IP>/` |
| **函数计算 FC / SAE** | 想玩 Serverless，配自定义域名 | 按调用/资源计费 | 由 FC/SAE 生成 |

---

## 方式一：OSS 静态网站托管（本来最省事）

### 1. 建 Bucket

在阿里云 OSS 控制台创建 Bucket：

- Bucket 名：比如 `xp-contacts-app`
- 地域：挑近的，比如 `华东1（杭州）` → endpoint `oss-cn-hangzhou.aliyuncs.com`
- 读写权限：**公共读**（静态网站必须允许匿名访问）
- 别开"阻止公共访问"

### 2. 开静态网站托管

Bucket → 数据管理 → 静态页面：

- 默认首页：`index.html`
- 默认 404 页：`index.html`
- 子目录首页：`index.html`（可选）

### 3. 上传构建产物

```bash
pnpm install
pnpm build
```

把 `dist/` 里的**全部文件**传到 Bucket 根目录：

```text
index.html
assets/index-xxxx.css
assets/index-xxxx.js
favicon.svg
```

#### 用 ossutil（推荐）

先下载配置 ossutil：

```bash
ossutil config
# endpoint: oss-cn-hangzhou.aliyuncs.com
# accessKeyID / accessKeySecret: 用只授权这个 Bucket 的 RAM 用户
```

上传：

```bash
ossutil cp -r dist/ oss://xp-contacts-app/ --update
```

设置静态网站首页：

```bash
ossutil website --method put oss://xp-contacts-app/ \
  --index-document index.html \
  --error-document index.html
```

访问：

```text
http://xp-contacts-app.oss-cn-hangzhou.aliyuncs.com/index.html
```

> OSS 默认域名是 HTTP。要 HTTPS 的话绑自定义域名再开 CDN/证书；作业只要求公网能访问，HTTP 就够了。

### 4. RAM 最小权限（别偷懒）

不要用主账号 AccessKey。建一个 RAM 用户，只给它这个 Bucket 的读写权限：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject",
        "oss:ListObjects",
        "oss:DeleteObject",
        "oss:GetBucketWebsite",
        "oss:PutBucketWebsite"
      ],
      "Resource": [
        "acs:oss:*:*:xp-contacts-app",
        "acs:oss:*:*:xp-contacts-app/*"
      ]
    }
  ]
}
```

部署完可以把这个 AccessKey 停用或删掉。

---

## 方式二：ECS + Docker Compose + Nginx（我们实际用的）

适合已经有阿里云 ECS 的情况。Compose 会同时拉起 `api`（Python + SQLite）和 `web`（Nginx）两个容器。

### 1. 服务器准备

- 系统：Ubuntu 22.04 / Alibaba Cloud Linux 3
- 安全组入方向放行：`22`（SSH）、`80`（HTTP）
- 装 Docker 和 Compose：

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker compose version
```

### 2. 上传并运行

把项目传到服务器（或者 `git clone` 你们组织的仓库），然后：

```bash
docker compose up -d --build
```

访问：

```text
http://<ECS 公网 IP>/
http://<ECS 公网 IP>/api/health
```

数据存在 Docker 命名卷 `atlas-contacts_atlas-data` 的 `/data/atlas.db` 里。`docker compose down` 不会删卷，**千万别加 `-v`**。要备份的话：

```bash
docker run --rm -v atlas-contacts_atlas-data:/data -v "$PWD":/backup alpine \
  cp /data/atlas.db /backup/atlas-backup.db
```

### 3. 不用 Docker 的本地跑法

```bash
python server/app.py            # 终端 1，API :8000
pnpm install && pnpm dev        # 终端 2，前端 :5173
```

生产环境还是建议用 Compose，数据库卷和重启策略都现成。

---

## 方式三：函数计算 FC / SAE

走函数计算的话，推荐"自定义容器"或"Web 函数"：

1. 构建镜像推到阿里云容器镜像服务 ACR。
2. 在 FC 建 Web 函数，选这个镜像，监听端口 `80`。
3. 配 HTTP 触发器，拿公网 URL。
4. 用 SAE 的话，建应用再绑公网 SLB/域名。

---

## 部署后验证清单

- [ ] 公网 URL 在**无痕窗口**能打开，不是 `localhost`
- [ ] 刷新页面不 404（OSS 首页/404 都指向 `index.html`）
- [ ] 能新建联系人、刷新后还在（localStorage）
- [ ] 收藏后「我的收藏」数量会变
- [ ] 能导出 `.xlsx` 并用 Excel 打开
- [ ] 能导入示例文件 `docs/fixtures/Atlas-import-sample.xlsx`
- [ ] 手机宽度下列表、详情、表单都能用
- [ ] URL 写进了 README 的"云部署"一节和 CSDN 博客

## 安全和成本

- 静态站点没有后端，数据全在访问者浏览器里，不会上传服务器。
- OSS 公共读只暴露前端静态文件；AccessKey、`.env` 之类别往 Bucket 里传。
- 作业交完可以把 Bucket/ECS 删掉，免得继续计费。
- 建议给 Bucket 设个流量封顶或预算告警，防止被人刷流量。

## 交给部署执行人需要的信息

选 OSS：

```text
region（如 oss-cn-hangzhou）
bucket 名称
临时 AccessKeyId / AccessKeySecret（只给这个 Bucket 的权限）
```

选 ECS：

```text
公网 IP
SSH 端口 / 用户名
SSH 私钥路径或密码
安全组是否已放行 80
```

> 别把长期主账号 AccessKey 发到聊天里；用临时 RAM 用户，部署完就停用。
