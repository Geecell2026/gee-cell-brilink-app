#!/usr/bin/env bash
# Setup awal VPS Hostinger (Ubuntu) untuk gee-cell-brilink-app.
# Jalankan SEKALI saja saat VPS baru: bash setup-vps.sh
set -euo pipefail

echo "== Update sistem =="
sudo apt update && sudo apt upgrade -y

echo "== Install Node.js LTS =="
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

echo "== Install PostgreSQL =="
sudo apt install -y postgresql postgresql-contrib

echo "== Install Nginx =="
sudo apt install -y nginx

echo "== Install Certbot (SSL) =="
sudo apt install -y certbot python3-certbot-nginx

echo "== Install PM2 =="
sudo npm install -g pm2

echo "== Setup firewall (ufw) =="
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "== Buat database & user Postgres =="
read -rp "Password untuk user database gee_app: " DB_PASS
sudo -u postgres psql -c "CREATE USER gee_app WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -c "CREATE DATABASE gee_cell_brilink OWNER gee_app;"

echo ""
echo "Setup awal selesai. Langkah selanjutnya:"
echo "1. Clone/upload kode aplikasi ke /var/www/gee-cell-brilink-app"
echo "2. Buat file .env.production (contoh: .env.production.example)"
echo "3. Jalankan scripts/deploy/deploy.sh"
echo "4. Setup Nginx (lihat deploy/nginx.conf.example) lalu jalankan certbot untuk SSL"
