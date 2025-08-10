# Deployment Guide

This guide provides multiple solutions for the deployment error: "Command 'static-build' not found in the system PATH"

## Available Deployment Methods

### Method 1: Direct Node.js Server (Recommended)
Use the production server script that handles everything automatically:

```bash
node serve-production.js
```

**Replit Deployment Configuration:**
- Run command: `node serve-production.js`

This script:
- Automatically detects existing build files
- Serves from `static-build/` if available, otherwise `dist/public/`
- Includes production security headers
- Provides health check endpoint

### Method 2: Build + Serve Script
Use the shell script that builds and serves:

```bash
bash run-static-build.sh
```

**Replit Deployment Configuration:**
- Run command: `bash run-static-build.sh`

### Method 3: Complete Deployment Server
Use the all-in-one deployment script:

```bash
node deployment-server.js
```

**Replit Deployment Configuration:**
- Run command: `node deployment-server.js`

This script:
- Runs `npm run build` automatically
- Creates static deployment structure
- Starts production server

### Method 4: Manual Build + Serve
If you prefer manual control:

```bash
# Step 1: Build the application
npm run build

# Step 2: Create static deployment
node static-deployment-fix.js

# Step 3: Serve the static files
node static-server.js
```

## Troubleshooting

### Error: "Command 'static-build' not found"
**Solution:** Use one of the methods above instead of the `static-build` command.

### Error: "Build files not found"
**Solution:** Run `npm run build` first to create the build files.

### Error: "Port already in use"
**Solution:** Change the PORT environment variable or kill existing processes.

## File Structure After Deployment

```
project/
├── dist/public/          # Vite build output
├── static-build/         # Deployment-ready files
│   ├── index.html       # Fixed paths for static hosting
│   └── assets/          # CSS, JS, images
├── serve-production.js   # Production server (recommended)
├── deployment-server.js  # All-in-one deployment
├── run-static-build.sh  # Build + serve script
└── static-server.js     # Static file server
```

## Recommended Configuration

For Replit Autoscale deployment, use:

**Build Command:** `npm run build`
**Run Command:** `node serve-production.js`

This provides the most reliable deployment with automatic build detection and production optimizations.