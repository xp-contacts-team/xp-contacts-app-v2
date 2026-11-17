#!/usr/bin/env bash
# Runs on the Alibaba Cloud ECS instance after the deployment bundle is copied to /tmp.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
else
  SUDO=""
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[1/4] Docker not found, installing..."
  curl -fsSL https://get.docker.com | $SUDO sh
  $SUDO systemctl enable --now docker
else
  echo "[1/4] Docker is already installed."
fi

echo "[2/4] Extracting application bundle..."
$SUDO rm -rf /opt/atlas-contacts
$SUDO mkdir -p /opt/atlas-contacts
$SUDO tar -xzf /tmp/atlas-bundle.tar.gz -C /opt/atlas-contacts

echo "[3/4] Building API and web images with Docker Compose..."
cd /opt/atlas-contacts
# The old single-container deployment used port 80; remove it before Compose starts.
$SUDO docker rm -f atlas-contacts >/dev/null 2>&1 || true
$SUDO docker compose up -d --build

echo "[4/4] Verifying API and static site..."
sleep 4
if ! curl -fsS http://127.0.0.1/api/health >/dev/null; then
  echo "API health check failed. Check: sudo docker compose logs api" >&2
  exit 1
fi
if ! curl -fsS http://127.0.0.1/ >/dev/null; then
  echo "Web health check failed. Check: sudo docker compose logs web" >&2
  exit 1
fi

PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
echo "OK: http://${PUBLIC_IP}/"
echo "API: http://${PUBLIC_IP}/api/health"
echo "SQLite volume: atlas-contacts_atlas-data (persists across redeploys)"
echo "If the URL is not reachable, allow inbound TCP 80 in the ECS security group."
