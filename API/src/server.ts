import express from 'express';
import { corsConfig, rateLimiter } from './config/cors.js';
import { connectDatabases, teamDBClient, playerDBClient } from './config/dbConfig.js';
import routes from './routes/index.js';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// Only trust proxy if running in production (Docker, Cloudflare, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // trust first proxy
}

/**
 * Tracks the number of active connections to the server.
 * @type {number}
 */
let activeConnections = 0;

/**
 * Indicates whether a shutdown has been requested.
 * @type {boolean}
 */
let shutdownRequested = false;

/**
 * Stores the server instance once it is started.
 * @type {import('http').Server | null}
 */
let server: ReturnType<typeof app.listen> | null = null;

/**
 * Middleware to track active connections and decrement when a request finishes.
 */
app.use((req, res, next) => {
  activeConnections++;
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.url} | Active connections: ${activeConnections}`);

  // DEBUG: Optionally log request headers or query params:
  // console.log(`[DEBUG] Request headers:`, req.headers);
  // console.log(`[DEBUG] Request query:`, req.query);

  /**
   * Decrements the active connection count safely.
   */
  const decrementConnections = async () => {
    activeConnections = Math.max(0, activeConnections - 1);
    console.log(`[DEBUG] Request finished/closed: ${req.method} ${req.url} | Active connections: ${activeConnections}`);

    if (shutdownRequested && activeConnections === 0) {
      // If a shutdown was requested and no more active connections, proceed
      console.log('[DEBUG] All connections closed. Proceeding with server shutdown.');
      await shutdownProcedure(); // see below
    }
  };

  res.on('finish', decrementConnections);
  res.on('close', decrementConnections);

  next();
});

// Middleware setup
app.use(corsConfig);
app.use(rateLimiter);
app.use(express.json({ limit: '100mb' }));

// Register application routes
app.use('/', routes);

/**
 * Delays execution for a specified time.
 * @param {number} ms - The time to sleep in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the given time.
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Initializes and starts the Express server.
 * @returns {Promise<import('http').Server>} The running server instance.
 */
const startServer = async () => {
  console.log('[DEBUG] startServer() invoked...');
  await connectDatabases();

  const PORT = parseInt(process.env.API_PORT || '3000', 10);
  const HOST = '0.0.0.0';

  server = app.listen(PORT, HOST, () => {
    console.log(`[DEBUG] Server is running on http://${HOST}:${PORT}`);
  });

  // Only set up stdin listener in non-test environments
  if (process.env.NODE_ENV !== 'test' && process.stdin.isTTY) {
    console.log('[DEBUG] Setting up stdin for manual SIGINT (Ctrl+C) handling.');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (key) => {
      if (key.toString() === '\u0003') { // CTRL+C
        console.log('[DEBUG] CTRL+C detected, emitting SIGINT...');
        process.emit('SIGINT'); // Manually trigger SIGINT handler
      }
    });
  }

  process.on('SIGINT', async () => {
    console.log('\n[DEBUG] SIGINT received. Attempting graceful shutdown...');
    shutdownRequested = true;

    // Short delay to allow res.on('finish') events to fire
    await sleep(500);

    if (activeConnections > 0) {
      console.warn(`[DEBUG] Delaying shutdown: ${activeConnections} active connections remain. Waiting...`);
    } else {
      console.log('[DEBUG] No active connections. Proceeding with immediate shutdown.');
      await shutdownProcedure();
    }
  });

  return server;
};

/**
 * Closes the server and database connections gracefully.
 */
const shutdownProcedure = async () => {
  try {
    console.log('[DEBUG] Shutting down server and closing database connections...');
    if (server) {
      server.close(() => {
        console.log('[DEBUG] HTTP server closed.');
      });
    }

    if (teamDBClient) {
      await teamDBClient.end();
      console.log('[DEBUG] Closed teamDBClient connection.');
      await sleep(300);
    }

    if (playerDBClient) {
      await playerDBClient.end();
      console.log('[DEBUG] Closed playerDBClient connection.');
      await sleep(300);
    }
  } catch (err) {
    console.error('[DEBUG] Error during shutdown:', err);
  } finally {
    console.log('[DEBUG] Shutdown complete.');
    process.exit(0);
  }
};

/**
 * Closes the server and database connections gracefully (external call).
 * @returns {Promise<void>}
 */
const closeServer = async () => {
  console.log('\n[DEBUG] closeServer() called...');
  await shutdownProcedure();
};

// Start the server unless in a test environment
if (process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    console.error('[DEBUG] Failed to start the server:', err);
    process.exit(1);
  });
}

export { app, startServer, closeServer };