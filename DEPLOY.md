# Panduan Deploy ke VPS Hostinger

Aplikasi ini pakai Next.js + PostgreSQL, di-deploy dengan PM2 (process manager) + Nginx (reverse proxy) + Certbot (SSL gratis). Semua perintah di bawah dijalankan lewat SSH ke VPS.

## Persiapan

- VPS Hostinger dengan Ubuntu (20.04/22.04/24.04), akses root/sudo via SSH
- Domain atau subdomain yang sudah diarahkan (DNS A record) ke IP VPS
- Kode aplikasi ini sudah di-push ke repository Git (GitHub/GitLab) yang bisa diakses dari VPS

> **Belum punya repo Git?** Project ini belum di-`git init` (sengaja tidak dilakukan otomatis — pilihan hosting repo/akun Git adalah keputusan Anda). Jalankan `git init && git add -A && git commit -m "Initial commit"` di folder project, buat repo kosong di GitHub/GitLab, lalu `git remote add origin <url>` dan `git push -u origin main`.
>
> **Tidak mau pakai Git di VPS?** Alternatif: upload kode langsung pakai `scp -r . root@ip-vps-anda:/var/www/gee-cell-brilink-app` dari komputer ini (lebih ribet untuk update berikutnya karena harus scp ulang tiap ada perubahan, tapi jalan tanpa akun Git).

## Langkah 1: Setup awal VPS (sekali saja)

```bash
ssh root@ip-vps-anda
git clone <url-repo-anda> /var/www/gee-cell-brilink-app
cd /var/www/gee-cell-brilink-app
bash scripts/deploy/setup-vps.sh
```

Skrip ini otomatis install Node.js, PostgreSQL, Nginx, Certbot, PM2, setup firewall (ufw: buka port 22/80/443 saja), dan membuat database + user Postgres. Anda akan diminta membuat password untuk user database — simpan baik-baik.

## Langkah 2: Konfigurasi environment

```bash
cd /var/www/gee-cell-brilink-app
cp .env.production.example .env.production
nano .env.production
```

Isi `DATABASE_URL` dengan password yang dibuat di Langkah 1, dan `AUTH_SECRET` dengan string acak panjang (generate dengan `openssl rand -base64 32`).

Rename jadi `.env` supaya terbaca aplikasi:
```bash
cp .env.production .env
```

## Langkah 3: Deploy aplikasi

```bash
bash scripts/deploy/deploy.sh
```

Skrip ini: `npm ci` → `prisma migrate deploy` → `npm run build` → jalankan lewat PM2. Setelah ini aplikasi jalan di `localhost:3000` di dalam VPS.

Jalankan seed data awal (10 cabang + 11 kategori biaya + akun admin) **sekali saja**:
```bash
npx prisma db seed
```

## Langkah 4: Setup Nginx + SSL

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/gee-cell-brilink-app
sudo nano /etc/nginx/sites-available/gee-cell-brilink-app   # ganti domain-anda.com
sudo ln -s /etc/nginx/sites-available/gee-cell-brilink-app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d domain-anda.com
```

Certbot otomatis setup HTTPS dan perpanjangan sertifikat otomatis. Setelah ini aplikasi bisa diakses lewat `https://domain-anda.com`.

## Langkah 5: Auto-start setelah reboot VPS

```bash
pm2 startup
pm2 save
```

## Langkah 6: Backup otomatis

```bash
sudo crontab -e
```

Tambahkan baris (backup tiap jam 2 pagi):
```
0 2 * * * DB_BACKUP_PASSWORD='password-database-anda' /var/www/gee-cell-brilink-app/scripts/deploy/backup-db.sh
```

## Update aplikasi di kemudian hari

Setiap kali ada perubahan kode (push ke repo), cukup jalankan lagi:
```bash
cd /var/www/gee-cell-brilink-app
bash scripts/deploy/deploy.sh
```

## Cek status & debug

```bash
pm2 status                  # status aplikasi
pm2 logs gee-cell-brilink-app   # lihat log aplikasi
sudo systemctl status nginx     # status nginx
sudo systemctl status postgresql # status database
```
