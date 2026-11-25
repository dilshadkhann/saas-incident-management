# OpsHub Production Deployment

## Requirements
- Docker Engine and Docker Compose v2
- Production server with a domain name
- TLS-terminating reverse proxy or load balancer

## Configure
1. Copy `.env.production.example` to `.env.production`.
2. Set a strong, unique, URL-safe alphanumeric `POSTGRES_PASSWORD`.
3. Set a cryptographically random `SECRET_KEY`.
4. Set `CORS_ORIGINS` to the exact HTTPS frontend origin as a JSON array.
5. Never commit `.env.production` or expose its secrets.

## Deploy
Validate configuration:
```powershell
docker compose -f compose.production.yaml --env-file .env.production config --quiet
```
Build and start:
```powershell
docker compose -f compose.production.yaml --env-file .env.production up -d --build
```
The API applies Alembic migrations before starting. PostgreSQL data is stored in the named volume `opshub-production-postgres-data`.

## Verify and troubleshoot
```powershell
docker compose -f compose.production.yaml --env-file .env.production ps
docker compose -f compose.production.yaml --env-file .env.production logs --tail 100
```

## HTTPS and network security
The web container listens on port 80. Place it behind a TLS-terminating reverse proxy or load balancer. Forward `X-Forwarded-Proto: https` and redirect HTTP to HTTPS. Keep PostgreSQL and the API internal; expose only the web entry point. Secure session cookies require HTTPS.

## Updates
Deploy reviewed releases:
```powershell
git pull
docker compose -f compose.production.yaml --env-file .env.production up -d --build
```
Test migrations in staging before production releases.

## Backups
Create a database backup:
```powershell
docker compose -f compose.production.yaml --env-file .env.production exec -T db pg_dump -U opshub -d opshub > .\opshub-backup.sql
```
Store backups securely off-server and test restoration periodically. Treat backups as sensitive data.

## Recovery
A restore can overwrite existing data. Take a fresh backup first and restore only into an intentionally prepared target database. Never remove the production database volume during routine updates. Do not run `docker compose down -v` against a live deployment.
