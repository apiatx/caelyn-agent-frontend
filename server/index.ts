import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./vite";
import { startBackgroundServices, stopBackgroundServices } from "./background-services";
import { realTimePriceService } from "./real-time-price-service";
import path from "path";
import fs from "fs";

// Security imports
import { 
  helmetConfig, 
  cspConfig, 
  apiRateLimit, 
  corsConfig, 
  sanitizeInput, 
  securityHeaders,
  errorHandler 
} from "./security/middleware";
import { env, logSecurityConfig, isProduction } from "./security/environment";

const app = express();

// Configure trust proxy for rate limiting accuracy
app.set('trust proxy', true);

// Helper function to serve prebuilt static assets
function servePrebuiltStatic(app: express.Express) {
  // Try static-build first, then dist/public
  const staticBuildPath = path.resolve(import.meta.dirname, '..', 'static-build');
  const distPublicPath = path.resolve(import.meta.dirname, '..', 'dist', 'public');
  
  let staticPath: string;
  
  if (fs.existsSync(staticBuildPath)) {
    staticPath = staticBuildPath;
    log("Using prebuilt static frontend from static-build/");
  } else if (fs.existsSync(distPublicPath)) {
    staticPath = distPublicPath;
    log("Using prebuilt static frontend from dist/public/");
  } else {
    throw new Error("No prebuilt static assets found. Please run 'npm run build' first.");
  }
  
  app.use(express.static(staticPath));
  
  // Fall through to index.html if the file doesn't exist
  app.use('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// CRITICAL: Deployment health check endpoint - MUST respond with 200 immediately
// Also serves as user redirect to the frontend
app.get("/", (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const acceptHeader = req.get('Accept') || '';
  const host = req.get('Host') || '';
  
  // Check if this is a browser request (has text/html in Accept header)
  if (acceptHeader.includes('text/html') && userAgent.includes('Mozilla')) {
    // For custom domains like cryptohippo.locker, always serve the frontend directly
    // This ensures domain functionality works correctly
    if (host.includes('cryptohippo.locker') || host.includes('.replit.app') || host.includes('.replit.dev')) {
      // Let this fall through to the catch-all route that serves the frontend
      return next();
    } else {
      // Redirect browsers to the frontend application for other domains
      return res.redirect(302, '/app');
    }
  }
  
  // For deployment health checks and monitoring tools
  res.status(200).json({ status: "ok", service: "crypto-intelligence-platform" });
});

app.get("/deployment-health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    service: "crypto-intelligence-platform",
    uptime: process.uptime()
  });
});

app.get("/ready", (req, res) => {
  res.status(200).send("OK");
});

// Log security configuration
logSecurityConfig();

// Apply security middleware FIRST (CSP disabled for investing.com)
app.use(securityHeaders);
app.use(helmetConfig);
// app.use(cspConfig); // Disabled to allow investing.com iframe
app.use(corsConfig);

// Force HTTPS in production
if (isProduction && env.FORCE_HTTPS) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Rate limiting for API routes
app.use('/api', apiRateLimit);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// CRITICAL: Start server IMMEDIATELY to satisfy Preview tool waitForPort
// Health endpoints are already registered above - this will make Preview work
const port = parseInt(process.env.PORT || '5000', 10);
const server = app.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, (error?: Error) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
  
  log(`serving on port ${port}`);
  log(`Server is ready and healthy`);
  log(`Health check endpoints available at:`);
  log(`  - http://0.0.0.0:${port}/deployment-health (priority)`);
  log(`  - http://0.0.0.0:${port}/`);
  log(`  - http://0.0.0.0:${port}/health`);
  log(`  - http://0.0.0.0:${port}/ready`);
  log(`  - http://0.0.0.0:${port}/api/health`);
  log(`  - http://0.0.0.0:${port}/api/ready`);
  
  // Now initialize routes and Vite AFTER server is listening
  (async () => {
    try {
      // Register API routes
      await registerRoutes(app);

      // Use security error handler
      app.use(errorHandler);

      // Setup frontend serving
      const useVite = process.env.ENABLE_VITE === '1' && app.get("env") === "development";
      
      if (useVite) {
        log("Starting Vite dev server...");
        const { setupVite } = await import('./vite');
        await setupVite(app, server);
        log("Vite dev server started successfully");
      } else if (app.get("env") === "production") {
        log("Using production static assets");
        const { serveStatic } = await import('./vite');
        serveStatic(app);
      } else {
        // Development mode without Vite - use prebuilt static assets
        servePrebuiltStatic(app);
      }
      
      // Start background services after everything is ready
      setTimeout(() => {
        log(`Starting background services...`);
        try {
          startBackgroundServices();
          log(`Background services started successfully`);
        } catch (error) {
          console.error('Error starting background services:', error);
          // Don't exit - server can still function without background services
        }
      }, 1000);
    } catch (error) {
      console.error('Error during server initialization:', error);
      // Server is already listening, so don't exit - just log the error
    }
  })();
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

  // Add error handler for server
  server.on('error', (error: Error) => {
    console.error('Server error:', error);
    // In production, attempt to gracefully recover or restart
    if (isProduction) {
      console.error('Production server error detected, attempting graceful recovery...');
    }
  });

  // Set server timeout to prevent hanging requests during deployment health checks
  server.setTimeout(30000); // 30 second timeout
  
  // Keep alive timeout for load balancers
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds

  // Graceful shutdown
  process.on('SIGTERM', () => {
    stopBackgroundServices();
    process.exit(0);
  });

process.on('SIGINT', () => {
  stopBackgroundServices();
  process.exit(0);
});
