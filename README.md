# Cloudflare Notify Me

A personal notification hub running on Cloudflare Workers that accepts POST requests and dispatches notifications to your configured contact channels.

- Single endpoint for notifications from anywhere
- Contact labels ('personal', 'work', 'urgent') instead of raw addresses  
- Contact groups ('all', 'important') for multiple recipients
- Optional token authentication

## Quick Start

```bash
npm install -g wrangler
# Configure .dev.vars with your settings
wrangler deploy
```

Send a notification:
```bash
curl -X POST https://your-worker.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: your-auth-token" \
  -d '{"subject": "Test Alert", "message": "Hello from my system", "recipients": ["personal"]}'
```

## Configuration

### Environment Variables

Configure in `.dev.vars` for local development, or Cloudflare Workers dashboard for production.

#### Email Service (choose one)
- `FASTMAIL_API_TOKEN` + `FASTMAIL_USERNAME`: Fastmail JMAP
- `EMAIL_SERVICE_URL` + `EMAIL_API_KEY`: Resend, SendGrid, etc.

#### Contacts
- `CONTACT_PERSONAL`, `CONTACT_WORK`, `CONTACT_URGENT`: Individual email addresses
- `CONTACTS_CONFIG`: JSON string for production (see .dev.vars example)

#### Authentication (optional)
- `AUTH_ENABLED`: Set to "true" to enable token auth
- `AUTH_TOKEN`: Your secret token

### Contact Labels

The system comes with predefined contact labels:

**Individual Contacts:**
- `personal`: Your personal email
- `work`: Your work email
- `urgent`: Email for urgent notifications

**Contact Groups:**
- `all`: Sends to personal and work
- `important`: Sends to work and urgent
- `family`: Sends to personal

## API Usage

### Request Format

```json
{
  "subject": "Alert Title",
  "message": "Detailed message body with any information you want to include.",
  "recipients": ["personal", "work"]
}
```

### Fields

- **subject** (required): Notification title/subject line
- **message** (required): The notification message body
- **recipients** (optional): Array of contact labels or groups. Defaults to `["personal"]`

### Response Format

```json
{
  "success": true,
  "message": "All notifications sent successfully",
  "sent": {
    "email": ["personal@example.com", "work@example.com"]
  },
  "errors": []
}
```

### Authentication

If authentication is enabled, include your token in the Authorization header:

```bash
-H "Authorization: Bearer your-token-here"
# or simply
-H "Authorization: your-token-here"
```

## Integration Examples

### Monitoring Script
```bash
#!/bin/bash
if ! ping -c 1 google.com &> /dev/null; then
  curl -X POST https://your-worker.workers.dev \
    -H "Authorization: your-token" \
    -H "Content-Type: application/json" \
    -d '{"subject":"Internet Down","message":"Internet connection lost at $(date)","recipients":["urgent"]}'
fi
```

### GitHub Actions
```yaml
- name: Notify on deployment failure
  if: failure()
  run: |
    curl -X POST https://your-worker.workers.dev \
      -H "Authorization: ${{ secrets.NOTIFY_TOKEN }}" \
      -H "Content-Type: application/json" \
      -d '{"subject":"Deployment Failed","message":"GitHub Actions deployment failed for ${{ github.repository }}","recipients":["work"]}'
```

### Cron Job
```bash
# Add to crontab: 0 */6 * * * /path/to/backup-check.sh
#!/bin/bash
if [ ! -f /tmp/backup-success ]; then
  curl -X POST https://your-worker.workers.dev \
    -H "Authorization: your-token" \
    -H "Content-Type: application/json" \
    -d '{"subject":"Backup Missing","message":"Daily backup file not found","recipients":["important"]}'
fi
```

## Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run locally:**
   ```bash
   wrangler dev
   ```

3. **Test the endpoint:**
   ```bash
   curl -X POST http://localhost:8787 \
     -H "Content-Type: application/json" \
     -d '{"subject":"Test","message":"Hello from localhost","recipients":["personal"]}'
   ```

## Security Notes

- Keep your `AUTH_TOKEN` secure and use a strong, random value
- For production security, use Cloudflare Access instead of token authentication
- Consider IP allowlisting if you only need to trigger notifications from specific sources

## Roadmap

- [ ] Webhook support  
- [ ] Message templates and variables
- [ ] Rate limiting and spam protection
- [ ] Message delivery confirmation and retries