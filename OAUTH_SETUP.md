# OAuth Configuration Guide

This guide explains how to set up Google OAuth for both local development and Cloud Run deployment.

## Problem

The app works locally with OAuth but fails in Cloud Run with `401: invalid_client` error. This happens because:

- **Local development**: Uses `localhost` domain
- **Cloud Run**: Uses `ratio.ai` domain
- **Current OAuth client**: Only configured for `localhost`

Google's OAuth server rejects requests from domains not explicitly authorized for the client ID.

## Solution

Add both domains to your existing OAuth client ID so it works for both local development and production.

## Step 1: Create Production OAuth Client ID

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)

2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**

3. Configure the client:
   - **Application type**: Web application
   - **Name**: "ratio.ai Production Client"
   - **Authorized JavaScript origins**: 
     - `https://ratio.ai`
   - **Authorized redirect URIs**: 
     - `https://ratio.ai`

4. Copy the **Client ID** that gets generated

## Step 2: Configure Environment Variables

### Local Development (.env file)
Keep your existing client ID in `frontend/.env`:
```
REACT_APP_GOOGLE_CLIENT_ID=222526998280-58pu3m2hbhp54kkn2ikddiof5admmamv.apps.googleusercontent.com
```

### Cloud Run Deployment
Set the production client ID as an environment variable in Cloud Run:

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Select your service
3. Click **Edit & Deploy New Revision**
4. Go to **Variables & Secrets** tab
5. Add environment variable:
   - **Name**: `REACT_APP_GOOGLE_CLIENT_ID`
   - **Value**: [Your new production client ID]
6. Deploy the revision

## Step 3: Verify Configuration

### Local Testing
1. Run `npm start` in the frontend directory
2. Open browser console and look for debug logs:
   ```
   Google Client ID: Loaded
   Client ID value: 222526998280-...
   ```
3. Try OAuth sign-in - should work on localhost

### Production Testing
1. Deploy to Cloud Run
2. Visit https://ratio.ai
3. Open browser console - should show the production client ID
4. Try OAuth sign-in - should now work in production

## Common Issues

### Issue: Still getting 401 after setup
**Solution**: Make sure you're using the correct domain in the OAuth client configuration. Check that `https://ratio.ai` exactly matches your Cloud Run service URL.

### Issue: Works in production but breaks locally
**Solution**: Your local `.env` file might have been overwritten. Restore the localhost client ID for local development.

### Issue: Environment variable not loading in Cloud Run
**Solution**: 
1. Verify the environment variable is set in Cloud Run console
2. Redeploy the service
3. Check the revision is using the new environment variable

## Security Notes

- Keep both client IDs secure
- Never commit production client IDs to version control
- Use environment variables for all OAuth configuration
- Regularly rotate OAuth client secrets if using client secrets

## Current Status

- ✅ Local OAuth client ID configured in `.env`
- ❌ Production OAuth client ID needs to be created and configured in Cloud Run
- ❌ Cloud Run environment variable needs to be set

## Next Steps

1. Create the production OAuth client ID following Step 1
2. Configure the Cloud Run environment variable following Step 2
3. Test the deployment to verify OAuth works in production
