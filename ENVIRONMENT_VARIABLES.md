# Elite Gate Backend - Environment Variables Template

## Required Environment Variables for Vercel

Copy and paste these exact values into your Vercel project settings:

### Database Configuration
```
DATABASE_HOST=aws-0-eu-central-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_USER=postgres.sghvszzxubiyocwhfczj
DATABASE_PASSWORD=ahmedshtya-083
DATABASE_NAME=elite-gate
```

### JWT Configuration
```
JWT_SECRET=my-secret-key
JWT_EXPIRE=2d
JWT_REFRESH_EXPIRE=30d
```

### Email Configuration
```
EMAIL_USER=ahmedabdelrhman083@gmail.com
EMAIL_PASS=joef jjeb mmgt gkns
```

### Application Configuration
```
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Optional Support Configuration
```
SUPPORT_PHONE=+966500000000
SUPPORT_EMAIL=support@realestate.com
```

## Steps to Add in Vercel:

1. Go to https://vercel.com
2. Click on your **elite-backend** project
3. Click **Settings** tab
4. Click **Environment Variables** (left sidebar)
5. For each variable above:
   - Click **"Add New"** button
   - Paste the **Name** (left column)
   - Paste the **Value** (right column)
   - ✅ Check boxes: **Production**, **Preview**, **Development**
   - Click **Save**

## Verification

After adding all variables, redeploy:
1. Go to **Deployments** tab
2. Click on latest deployment
3. Click **⋮ menu** → **Redeploy**
4. Check logs for "✅" success messages

## Development vs Production

The app now includes:
- **Development fallbacks** for local testing
- **Production optimizations** for Vercel
- **Error handling** for missing variables
- **Graceful degradation** for optional services
