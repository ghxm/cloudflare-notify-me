# Cloudflare Notify Me

A personal notification hub running on Cloudflare Workers that accepts POST requests and dispatches notifications to your configured contact channels.

## Features

- **Single Endpoint**: One URL to send notifications from anywhere
- **Contact Labels**: Use simple labels like 'personal', 'work', 'urgent' instead of raw addresses
- **Contact Groups**: Send to multiple contacts with group labels like 'all', 'important'
- **Optional Authentication**: Secure your endpoint with a token

## Quick Start

1. **Configure:**
   ```bash
   npm install -g wrangler
   # Copy .dev.vars and add your configuration
   ```

2. **Deploy:**
   ```bash
   wrangler deploy
   ```

3. **Send a notification:**
   ```bash
   curl -X POST https://your-worker.your-subdomain.workers.dev \
     -H "Content-Type: application/json" \
     -H "Authorization: your-auth-token" \
     -d '{
       "subject": "Test Alert",
       "message": "This is a test notification from my monitoring system.",
       "recipients": ["personal"]
     }'
   ```

## Configuration

### Environment Variables

For local development, configure `.dev.vars`. For production, set these in Cloudflare Workers dashboard.

#### Authentication (Optional)
- `AUTH_ENABLED`: Set to "true" to enable token authentication
- `AUTH_TOKEN`: Your secret authentication token

#### Email Service
Choose one email service option:

**Fastmail JMAP (Recommended)**
- `FASTMAIL_API_TOKEN`: Your Fastmail API token (from Settings > Privacy & Security > Integrations)
- `FASTMAIL_USERNAME`: Your Fastmail email address for authentication
- `FROM_EMAIL` (optional): Override the sending email address

**Email Service API**
- `EMAIL_SERVICE_URL`: API endpoint (e.g., https://api.resend.com/emails)
- `EMAIL_API_KEY`: Your API key

**Gmail API**
- `GMAIL_ACCESS_TOKEN`: OAuth access token for Gmail API

#### Contact Configuration

**Individual Contact Variables (for .dev.vars)**
- `CONTACT_PERSONAL`: Personal email address
- `CONTACT_WORK`: Work email address
- `CONTACT_URGENT`: Urgent notifications email

**Production Contact Configuration**
- `CONTACTS_CONFIG`: JSON string containing all contact configuration (see example in .dev.vars)

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
- Use environment variables or Cloudflare's secret storage for sensitive data
- Consider IP allowlisting if you only need to trigger notifications from specific sources
- The endpoint supports CORS but you may want to restrict origins for browser-based usage

## Roadmap

- [ ] Webhook support  
- [ ] Message templates and variables
- [ ] Rate limiting and spam protection
- [ ] Message delivery confirmation and retries