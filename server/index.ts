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
  }, () => {
    log(`serving on port ${port}`);
    // Start background services for real-time monitoring
    startBackgroundServices();
  });

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
