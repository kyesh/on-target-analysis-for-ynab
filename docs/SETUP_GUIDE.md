# On Target Analysis for YNAB - Setup Guide

## Prerequisites

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **YNAB Account** - Active You Need A Budget subscription
- **YNAB OAuth Application** - OAuth Client ID from YNAB Developer Settings

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure YNAB OAuth Access

#### Register Your OAuth Application
1. Log into your YNAB account
2. Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
3. Click **"New Application"**
4. Fill in application details:
   - **Application Name**: On Target Analysis for YNAB (Local)
   - **Description**: Budget target alignment analysis tool
   - **Redirect URI**: `http://localhost:3000/auth/callback`
5. Click **"Save"**
6. **Copy the Client ID** (you'll need this for configuration)on't be able to see it again)

#### Configure Environment Variables
1. Create a `.env.local` file in the project root
2. Add your YNAB OAuth Client ID:

```env
NEXT_PUBLIC_YNAB_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Example:**
```env
NEXT_PUBLIC_YNAB_CLIENT_ID=abc123def456ghi789
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start the Application

```bash
npm run dev
```

### 4. Verify Setup

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click **"Connect to YNAB"** to start the OAuth flow
3. You'll be redirected to YNAB to authorize the application
4. After authorization, you'll be redirected back to the application
5. Verify you can see your budgets and select one for analysis

## Troubleshooting

### Common Issues

#### "Missing required environment variables"
**Problem:** The `.env.local` file is missing or doesn't contain the required variables.

**Solution:**
1. Ensure `.env.local` exists in the project root
2. Verify it contains: `NEXT_PUBLIC_YNAB_CLIENT_ID=your-client-id-here`
3. Restart the development server: `npm run dev`

#### "OAuth authorization failed"
**Problem:** The OAuth flow is not working correctly.

**Solution:**
1. Verify your Client ID is correct in `.env.local`
2. Ensure the redirect URI in YNAB matches exactly: `http://localhost:3000/auth/callback`
3. Check that your YNAB OAuth application is active
4. Clear browser cache and try again

#### "Unable to connect to YNAB API"
**Problem:** Authentication or API connection issues.

**Solutions:**
1. **Re-authorize with YNAB:**
   - Click "Connect to YNAB" again to restart the OAuth flow
   - Ensure you grant all requested permissions

2. **Check OAuth application:**
   - Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
   - Verify your application is still active
   - Ensure the redirect URI is correct

3. **Check internet connection:**
   - Ensure you can access https://api.ynab.com in your browser

#### "Configuration validation failed"
**Problem:** Environment setup is incomplete.

**Solution:**
1. Check that all required variables are set:
   ```env
   NEXT_PUBLIC_YNAB_CLIENT_ID=your-client-id-here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
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
| `NEXT_PUBLIC_YNAB_CLIENT_ID` | Your YNAB OAuth Client ID | `abc123def456ghi789` |
| `NEXT_PUBLIC_APP_URL` | Application URL for OAuth redirects | `http://localhost:3000` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.ynab.com/v1` | YNAB API base URL |
| `NEXT_PUBLIC_ENABLE_DEBUG` | `false` | Enable debug mode |

## Security Notes

### OAuth Security
- **Never commit** your `.env.local` file to version control
- **Don't share** your OAuth Client ID publicly (though it's less sensitive than tokens)
- **Revoke OAuth access** in YNAB settings if compromised
- **Use environment variables** for configuration

### Local Development
- The application runs locally only
- No data is sent to external servers (except YNAB API)
- All processing happens on your machine
- OAuth tokens are stored securely in browser memory only

## Next Steps

Once setup is complete:

1. **Authorize with YNAB** - Complete the OAuth flow to connect your account
2. **Select a Budget** - Choose which budget to analyze
3. **Explore Features** - Use the dashboard to analyze your budget targets
4. **Review Documentation** - Check other docs for feature details
5. **Report Issues** - Use GitHub issues for any problems

## Getting Help

### Check These First
1. **Console Errors** - Open browser developer tools
2. **Server Logs** - Check the terminal running `npm run dev`
3. **Network Tab** - Verify API requests in browser dev tools
4. **YNAB Status** - Check [YNAB Status Page](https://status.ynab.com/)

### Common Solutions
- Restart the development server
- Clear browser cache and cookies
- Re-authorize with YNAB OAuth
- Check internet connection
- Verify YNAB account is active
- Ensure OAuth application is configured correctly

### Still Need Help?
- Review the [troubleshooting section](#troubleshooting)
- Check the project documentation in `/docs`
- Verify your YNAB account has API access enabled
