# Deployment Guide

This covers three ways to run the project: local Docker Compose (what you'll use
most), a basic AWS deployment, and a basic Azure deployment. The AWS/Azure sections
are real, correct steps - not run against an actual account here, since that would
need your own cloud credentials - so treat them as instructions to follow, not a
live deployed URL.

## 1. Local Docker Compose

```bash
cp .env.example .env        # then edit SECRET_KEY to something random
docker compose up -d --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:5000 |
| API health check | http://localhost:5000/api/health |

The database lives in a named Docker volume (`ams-data`), so it survives
`docker compose down` / `up` cycles. To wipe it and reseed from scratch:
```bash
docker compose down -v
docker compose up -d --build
```

To reseed with a different employee count instead of wiping everything:
```bash
docker compose exec api python -m scripts.seed --employees 40 --reset
```

Logs:
```bash
docker compose logs -f api
docker compose logs -f web
```

## 2. AWS (EC2 + Docker Compose - simplest correct path)

This runs the exact same `docker-compose.yml` on a cloud VM instead of your laptop.

1. Launch an EC2 instance (Ubuntu 22.04 LTS, `t3.small` or larger is comfortable for
   this app). Open inbound ports **22** (SSH), **5000** (API), **5173** (frontend) in
   its security group.
2. SSH in and install Docker:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
   sudo usermod -aG docker $USER && newgrp docker
   ```
3. Clone/copy this project onto the instance, then:
   ```bash
   cp .env.example .env   # set a real SECRET_KEY
   docker compose up -d --build
   ```
4. Visit `http://<ec2-public-ip>:5173`.

For a production-grade AWS setup beyond this (ECS Fargate + ECR + an Application
Load Balancer + RDS instead of SQLite, HTTPS via ACM) - that's a genuinely bigger
project on its own; the EC2 approach above is the correct minimal version of "this
runs on AWS" for a project at this stage.

## 3. Azure (VM + Docker Compose - same idea)

1. Create an Azure VM (`Standard_B2s` is enough), Ubuntu 22.04. Open ports 22, 5000,
   5173 in its Network Security Group.
2. SSH in, install Docker the same way as the AWS steps above.
3. Same `cp .env.example .env` + `docker compose up -d --build`.
4. Visit `http://<vm-public-ip>:5173`.

Azure Container Apps is the more "cloud-native" option (no VM to manage) - it needs
each image pushed to Azure Container Registry first (`az acr build`), then
`az containerapp up` per service. That's a reasonable next step once you want a
proper production deployment, but it's a separate piece of work from what's in this
repo today.

## Before deploying anywhere public

- [ ] Set a real, random `SECRET_KEY` in `.env` - never use the dev default.
- [ ] Change every default password (`admin123` etc.) immediately after first login -
      there's no forced-password-change flow yet, so this is manual.
- [ ] Put this behind HTTPS (a reverse proxy like nginx/Caddy with Let's Encrypt, or
      your cloud provider's load balancer) - the app itself doesn't terminate TLS.
- [ ] Restrict the security group / NSG to only the ports you actually need exposed.
- [ ] This is still a portfolio/student project at heart: no rate limiting beyond the
      login lockout, no automated backups of the SQLite file, no refresh tokens. Know
      that going in if you point it at anything real.
