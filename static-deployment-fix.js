#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🔧 Creating bulletproof static deployment...');

// Step 1: Fix paths and create proper static build
const publicDir = path.join(process.cwd(), 'dist', 'public');
const staticDir = path.join(process.cwd(), 'static-build');

// Remove any existing static build
if (fs.existsSync(staticDir)) {
  fs.rmSync(staticDir, { recursive: true, force: true });
}

// Create new static build directory
fs.mkdirSync(staticDir, { recursive: true });

if (fs.existsSync(publicDir)) {
  // Copy index.html and fix paths
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf-8');
    
    // Fix absolute paths to relative paths
    html = html.replace(/src="\/assets\//g, 'src="./assets/');
    html = html.replace(/href="\/assets\//g, 'href="./assets/');
    
    // Remove Replit dev banner for production
    html = html.replace(/<script type="text\/javascript" src="https:\/\/replit\.com\/public\/js\/replit-dev-banner\.js"><\/script>/g, '');
    
    fs.writeFileSync(path.join(staticDir, 'index.html'), html);
    console.log('✅ Fixed index.html with relative paths');
  }
  
  // Copy assets folder
  const assetsSource = path.join(publicDir, 'assets');
  const assetsDest = path.join(staticDir, 'assets');
  
  if (fs.existsSync(assetsSource)) {
    fs.cpSync(assetsSource, assetsDest, { recursive: true });
    console.log('✅ Copied assets folder');
  }
  
  // Verify files exist
  const staticIndexPath = path.join(staticDir, 'index.html');
  const staticAssetsPath = path.join(staticDir, 'assets');
  
  if (fs.existsSync(staticIndexPath) && fs.existsSync(staticAssetsPath)) {
    const assetsFiles = fs.readdirSync(staticAssetsPath);
    console.log('✅ Static build created successfully:');
    console.log(`   - index.html: ${fs.statSync(staticIndexPath).size} bytes`);
    console.log(`   - assets/: ${assetsFiles.length} files`);
    console.log('🚀 Deploy from static-build/ directory');
  } else {
    console.log('❌ Static build verification failed');
    process.exit(1);
  }
  
} else {
  console.log('❌ dist/public/ not found');
  process.exit(1);
}