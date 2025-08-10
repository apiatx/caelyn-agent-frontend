#!/usr/bin/env node

// Optimized Cloud Run server for production deployment
// This server builds and serves the application automatically
// Suitable for Cloud Run deployment type

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Cloud Run server starting...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`🔌 Port: ${PORT}`);

let isReady = false;
let buildError = null;

// Graceful shutdown handling for Cloud Run
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

async function buildApplication() {
  try {
    console.log('🔧 Building application...');
    
    // Run the build process
    await execAsync('npm run build', { 
      cwd: __dirname,
      timeout: 300000 // 5 minutes timeout
    });
    
    console.log('✅ Build completed successfully');
    
    // Create static deployment structure
    console.log('📦 Creating deployment structure...');
    await execAsync('node static-deployment-fix.js', {
      cwd: __dirname,
      timeout: 30000 // 30 seconds timeout
    });
    
    console.log('✅ Deployment structure created');
    isReady = true;
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    buildError = error;
    isReady = false;
  }
}

// Determine static path
function getStaticPath() {
  // Priority: static-build > dist/public > fallback
  const staticBuild = path.join(__dirname, 'static-build');
  const distPublic = path.join(__dirname, 'dist', 'public');
  
  if (fs.existsSync(staticBuild)) {
    return staticBuild;
  } else if (fs.existsSync(distPublic)) {
    return distPublic;
  } else {
    return null;
  }
}

// Cloud Run health check endpoints
app.get('/health', (req, res) => {
  const staticPath = getStaticPath();
  res.json({
    status: isReady ? 'healthy' : 'building',
    ready: isReady,
    buildError: buildError ? buildError.message : null,
    staticPath: staticPath ? path.relative(__dirname, staticPath) : null,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/readiness', (req, res) => {
  if (isReady) {
    res.status(200).send('Ready');
  } else {
    res.status(503).send('Not Ready');
  }
});

// Serve static files once ready
app.use((req, res, next) => {
  if (!isReady && !req.path.startsWith('/health') && !req.path.startsWith('/readiness')) {
    return res.status(503).json({
      error: 'Service building',
      message: 'Application is still building, please wait...',
      buildError: buildError ? buildError.message : null
    });
  }
  next();
});

// Security and performance middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Cache headers for static assets
  if (req.path.includes('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
  }
  
  next();
});

// Configure static file serving
app.use((req, res, next) => {
  const staticPath = getStaticPath();
  
  if (!staticPath || !fs.existsSync(staticPath)) {
    return res.status(500).json({
      error: 'Static files not found',
      message: 'Application build files are not available'
    });
  }
  
  express.static(staticPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    index: false // Handle index manually for SPA routing
  })(req, res, next);
});

// Handle SPA routing - serve index.html for non-API routes
app.get('*', (req, res) => {
  const staticPath = getStaticPath();
  
  if (!staticPath) {
    return res.status(500).json({
      error: 'Application not ready',
      message: 'Static files are not available'
    });
  }
  
  const indexPath = path.join(staticPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      error: 'Application not found',
      message: 'Index file is not available'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Cloud Run server running on port ${PORT}`);
  console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔍 Readiness check: http://0.0.0.0:${PORT}/readiness`);
  
  // Start build process after server is running
  await buildApplication();
  
  if (isReady) {
    const staticPath = getStaticPath();
    console.log(`📂 Serving from: ${path.relative(__dirname, staticPath)}`);
    
    if (fs.existsSync(staticPath)) {
      const files = fs.readdirSync(staticPath);
      console.log(`📋 Serving ${files.length} files/directories`);
    }
    
    console.log('🎉 Application ready for traffic!');
  } else {
    console.log('❌ Application failed to build, check logs above');
  }
});