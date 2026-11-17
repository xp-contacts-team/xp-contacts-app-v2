#!/usr/bin/env python3
"""Deploy the built static site to Alibaba Cloud OSS using only the standard library.

Usage:
  1. pnpm build
  2. Copy .env.aliyun.example to .env.aliyun and fill in a RAM AccessKey
     restricted to the target bucket.
  3. python scripts/deploy_oss.py

The script uploads dist/, sets the bucket ACL to public-read, configures the
static website index/error document, and verifies the public URL.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import mimetypes
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from email.utils import formatdate
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
ENV_FILE = ROOT / ".env.aliyun"

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".woff2": "font/woff2",
}


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip().lstrip("\ufeff")
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def sign(secret: str, method: str, content_md5: str, content_type: str, date: str,
         oss_headers: str, resource: str) -> str:
    string_to_sign = "\n".join([method, content_md5, content_type, date]) + "\n"
    if oss_headers:
        string_to_sign += oss_headers
    string_to_sign += resource
    digest = hmac.new(secret.encode("utf-8"), string_to_sign.encode("utf-8"), hashlib.sha1).digest()
    return base64.b64encode(digest).decode("ascii")


def request(method: str, url: str, key_id: str, secret: str, body: bytes = b"",
            content_type: str = "", resource: str = "", oss_headers: dict[str, str] | None = None,
            extra_headers: dict[str, str] | None = None, attempts: int = 3) -> tuple[int, bytes, dict]:
    oss_headers = oss_headers or {}
    extra_headers = extra_headers or {}
    content_md5 = base64.b64encode(hashlib.md5(body).digest()).decode("ascii") if body else ""
    canonical_oss = "".join(f"{name.lower()}:{value}\n" for name, value in sorted(oss_headers.items()))
    last_error: Exception | None = None

    for attempt in range(attempts):
        date = formatdate(usegmt=True)
        signature = sign(secret, method, content_md5, content_type, date, canonical_oss, resource)
        headers = {
            "Date": date,
            "Authorization": f"OSS {key_id}:{signature}",
            "User-Agent": "atlas-oss-deploy/1.0",
            **extra_headers,
            **oss_headers,
        }
        if content_type:
            headers["Content-Type"] = content_type
        if content_md5:
            headers["Content-MD5"] = content_md5
        req = urllib.request.Request(url, data=body if body else None, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=60) as response:
                return response.status, response.read(), dict(response.headers)
        except urllib.error.HTTPError as error:
            payload = error.read()
            if error.code in (429, 500, 502, 503, 504) and attempt + 1 < attempts:
                time.sleep(1.5 * (attempt + 1))
                continue
            return error.code, payload, dict(error.headers)
        except Exception as error:  # network reset / timeout
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(1.5 * (attempt + 1))
                continue
    raise RuntimeError(f"request failed: {last_error}")


def main() -> int:
    env = load_env(ENV_FILE)
    key_id = env.get("ALIYUN_ACCESS_KEY_ID") or os.environ.get("ALIYUN_ACCESS_KEY_ID", "")
    secret = env.get("ALIYUN_ACCESS_KEY_SECRET") or os.environ.get("ALIYUN_ACCESS_KEY_SECRET", "")
    bucket = env.get("ALIYUN_OSS_BUCKET") or os.environ.get("ALIYUN_OSS_BUCKET", "")
    region = env.get("ALIYUN_OSS_REGION") or os.environ.get("ALIYUN_OSS_REGION", "oss-cn-hangzhou")
    endpoint = env.get("ALIYUN_OSS_ENDPOINT") or os.environ.get("ALIYUN_OSS_ENDPOINT", "")

    missing = [
        name
        for name, value in [
            ("ALIYUN_ACCESS_KEY_ID", key_id),
            ("ALIYUN_ACCESS_KEY_SECRET", secret),
            ("ALIYUN_OSS_BUCKET", bucket),
        ]
        if not value
    ]
    if missing:
        print("Missing configuration: " + ", ".join(missing))
        print(f"Create {ENV_FILE} from .env.aliyun.example and fill it in.")
        return 2
    if not DIST.exists():
        print("dist/ does not exist. Run `pnpm build` first.")
        return 2

    if endpoint:
        endpoint_host = urllib.parse.urlparse(endpoint).netloc or endpoint
    else:
        endpoint_host = f"{region}.aliyuncs.com"
    base = f"https://{bucket}.{endpoint_host}"
    public_url = f"http://{bucket}.{endpoint_host}/index.html"

    print(f"Deploying {DIST} -> {base}/")

    # Create the bucket if it does not exist yet. A 409 means it already exists
    # (either owned by this account or globally taken).
    create_bucket = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<CreateBucketConfiguration>"
        "<StorageClass>Standard</StorageClass>"
        "<DataRedundancyType>LRS</DataRedundancyType>"
        "</CreateBucketConfiguration>"
    ).encode("utf-8")
    status, body, _ = request(
        "PUT",
        f"{base}/",
        key_id,
        secret,
        body=create_bucket,
        content_type="application/xml",
        resource=f"/{bucket}/",
        oss_headers={"x-oss-acl": "public-read"},
    )
    if status in (200, 201):
        print(f"Created bucket {bucket}.")
    elif status == 409:
        print(f"Bucket {bucket} already exists; continuing.")
    else:
        print(f"Warning: could not create bucket ({status}). If it already exists, ignore this.")
        print(body[:300].decode("utf-8", "replace"))

    # Public read so the static website can be opened anonymously.
    status, body, _ = request(
        "PUT",
        f"{base}/?acl",
        key_id,
        secret,
        content_type="application/xml",
        resource=f"/{bucket}/?acl",
        oss_headers={"x-oss-acl": "public-read"},
    )
    if status not in (200, 204):
        print(f"Warning: could not set bucket ACL ({status}). Set 公共读 manually in OSS console.")
        print(body[:300].decode("utf-8", "replace"))

    uploaded = 0
    for path in sorted(DIST.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(DIST).as_posix()
        content_type = CONTENT_TYPES.get(path.suffix.lower()) or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        payload = path.read_bytes()
        headers = {"Cache-Control": "no-cache" if relative == "index.html" else "public, max-age=31536000, immutable"}
        if relative.endswith(".html"):
            # OSS default domains force HTML downloads unless inline is set explicitly.
            headers["Content-Disposition"] = "inline"
        status, body, _ = request(
            "PUT",
            f"{base}/{urllib.parse.quote(relative, safe='/')}",
            key_id,
            secret,
            body=payload,
            content_type=content_type,
            resource=f"/{bucket}/{relative}",
            extra_headers=headers,
        )
        if status not in (200, 201):
            print(f"Upload failed: {relative} -> HTTP {status}")
            print(body[:500].decode("utf-8", "replace"))
            return 1
        uploaded += 1
        print(f"  uploaded {relative} ({len(payload)} bytes)")

    website = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<WebsiteConfiguration>"
        "<IndexDocument><Suffix>index.html</Suffix></IndexDocument>"
        "<ErrorDocument><Key>index.html</Key></ErrorDocument>"
        "</WebsiteConfiguration>"
    ).encode("utf-8")
    status, body, _ = request(
        "PUT",
        f"{base}/?website",
        key_id,
        secret,
        body=website,
        content_type="application/xml",
        resource=f"/{bucket}/?website",
    )
    if status not in (200, 204):
        print(f"Warning: could not configure static website ({status}). Configure it manually.")
        print(body[:500].decode("utf-8", "replace"))

    print(f"Uploaded {uploaded} files.")
    print(f"Public URL: {public_url}")

    try:
        req = urllib.request.Request(public_url, headers={"User-Agent": "atlas-oss-deploy/1.0"})
        with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=30) as response:
            print(f"Verify: HTTP {response.status}, {len(response.read())} bytes")
    except Exception as error:
        print(f"Verify failed (check bucket public-read / static website): {error}")
        return 1

    print("Deployment complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
