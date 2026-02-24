# RellPay Proxy — Fly.io Deployment

A lightweight Node.js Express proxy that routes all Relworx API calls through a **static IP** on Fly.io, so you can whitelist it in your Relworx dashboard.

## Setup

### 1. Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Deploy
```bash
cd proxy
fly launch --no-deploy
# Choose region: jnb (Johannesburg) for East Africa latency
```

### 3. Set Secrets
```bash
fly secrets set RELWORX_API_KEY="bd1c12983d4f62.B08-pR0ui8KkQhnqp5-LGA"
fly secrets set RELWORX_ACCOUNT_NO="RELA8A0E5D4A0"
fly secrets set PROXY_SECRET="your-strong-shared-secret-here"
```
> Generate a strong PROXY_SECRET: `openssl rand -hex 32`

### 4. Deploy
```bash
fly deploy
```

### 5. Allocate Static IP
```bash
fly ips allocate-v4
```
This gives you a **static IPv4** address. Whitelist it in your Relworx dashboard.

### 6. Verify
```bash
curl https://rellpay-proxy.fly.dev/health
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/relworx/collect` | Request payment (collection) |
| POST | `/relworx/send` | Send payment (payout) |
| POST | `/relworx/status` | Check transaction status |
| POST | `/relworx/balance` | Check wallet balance |

All endpoints (except `/health`) require `x-proxy-secret` header.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RELWORX_API_KEY` | Your Relworx API key |
| `RELWORX_ACCOUNT_NO` | Your Relworx business account number |
| `PROXY_SECRET` | Shared secret for authenticating edge function calls |
| `PORT` | Server port (default: 3000) |
