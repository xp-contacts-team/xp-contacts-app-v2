# 阿里云部署指南（Atlas 通讯录）

## 本次实际部署结果

| 项目 | 内容 |
| --- | --- |
| 平台 | 阿里云云服务器 ECS |
| 地域 | 华东1（杭州） |
| 实例 ID | `i-bp1gaq04aqbxqx3g4l8z` |
| 配置 | 2 核 2 GiB，Ubuntu 22.04 64 位 |
| 访问地址 | <http://120.55.102.189/> |
| 运行方式 | Docker Compose：`api`（Python + SQLite）+ `web`（Nginx） |
| 数据持久化 | Docker volume `atlas-contacts_atlas-data:/data/atlas.db` |
| 安全组 | `nas-sg` / `sg-bp12hwq93o8sca312eis`，入方向 22、80 |
| 验证 | 首页 HTTP 200；`/api/health` 返回当前联系人数量（初始 10，演示后 12）；重启 API 容器后数据仍在 |
| API 健康检查 | <http://120.55.102.189/api/health> |

部署命令：

```powershell
.\scripts\deploy_ecs.ps1 -HostName 120.55.102.189 -User root -KeyPath .deploy\ssh\atlas_ecs -SkipBuild
```

### 补充：OSS 方案未采用

OSS 文件上传成功，但阿里云 OSS 默认域名对网页类型文件会返回 `Content-Disposition: attachment`，即使对象元数据设置为 `inline` 也会被覆盖。要使用 OSS 作为应用入口，必须绑定自定义域名（杭州 Bucket 还需要 ICP 备案）。因此最终使用 ECS + Nginx 提供可浏览页面。

---

本项目是 React 前端 + Python/SQLite API，构建产物在 `dist/`，数据库文件在 Docker 卷中。阿里云上有三种常见部署方式：

| 方式 | 适合场景 | 成本 | 公开 URL 形式 |
| --- | --- | --- | --- |
| **OSS 静态网站**（需自定义域名） | 最快拿到公网链接，无需服务器运维 | 按存储/请求计费，作业期间通常几毛钱 | `http://<自定义域名>/`；默认域名会强制下载 HTML |
| **ECS + Docker/Nginx** | 已有云服务器，需要自己控制 Nginx | 按 ECS 规格计费 | `http://<公网IP>/` |
| **函数计算 FC / SAE** | 想用 Serverless，自定义域名 | 按调用/资源计费 | 由 FC/SAE 生成 |

> 作业明确说明：`localhost` 链接不算云部署。部署完成后，把公开 URL 填入 README、博客和提交说明。

---

## 方式一：OSS 静态网站托管（推荐）

### 1. 创建 Bucket

在阿里云 OSS 控制台创建 Bucket：

- Bucket 名称：例如 `xp-contacts-app`
- 地域：离你近的地域，例如 `华东1（杭州）` → endpoint `oss-cn-hangzhou.aliyuncs.com`
- 读写权限：**公共读**（静态网站必须允许匿名读取）
- 不要开启“阻止公共访问”

### 2. 开启静态网站托管

Bucket → 数据管理 → 静态页面：

- 默认首页：`index.html`
- 默认 404 页：`index.html`
- 子目录首页：`index.html`（可选）

### 3. 上传构建产物

```bash
pnpm install
pnpm build
```

把 `dist/` 里的**全部文件**上传到 Bucket 根目录：

```text
index.html
assets/index-xxxx.css
assets/index-xxxx.js
favicon.svg
```

#### 使用 ossutil（推荐）

下载并配置 ossutil：

```bash
ossutil config
# endpoint: oss-cn-hangzhou.aliyuncs.com
# accessKeyID / accessKeySecret: 使用只授权该 Bucket 的 RAM 用户
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

> OSS 默认域名是 HTTP。若需要 HTTPS，可绑定自定义域名并开启 CDN/证书；作业只要求公网可访问，HTTP 链接即可。

### 4. RAM 最小权限（重要）

不要使用主账号 AccessKey。创建一个 RAM 用户，只授予该 Bucket 的读写权限：

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

部署完成后可停用或删除该 AccessKey。

---

## 方式二：ECS + Docker Compose + Nginx

适合已有阿里云 ECS 的情况。Compose 会同时启动 `api`（Python + SQLite）和 `web`（Nginx）。

### 1. 服务器准备

- 系统：Ubuntu 22.04 / Alibaba Cloud Linux 3
- 安全组入方向放行：`22`（SSH）、`80`（HTTP）
- 安装 Docker 与 Compose：

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker compose version
```

### 2. 上传并运行

把项目上传到服务器（或 `git clone` 你们组织的仓库），然后：

```bash
docker compose up -d --build
```

访问：

```text
http://<ECS 公网 IP>/
http://<ECS 公网 IP>/api/health
```

数据保存在 Docker 命名卷 `atlas-contacts_atlas-data` 的 `/data/atlas.db` 中；执行 `docker compose down` 不会删除卷，**不要加 `-v`**。备份：

```bash
docker run --rm -v atlas-contacts_atlas-data:/data -v "$PWD":/backup alpine \
  cp /data/atlas.db /backup/atlas-backup.db
```

### 3. 不使用 Docker 的本地运行

```bash
python server/app.py            # 终端 1，API :8000
pnpm install && pnpm dev        # 终端 2，前端 :5173
```

生产环境仍建议用 Compose，便于数据库卷和重启策略。

---

## 方式三：函数计算 FC / SAE

如果使用函数计算，推荐“自定义容器”或“Web 函数”：

1. 构建镜像并推送到阿里云容器镜像服务 ACR。
2. 在 FC 创建 Web 函数，选择该镜像，监听端口 `80`。
3. 配置 HTTP 触发器，获得公网 URL。
4. 若使用 SAE，创建应用并绑定公网 SLB/域名。

这条路径步骤较多，作业加分只要求公网可访问，优先选 OSS。

---

## 部署后验证清单

- [ ] 公网 URL 在**无痕窗口**能打开，不是 `localhost`
- [ ] 刷新页面不 404（OSS 首页/404 均指向 `index.html`）
- [ ] 能新建联系人、刷新后仍存在（API + SQLite；清空 `localStorage` 后仍能从服务端加载）
- [ ] 收藏后「我的收藏」数量变化
- [ ] 能导出 `.xlsx` 并用 Excel 打开
- [ ] 能导入示例文件 `docs/fixtures/Atlas-import-sample.xlsx`
- [ ] 手机宽度下列表、详情、表单可用
- [ ] 把 URL 写入 README 的“云部署”一节和 CSDN 博客

## 安全与成本

- 静态站点没有后端，所有数据保存在访问者浏览器，不会上传到服务器。
- OSS 公共读只暴露前端静态文件；不要把 AccessKey、`.env` 或任何密钥上传到 Bucket。
- 作业结束后可删除 Bucket/ECS，避免继续计费。
- 建议给 Bucket 设置流量封顶或预算告警，防止被刷流量。

## 需要提供给部署执行人的信息

选择 OSS 时：

```text
region（如 oss-cn-hangzhou）
bucket 名称
临时 AccessKeyId / AccessKeySecret（仅该 Bucket 权限）
```

选择 ECS 时：

```text
公网 IP
SSH 端口 / 用户名
SSH 私钥路径或密码
安全组是否已放行 80
```

> 不要把长期主账号 AccessKey 发到聊天里；用临时 RAM 用户，部署完即停用。
