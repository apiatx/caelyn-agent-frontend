#!/usr/bin/env node

// CryptoHippo Production Server with FULL API Support
// This server runs the complete Express application with API routes
// Ensures proper deployment functionality for cryptohippo.locker

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 CryptoHippo Production Deployment');
console.log('📡 Starting full Express server with API routes...');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '8080';

// Start the actual Express server from dist/index.js
const serverProcess = spawn('node', ['dist/index.js'], {
  cwd: __dirname,
  env: process.env,
  stdio: 'inherit'
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`🛑 Server exited with code ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down...');
  serverProcess.kill('SIGINT');
});

