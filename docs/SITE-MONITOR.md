# Site Monitor

Monitors the GitHub Pages deployment of this repo every 15 minutes.

## What It Does

- Checks `https://ai-lish.github.io/virtual-office/` every 15 minutes
- Verifies HTTP 200 response
- Validates `copilot-static.html` loads with data
- Logs heartbeat to `scripts/site-monitor.log`
- Sends Discord notification on failure (after 1 consecutive failure)
- Sends recovery notification when site comes back up

## Files

- `scripts/site-monitor.sh` — the monitoring script
- `scripts/site-monitor.log` — heartbeat/error log
- `scripts/site-monitor.failcount` — consecutive failure counter
- `scripts/site-monitor.lock` — prevents concurrent runs
- `~/Library/LaunchAgents/com.openclaw.virtual-office-site-monitor.plist` — launchd agent

## Setup

The monitoring agent is installed as a **launchd** agent (macOS-native scheduler, preferred over cron on macOS 13+).

### Installation (already done)

```bash
launchctl load ~/Library/LaunchAgents/com.openclaw.virtual-office-site-monitor.plist
```

### Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.openclaw.virtual-office-site-monitor.plist
rm ~/Library/LaunchAgents/com.openclaw.virtual-office-site-monitor.plist
```

### Manual run

```bash
bash scripts/site-monitor.sh
```

### View logs

```bash
tail -f scripts/site-monitor.log
```

## Discord Notifications

To enable Discord notifications, set the `DISCORD_WEBHOOK_URL` environment variable before loading the agent, or edit the script to set `DISCORD_WEBHOOK_URL` directly.

Get a webhook from your Discord server: Server Settings → Integrations → Webhooks → New Webhook.

## GitHub Pages URL

Production: `https://ai-lish.github.io/virtual-office/`

Note: This URL was migrated from `math-lish.github.io` to `ai-lish.github.io`.
