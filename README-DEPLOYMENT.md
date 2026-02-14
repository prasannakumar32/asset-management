# Deployment Guide - Asset Tracker

## Local Development

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start local server:
   ```bash
   npm run dev
   ```

## Production Deployment (Render)

### Option 1: Using Render Dashboard (Recommended)

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up for free account

2. **Create PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Name: `asset-tracker-db`
   - Database Name: `asset_tracker`
   - User: `asset_tracker_user`
   - Plan: Free
   - Click "Create Database"

3. **Get Database Connection Details**
   - Go to your database dashboard
   - Copy the "External Database URL"
   - Format: `postgres://username:password@host:port/database`

4. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add Environment Variables:
     - `NODE_ENV`: `production`
     - `SESSION_SECRET`: (generate random string)
     - `DATABASE_URL`: (paste from step 3)

5. **Deploy**
   - Render will automatically deploy on push to main branch

### Option 2: Using render.yaml (Automatic)

1. Push the `render.yaml` file to your repository
2. Connect your repository to Render
3. Render will automatically create both database and web service

## Environment Variables

### Production Required:
- `NODE_ENV=production`
- `DATABASE_URL=postgres://user:pass@host:port/db`
- `SESSION_SECRET=random-secret-string`

### Optional:
- `PORT=3000` (Render sets this automatically)

## Database Migration

The application automatically syncs database tables on startup. Your existing data structure will be preserved.

## Free Tier Limitations

- **Render PostgreSQL**: 1GB storage, 30-day limit
- **Render Web Service**: Spins down after 15 minutes inactivity
- **Database**: No automatic backups on free tier

## Testing Production

1. After deployment, visit your Render URL
2. Test login functionality
3. Verify database operations work correctly

## Troubleshooting

### Database Connection Issues
- Check DATABASE_URL format
- Ensure SSL is enabled for production
- Verify database user permissions

### Application Errors
- Check Render logs
- Verify all dependencies are in package.json
- Ensure PORT is correctly configured

### Performance Issues
- Free tier has limited resources
- Consider upgrading for production use
- Monitor database usage (1GB limit)
