# Webhook URLs

## Cloudflare Quick Tunnel (Temporary)
- **Quota Webhook**: `https://alternate-registration-championship-oils.trycloudflare.com/webhook/copilot-quota`
- **Analysis Webhook**: `https://alternate-registration-championship-oils.trycloudflare.com/webhook/copilot-analysis`

## Local (for testing)
- **Quota Webhook**: `http://localhost:5678/webhook/copilot-quota`
- **Analysis Webhook**: `http://localhost:5678/webhook/copilot-analysis`

## Notes
- Quick tunnel URL changes each time cloudflared restarts
- For production: set up a named Cloudflare Tunnel with a fixed hostname
- n8n workflow "Copilot Usage API" (id: copilot-api-v3) is active
