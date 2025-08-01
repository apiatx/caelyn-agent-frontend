import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startBackgroundServices, stopBackgroundServices } from "./background-services";
import { realTimePriceService } from "./real-time-price-service";

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

// ABSOLUTE PRIORITY: Deployment health check endpoints - must be first
app.get("/deployment-health", (req, res) => {
  res.status(200).send("OK");
});

// CRITICAL: Deployment health check that works with Vite frontend serving
app.get("/", (req, res, next) => {
  // Check if this looks like a deployment health check
  const userAgent = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';
  
  // Deployment systems typically don't include 'text/html' in Accept header
  // or use specific user agents
  const looksLikeHealthCheck = (
    !accept.includes('text/html') ||
    userAgent.includes('curl') ||
    userAgent.includes('wget') ||
    userAgent.includes('health') ||
    userAgent.includes('deployment') ||
    userAgent.includes('replit') ||
    req.query.health === 'true'
  );
  
  if (looksLikeHealthCheck) {
    res.status(200).send("OK");
  } else {
    // Continue to Vite middleware for frontend serving
    next();
  }
});

// Additional health check endpoints for monitoring
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

(async () => {
  const server = await registerRoutes(app);

  // Use security error handler
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  server.listen({
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
    
    // Start background services AFTER server is confirmed running
    // Longer delay to ensure deployment health checks pass before background services start
    setTimeout(() => {
      log(`Starting background services...`);
      try {
        // Use a nested setTimeout to further isolate from server startup
        setTimeout(() => {
          startBackgroundServices();
          log(`Background services started successfully`);
        }, 1000);
      } catch (error) {
        console.error('Error starting background services:', error);
        // Don't exit - server can still function without background services
      }
    }, 5000); // 5 second delay to ensure server is stable for deployment health checks
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
})();
