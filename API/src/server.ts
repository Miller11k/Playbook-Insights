import express from 'express';
import { corsConfig, rateLimiter } from './config/cors.js';
import { connectDatabases, teamDBClient, playerDBClient } from './config/dbConfig.js';
import routes from './routes/index.js';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

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
  
  /**
   * Decrements the active connection count safely.
   */
  const decrementConnections = async () => {
    activeConnections = Math.max(0, activeConnections - 1);
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
  await connectDatabases(); // Ensure this runs inside an async function

  const PORT = parseInt(process.env.API_PORT || '3000', 10);
  const HOST = '0.0.0.0';
  server = app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}\n`);
  });
  
  // Only set up stdin listener in non-test environments
  if (process.env.NODE_ENV !== 'test' && process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (key) => {
      if (key.toString() === '\u0003') { // CTRL+C
        process.emit('SIGINT'); // Manually trigger SIGINT handler
      }
    });
  }
  /**
   * Handles graceful shutdown when SIGINT (CTRL+C) is received.
   */
  process.on('SIGINT', async () => {
    await sleep(500);

    if (activeConnections > 0) {
      console.warn(`Warning: ${activeConnections} active connection(s) detected. Waiting for them to finish...`);
      shutdownRequested = true;
      return; // Do not exit; allow connections to close naturally
    }

    console.log('\nStopping Server...');
    // Proceed with shutdown if no active connections
    try {
      if (teamDBClient) {
        await teamDBClient.end();
        console.log('Closed teamDBClient connection');
        await sleep(500);
      }
      if (playerDBClient) {
        await playerDBClient.end();
        console.log('Closed playerDBClient connection');
        await sleep(500);
      }
    } catch (err) {
      console.error('Error closing database connections:', err);
    }

    if (server) {
      server.close(() => {
        console.log('Server Stopped Successfully');
        process.exit(0);
      });
    }
  });

  return server;
};

/**
 * Closes the server and database connections gracefully.
 * @returns {Promise<void>} Resolves when the server and databases are closed.
 */
const closeServer = async () => {
  console.log('\nStopping Server (closeServer)...');
  // Close database connections
  try {
    if (teamDBClient) {
      await teamDBClient.end();
      console.log('Closed teamDBClient connection');
    }
    if (playerDBClient) {
      await playerDBClient.end();
      console.log('Closed playerDBClient connection');
    }
  } catch (err) {
    console.error('Error closing database connections:', err);
  }

  // Close the server if it exists
  if (server) {
    return new Promise<void>((resolve, reject) => {
      server!.close((err) => {
        if (err) {
          console.error('Error closing server:', err);
          return reject(err);
        }
        console.log('Server Stopped Successfully');
        resolve();
      });
    });
  }
};


// Start the server unless in a test environment
if (process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    console.error('Failed to start the server:', err);
    process.exit(1);
  });
}

export { app, startServer, closeServer };
