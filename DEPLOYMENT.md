# Deploying Finance Tracker to Ubuntu Server

This guide provides step-by-step instructions for deploying the Finance Tracker application to an Ubuntu server using Docker and GitHub Actions CI/CD.

**Repository:** https://github.com/alexmc80/finance-tracker-qwen-llm.git

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Preparation](#2-server-preparation)
3. [Docker Installation](#3-docker-installation)
4. [GitHub Actions CI/CD Setup](#4-github-actions-cicd-setup)
5. [Manual Deployment](#5-manual-deployment)
6. [Nginx Reverse Proxy](#6-nginx-reverse-proxy-optional)
7. [HTTPS with Let's Encrypt](#7-https-with-lets-encrypt-optional)
8. [Backup and Restore](#8-backup-and-restore)
9. [Monitoring and Maintenance](#9-monitoring-and-maintenance)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

- GitHub account with access to the repository
- Ubuntu 20.04+ server (22.04 LTS recommended)
- Root or sudo access
- Domain name (optional, for HTTPS)

---

## 2. Server Preparation

### 2.1. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2. Install Required Utilities

```bash
sudo apt install -y curl git wget ufw
```

### 2.3. Configure Firewall

```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw allow 3001/tcp
sudo ufw enable
```

### 2.4. Create Application User

```bash
sudo adduser --disabled-password --gecos "" finance
sudo usermod -aG docker finance
```

---

## 3. Docker Installation

### 3.1. Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

### 3.2. Install Docker Compose Plugin

```bash
sudo apt install -y docker-compose-plugin
docker compose version
```

### 3.3. Enable Docker Service

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 4. GitHub Actions CI/CD Setup

This section describes how to set up automated deployment using GitHub Actions.

### 4.1. Create GitHub Secrets

Go to your repository: **https://github.com/alexmc80/finance-tracker-qwen-llm.git**

Navigate to: **Settings → Secrets and variables → Actions**

Add the following repository secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SSH_HOST` | Server IP or domain | `192.168.1.100` or `example.com` |
| `SSH_USERNAME` | SSH username | `finance` or `root` |
| `SSH_KEY` | Private SSH key | Contents of `~/.ssh/id_ed25519` |
| `SSH_PORT` | SSH port (optional) | `22` |

### 4.2. Generate SSH Key Pair

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
```

Copy the public key to your server:

```bash
ssh-copy-id -i ~/.ssh/github_actions.pub finance@your-server-ip
```

Add the private key to GitHub Secrets:

```bash
cat ~/.ssh/github_actions
# Copy the entire output and paste into SSH_KEY secret
```

### 4.3. Create GitHub Actions Workflow

Create the file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build backend
        run: npm run build --workspace=backend

      - name: Build frontend
        run: npm run build --workspace=frontend

      - name: Run tests (if available)
        run: npm test --workspaces --if-present

  build-and-push:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/master'
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/master'
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Deploy to server via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          port: ${{ secrets.SSH_PORT || 22 }}
          script: |
            cd ~/finance-tracker
            
            # Pull latest changes
            git pull origin master
            
            # Login to GitHub Container Registry
            echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            
            # Stop old container
            docker compose down || true
            
            # Remove old image
            docker rmi $(docker images -q ghcr.io/${{ github.repository }}) || true
            
            # Pull new image
            docker compose pull
            
            # Start new container
            docker compose up -d
            
            # Cleanup old images
            docker image prune -f

      - name: Health check
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          port: ${{ secrets.SSH_PORT || 22 }}
          script: |
            sleep 10
            curl -f http://localhost:3001/api/health || exit 1
```

### 4.4. Alternative: Simple SSH Deployment Workflow

For simpler deployment without container registry, create `.github/workflows/deploy-simple.yml`:

```yaml
name: Deploy via SSH

on:
  push:
    branches: [ main, master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          port: ${{ secrets.SSH_PORT || 22 }}
          script: |
            cd ~/finance-tracker
            
            # Pull latest changes
            git pull origin master
            
            # Install dependencies
            npm ci
            
            # Build application
            npm run build
            
            # Restart service
            sudo systemctl restart finance-tracker
            
            # Check status
            sudo systemctl status finance-tracker
```

### 4.5. Deployment Workflow Comparison

| Workflow | Best For | Pros | Cons |
|----------|----------|------|------|
| **deploy.yml** (Docker) | Production | Containerized, consistent, easy rollback | More complex, requires registry |
| **deploy-simple.yml** (SSH) | Development/Staging | Simple, fast, no registry | Less isolated, depends on server Node.js |

### 4.6. Manual Deployment Trigger

Add a manual trigger workflow `.github/workflows/manual-deploy.yml`:

```yaml
name: Manual Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'production'
        type: choice
        options:
        - production
        - staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Deploy to ${{ inputs.environment }}
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          port: ${{ secrets.SSH_PORT || 22 }}
          script: |
            cd ~/finance-tracker
            git pull origin master
            docker compose up -d --build
            echo "Deployed to ${{ inputs.environment }}"
```

To use: Go to **Actions → Manual Deploy → Run workflow**

---

## 5. Manual Deployment

### 5.1. Clone Repository

```bash
sudo su - finance
mkdir -p ~/finance-tracker
cd ~/finance-tracker
git clone https://github.com/alexmc80/finance-tracker-qwen-llm.git .
```

### 5.2. Configure Environment

```bash
nano .env
```

```env
NODE_ENV=production
PORT=3001
DB_PATH=/app/data/finance.db
```

### 5.3. Build and Start

```bash
# Using Docker Compose
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 5.4. Verify Deployment

```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok"}
```

---

## 6. Nginx Reverse Proxy (Optional)

### 6.1. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 6.2. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/finance-tracker
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6.3. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/finance-tracker /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 6.4. Update docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: finance-tracker
    ports:
      - "127.0.0.1:3001:3001"
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

---

## 7. HTTPS with Let's Encrypt

### 7.1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7.2. Obtain Certificate

```bash
sudo certbot --nginx -d your-domain.com
```

### 7.3. Auto-Renewal

```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

---

## 8. Backup and Restore

### 8.1. Backup Script

Create `~/backup-finance.sh`:

```bash
#!/bin/bash

BACKUP_DIR=~/backups/finance-tracker
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH=~/finance-tracker/backend/data/finance.db

mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/finance.db.$DATE
gzip $BACKUP_DIR/finance.db.$DATE

# Keep only last 30 days
find $BACKUP_DIR -name "finance.db.*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 8.2. Schedule Backups

```bash
chmod +x ~/backup-finance.sh
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/finance/backup-finance.sh >> /home/finance/backup.log 2>&1
```

### 8.3. Restore Database

```bash
# Stop application
docker compose down

# Restore
gunzip finance.db.20240101_020000.gz
cp finance.db ~/finance-tracker/backend/data/finance.db

# Start application
docker compose up -d
```

---

## 9. Monitoring and Maintenance

### 9.1. View Logs

```bash
# Docker logs
docker compose logs -f app

# Last 100 lines
docker compose logs --tail=100 app

# Application logs
tail -f ~/finance-tracker/backend/logs/*.log
```

### 9.2. Resource Monitoring

```bash
docker stats
htop
df -h
free -h
```

### 9.3. Update Application

```bash
cd ~/finance-tracker
git pull origin master
docker compose up -d --build
```

### 9.4. GitHub Actions Monitoring

1. Go to **Actions** tab in GitHub
2. View workflow runs
3. Click on a run for detailed logs
4. Re-run failed jobs if needed

---

## 10. Troubleshooting

### 10.1. GitHub Actions Failures

**Issue:** SSH connection failed

```yaml
# Verify secrets are set correctly
# Test SSH connection locally:
ssh -i ~/.ssh/github_actions finance@your-server-ip
```

**Issue:** Docker build fails

```bash
# Test build locally
docker compose build

# Check Dockerfile
cat Dockerfile
```

**Issue:** Health check fails

```bash
# Check if container is running
docker compose ps

# View container logs
docker compose logs app

# Test endpoint
curl http://localhost:3001/api/health
```

### 10.2. Deployment Issues

```bash
# Check container status
docker compose ps

# Restart container
docker compose restart

# Rebuild
docker compose down
docker compose up -d --build

# Check permissions
sudo chown -R finance:finance ~/finance-tracker
```

### 10.3. Database Issues

```bash
# Check database file
ls -la ~/finance-tracker/backend/data/finance.db

# Backup and recreate
cp finance.db finance.db.backup
rm finance.db
docker compose restart
```

### 10.4. Nginx Issues

```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

---

## Quick Reference

### GitHub Actions Commands

```bash
# Trigger deployment manually (via GitHub CLI)
gh workflow run deploy.yml

# View workflow runs
gh run list

# View specific run logs
gh run view <run-id> --log
```

### Docker Compose Commands

```bash
docker compose up -d          # Start
docker compose down           # Stop
docker compose logs -f        # Logs
docker compose ps             # Status
docker compose up -d --build  # Rebuild
```

### Repository URLs

| Resource | URL |
|----------|-----|
| **Repository** | https://github.com/alexmc80/finance-tracker-qwen-llm.git |
| **Actions** | https://github.com/alexmc80/finance-tracker-qwen-llm/actions |
| **Settings** | https://github.com/alexmc80/finance-tracker-qwen-llm/settings |

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `SSH_HOST` | Server IP or domain |
| `SSH_USERNAME` | SSH username |
| `SSH_KEY` | Private SSH key |
| `SSH_PORT` | SSH port (default: 22) |

### File Structure

```
finance-tracker/
├── .github/
│   └── workflows/
│       ├── deploy.yml           # Main CI/CD pipeline
│       ├── deploy-simple.yml    # Simple SSH deployment
│       └── manual-deploy.yml    # Manual trigger
├── backend/
├── frontend/
├── docker-compose.yml
├── Dockerfile
├── DEPLOYMENT.md
└── README.md
```

---

## CI/CD Pipeline Overview

```
┌─────────────────┐
│  Push to master │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build & Test   │
│  - npm ci       │
│  - npm build    │
│  - npm test     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Docker   │
│  Push to GHCR   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy to SSH  │
│  - git pull     │
│  - docker up    │
│  - health check │
└─────────────────┘
```

---

**Last Updated:** February 2026  
**Version:** 2.0.0  
**Repository:** https://github.com/alexmc80/finance-tracker-qwen-llm.git
