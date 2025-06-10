# YNAB Off-Target Assignment Analysis - Setup Guide

## Prerequisites

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **YNAB Account** - Active You Need A Budget subscription
- **YNAB API Access** - Personal Access Token from YNAB

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure YNAB API Access

#### Get Your Personal Access Token
1. Log into your YNAB account
2. Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
3. Click **"New Token"**
4. Enter a name for your token (e.g., "Off-Target Analysis")
5. Click **"Generate"**
6. **Copy the token immediately** (you won't be able to see it again)

#### Configure Environment Variables
1. Open the `.env.local` file in the project root
2. Replace the placeholder token with your actual token:

```env
YNAB_ACCESS_TOKEN=your-actual-token-here
```

**Example:**
```env
YNAB_ACCESS_TOKEN=EXAMPLE-TOKEN-DO-NOT-USE-REAL-TOKEN-HERE
```

### 3. Start the Application

```bash
npm run dev
```

### 4. Verify Setup

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Check the **System Status** section
3. Verify you see:
   - ✅ **Configuration: Valid**
   - ✅ **YNAB API Connection: Connected**

## Troubleshooting

### Common Issues

#### "Missing required environment variables"
**Problem:** The `.env.local` file is missing or doesn't contain the required variables.

**Solution:**
1. Ensure `.env.local` exists in the project root
2. Verify it contains: `YNAB_ACCESS_TOKEN=your-token-here`
3. Restart the development server: `npm run dev`

#### "Invalid YNAB access token format"
**Problem:** The token format is incorrect.

**Solution:**
1. Verify your token is a 43-character alphanumeric string (like: `EXAMPLE-TOKEN-DO-NOT-USE-REAL-TOKEN-HERE`)
2. Ensure there are no extra spaces or characters
3. Generate a new token if needed

#### "Unable to connect to YNAB API"
**Problem:** The token is invalid or expired.

**Solutions:**
1. **Check token validity:**
   - Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
   - Verify your token is still listed and active
   
2. **Generate new token:**
   - Delete the old token in YNAB settings
   - Create a new token
   - Update `.env.local` with the new token
   
3. **Check internet connection:**
   - Ensure you can access https://api.ynab.com in your browser

#### "Configuration validation failed"
**Problem:** Environment setup is incomplete.

**Solution:**
1. Check that all required variables are set:
   ```env
   YNAB_ACCESS_TOKEN=your-token-here
   NODE_ENV=development
   ```
2. Restart the development server
3. Clear browser cache if needed

### Development Server Issues

#### Port 3000 Already in Use
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

#### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Compilation Errors
```bash
# Check TypeScript configuration
npm run type-check

# Clear Next.js cache
rm -rf .next
npm run dev
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `YNAB_ACCESS_TOKEN` | Your YNAB Personal Access Token | `EXAMPLE-TOKEN-DO-NOT-USE-REAL-TOKEN-HERE` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.ynab.com/v1` | YNAB API base URL |
| `RATE_LIMIT_REQUESTS_PER_HOUR` | `200` | API rate limit |
| `CACHE_TTL_SECONDS` | `300` | Cache time-to-live |
| `ENABLE_SECURITY_HEADERS` | `true` | Enable security headers |
| `LOG_LEVEL` | `info` | Logging level |

## Security Notes

### Token Security
- **Never commit** your `.env.local` file to version control
- **Don't share** your Personal Access Token
- **Regenerate tokens** if compromised
- **Use environment variables** only for token storage

### Local Development
- The application runs locally only
- No data is sent to external servers (except YNAB API)
- All processing happens on your machine
- Tokens are stored in environment variables only

## Next Steps

Once setup is complete:

1. **Verify Connection** - Ensure the status page shows "Connected"
2. **Explore Features** - The dashboard will be available soon
3. **Review Documentation** - Check other docs for feature details
4. **Report Issues** - Use GitHub issues for any problems

## Getting Help

### Check These First
1. **Console Errors** - Open browser developer tools
2. **Server Logs** - Check the terminal running `npm run dev`
3. **Network Tab** - Verify API requests in browser dev tools
4. **YNAB Status** - Check [YNAB Status Page](https://status.ynab.com/)

### Common Solutions
- Restart the development server
- Clear browser cache and cookies
- Regenerate YNAB access token
- Check internet connection
- Verify YNAB account is active

### Still Need Help?
- Review the [troubleshooting section](#troubleshooting)
- Check the project documentation in `/docs`
- Verify your YNAB account has API access enabled
