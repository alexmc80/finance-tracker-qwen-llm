# Deploying Finance Tracker to Ubuntu Server

This guide provides step-by-step instructions for deploying the Finance Tracker application to an Ubuntu server using Docker.

## Prerequisites

- Ubuntu 20.04 or later (22.04 LTS recommended)
- Root or sudo access
- Domain name (optional, for HTTPS)

---

## Table of Contents

1. [Server Preparation](#1-server-preparation)
2. [Docker Installation](#2-docker-installation)
3. [Application Deployment](#3-application-deployment)
4. [Nginx Reverse Proxy (Optional)](#4-nginx-reverse-proxy-optional)
5. [HTTPS with Let's Encrypt (Optional)](#5-https-with-lets-encrypt-optional)
6. [Systemd Service (Alternative to Docker)](#6-systemd-service-alternative-to-docker)
7. [Backup and Restore](#7-backup-and-restore)
8. [Monitoring and Maintenance](#8-monitoring-and-maintenance)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Server Preparation

### 1.1. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2. Install Required Utilities

```bash
sudo apt install -y curl git wget ufw
```

### 1.3. Configure Firewall

```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP (for Nginx)
sudo ufw allow http

# Allow HTTPS (for Nginx)
sudo ufw allow https

# Allow Docker port (if running without Nginx)
sudo ufw allow 3001/tcp

# Enable firewall
sudo ufw enable
```

### 1.4. Create Application User (Recommended)

```bash
sudo adduser --disabled-password --gecos "" finance
sudo usermod -aG docker finance
sudo su - finance
```

---

## 2. Docker Installation

### 2.1. Install Docker

```bash
# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index
sudo apt update

# Install Docker Engine
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Verify Docker installation
sudo docker --version
```

### 2.2. Install Docker Compose

```bash
# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Verify installation
docker compose version
```

### 2.3. Configure Docker to Start on Boot

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

### 2.4. (Optional) Allow Non-Root User to Run Docker

If you created the `finance` user above, it's already added to the docker group. Otherwise:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

---

## 3. Application Deployment

### 3.1. Clone or Upload Application

```bash
# Create application directory
mkdir -p ~/finance-tracker
cd ~/finance-tracker

# Option A: Clone from Git repository
git clone <your-repository-url> .

# Option B: Upload files via SCP (from local machine)
# scp -r /path/to/local/transaction/* finance@your-server:~/finance-tracker/
```

### 3.2. Create Environment Configuration

Create a `.env` file for environment variables:

```bash
nano .env
```

Add the following content:

```env
NODE_ENV=production
PORT=3001
DB_PATH=/app/data/finance.db
```

### 3.3. Build and Start with Docker Compose

```bash
# Build and start the container
docker compose up -d --build

# Check container status
docker compose ps

# View logs
docker compose logs -f
```

### 3.4. Verify Application is Running

```bash
# Check if container is running
docker ps

# Test health endpoint
curl http://localhost:3001/api/health

# Expected response: {"status":"ok"}
```

### 3.5. Docker Compose Commands Reference

```bash
# Start containers
docker compose up -d

# Stop containers
docker compose down

# Restart containers
docker compose restart

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f app

# Rebuild and restart
docker compose up -d --build

# Remove containers and volumes (WARNING: deletes data!)
docker compose down -v
```

---

## 4. Nginx Reverse Proxy (Optional)

Using Nginx as a reverse proxy provides better security, SSL termination, and the ability to host multiple services.

### 4.1. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 4.2. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/finance-tracker
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or server IP

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint (optional - can be restricted)
    location /api/health {
        proxy_pass http://localhost:3001/api/health;
    }
}
```

### 4.3. Enable the Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/finance-tracker /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4.4. Update Docker Compose for Internal Network

Modify `docker-compose.yml` to bind to localhost only:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: finance-tracker
    ports:
      - "127.0.0.1:3001:3001"  # Bind to localhost only
    volumes:
      - finance_data:/app/data
      - finance_logs:/app/backend/logs
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DB_PATH=/app/data/finance.db
    restart: unless-stopped
    networks:
      - finance-network

networks:
  finance-network:
    driver: bridge

volumes:
  finance_data:
    driver: local
  finance_logs:
    driver: local
```

Then restart:

```bash
docker compose down
docker compose up -d
```

---

## 5. HTTPS with Let's Encrypt (Optional)

### 5.1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2. Obtain SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com
```

Follow the prompts to:
1. Enter your email address
2. Agree to terms of service
3. Choose whether to share email with EFF
4. Redirect HTTP to HTTPS (recommended: Yes)

### 5.3. Auto-Renewal Setup

Certbot automatically sets up a systemd timer for renewal. Verify it:

```bash
sudo systemctl status certbot.timer
```

Test renewal process:

```bash
sudo certbot renew --dry-run
```

### 5.4. Update Nginx Configuration for HTTPS

After Certbot runs, your Nginx config will be updated automatically. The final config should look like:

```nginx
server {
    server_name your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 6. Systemd Service (Alternative to Docker)

If you prefer to run the application directly on the server without Docker:

### 6.1. Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 6.2. Build the Application

```bash
cd ~/finance-tracker

# Install dependencies
npm install

# Build backend
cd backend
npm install
npm run build

# Build frontend
cd ../frontend
npm install
npm run build

# Return to root
cd ..
```

### 6.3. Create Systemd Service

```bash
sudo nano /etc/systemd/system/finance-tracker.service
```

Add the following content:

```ini
[Unit]
Description=Finance Tracker Application
Documentation=https://github.com/your-repo/finance-tracker
After=network.target

[Service]
Type=simple
User=finance
WorkingDirectory=/home/finance/finance-tracker
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=DB_PATH=/home/finance/finance-tracker/backend/data/finance.db
ExecStart=/usr/bin/node backend/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=finance-tracker

# Security hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 6.4. Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service on boot
sudo systemctl enable finance-tracker

# Start service
sudo systemctl start finance-tracker

# Check status
sudo systemctl status finance-tracker

# View logs
sudo journalctl -u finance-tracker -f
```

### 6.5. Service Management Commands

```bash
# Start
sudo systemctl start finance-tracker

# Stop
sudo systemctl stop finance-tracker

# Restart
sudo systemctl restart finance-tracker

# Reload (if supported)
sudo systemctl reload finance-tracker

# Check status
sudo systemctl status finance-tracker

# View logs
sudo journalctl -u finance-tracker -f

# View recent errors
sudo journalctl -u finance-tracker -p err -n 50
```

---

## 7. Backup and Restore

### 7.1. Backup Database

```bash
# Create backup directory
mkdir -p ~/backups/finance-tracker

# Backup database
cp ~/finance-tracker/backend/data/finance.db ~/backups/finance-tracker/finance.db.$(date +%Y%m%d_%H%M%S)

# Backup logs (optional)
cp -r ~/finance-tracker/backend/logs ~/backups/finance-tracker/logs.$(date +%Y%m%d_%H%M%S)
```

### 7.2. Automated Daily Backups

Create a backup script:

```bash
nano ~/backup-finance.sh
```

Add content:

```bash
#!/bin/bash

BACKUP_DIR=~/backups/finance-tracker
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH=~/finance-tracker/backend/data/finance.db

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp $DB_PATH $BACKUP_DIR/finance.db.$DATE

# Compress backup
gzip $BACKUP_DIR/finance.db.$DATE

# Remove backups older than 30 days
find $BACKUP_DIR -name "finance.db.*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Make executable and add to crontab:

```bash
chmod +x ~/backup-finance.sh

# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/finance/backup-finance.sh >> /home/finance/backup.log 2>&1
```

### 7.3. Restore Database

```bash
# Stop the application
docker compose down
# OR
sudo systemctl stop finance-tracker

# Restore database
cp ~/backups/finance-tracker/finance.db.20240101_020000.gz ./finance.db.gz
gunzip finance.db.gz
cp finance.db ~/finance-tracker/backend/data/finance.db

# Start the application
docker compose up -d
# OR
sudo systemctl start finance-tracker
```

---

## 8. Monitoring and Maintenance

### 8.1. Docker Container Monitoring

```bash
# View running containers
docker ps

# View container resource usage
docker stats

# View container logs
docker compose logs -f app

# View last 100 log lines
docker compose logs --tail=100 app
```

### 8.2. System Resource Monitoring

```bash
# Install htop
sudo apt install -y htop

# Monitor system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h
```

### 8.3. Log Rotation

Create logrotate configuration:

```bash
sudo nano /etc/logrotate.d/finance-tracker
```

Add content:

```
/home/finance/finance-tracker/backend/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 finance finance
}
```

### 8.4. Update Application

```bash
cd ~/finance-tracker

# Pull latest changes (if using Git)
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build

# OR for systemd service
sudo systemctl restart finance-tracker
```

### 8.5. Security Updates

```bash
# Update system packages regularly
sudo apt update && sudo apt upgrade -y

# Update Docker packages
sudo apt update && sudo apt upgrade docker-ce docker-ce-cli containerd.io
```

---

## 9. Troubleshooting

### 9.1. Container Won't Start

```bash
# Check container status
docker compose ps

# View logs
docker compose logs app

# Check for port conflicts
sudo netstat -tlnp | grep 3001

# Check Docker daemon
sudo systemctl status docker
```

### 9.2. Database Connection Issues

```bash
# Check if database file exists
ls -la ~/finance-tracker/backend/data/finance.db

# Check permissions
sudo chown -R finance:finance ~/finance-tracker/backend/data

# Recreate database (WARNING: deletes all data!)
rm ~/finance-tracker/backend/data/finance.db
docker compose restart
```

### 9.3. Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# Reload Nginx
sudo systemctl reload nginx
```

### 9.4. SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Debug renewal
sudo certbot renew --dry-run --verbose
```

### 9.5. Permission Issues

```bash
# Fix Docker volume permissions
sudo chown -R 1000:1000 /var/lib/docker/volumes/finance_data

# Fix application directory permissions
sudo chown -R finance:finance ~/finance-tracker
```

### 9.6. High Memory Usage

```bash
# Check container memory
docker stats

# Limit container memory in docker-compose.yml
# Add under service configuration:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

### 9.7. Application Not Responding

```bash
# Check if process is running
docker ps | grep finance-tracker
# OR
sudo systemctl status finance-tracker

# Check application logs
docker compose logs --tail=200 app
# OR
sudo journalctl -u finance-tracker -n 200

# Restart application
docker compose restart
# OR
sudo systemctl restart finance-tracker
```

---

## Quick Reference

### Essential Commands

```bash
# Docker Compose
docker compose up -d          # Start
docker compose down           # Stop
docker compose logs -f        # Logs
docker compose ps             # Status

# Systemd Service
sudo systemctl start finance-tracker
sudo systemctl stop finance-tracker
sudo systemctl restart finance-tracker
sudo systemctl status finance-tracker
sudo journalctl -u finance-tracker -f

# Nginx
sudo systemctl restart nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# SSL
sudo certbot certificates
sudo certbot renew
```

### Default Ports

| Service | Port |
|---------|------|
| Application | 3001 |
| HTTP | 80 |
| HTTPS | 443 |

### File Locations

| File | Location |
|------|----------|
| Database | /app/data/finance.db (Docker) or ~/finance-tracker/backend/data/finance.db (systemd) |
| Logs | /app/backend/logs/ (Docker) or ~/finance-tracker/backend/logs/ (systemd) |
| Nginx Config | /etc/nginx/sites-available/finance-tracker |
| SSL Certs | /etc/letsencrypt/live/your-domain.com/ |
| Systemd Service | /etc/systemd/system/finance-tracker.service |

---

## Support

For issues or questions:
1. Check application logs first
2. Verify Docker container or systemd service status
3. Check Nginx configuration and logs
4. Verify SSL certificate validity
5. Review firewall rules

---

**Last Updated:** February 2026
**Version:** 1.0.0
