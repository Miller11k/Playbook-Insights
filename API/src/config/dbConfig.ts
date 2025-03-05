import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pkg;
import type { Client as PGClient } from 'pg';

console.log("Connecting to database with config:");
console.log(`HOST: ${process.env.DB_SERVER_HOSTNAME}`);
console.log(`PORT: ${process.env.DB_SERVER_PORT}`);
console.log(`USER: ${process.env.DB_SERVER_USERNAME}`);
console.log(`DATABASES: ${process.env.TEAM_DB_NAME}, ${process.env.PLAYER_DB_NAME}\n`);

/**
 * Creates a new PostgreSQL database client with the given database name.
 * 
 * @param {string} databaseName - The name of the database to connect to.
 * @returns {PGClient} - A configured PostgreSQL client instance.
 */
const createDBClient = (databaseName: string): PGClient => {
  return new Client({
    host: process.env.DB_SERVER_HOSTNAME,
    user: process.env.DB_SERVER_USERNAME?.replace(/"/g, ''),  // Remove quotes if present
    password: process.env.DB_SERVER_PASSWORD?.replace(/"/g, ''),
    database: databaseName.replace(/"/g, ''), // Ensure no extra quotes
    port: parseInt(process.env.DB_SERVER_PORT || '5432', 10),
    ssl: process.env.DB_REQUIRE_SSL === 'true' ? { rejectUnauthorized: false } : undefined, // Conditionally disable SSL
  });
};

let teamDBClient: PGClient | null = null;
let playerDBClient: PGClient | null = null;

/**
 * Establishes connections to the Team and Player databases.
 * If a connection is already established, it does not create a new one.
 * 
 * @throws {Error} If database connection fails, the application will exit.
 * @returns {Promise<void>} Resolves when both databases are connected.
 */
export const connectDatabases = async (): Promise<void> => {
  try {
    if (!teamDBClient) {
      teamDBClient = createDBClient(process.env.TEAM_DB_NAME as string);
      await teamDBClient.connect();
      console.log("Connected to Team Database.");
    }

    if (!playerDBClient) {
      playerDBClient = createDBClient(process.env.PLAYER_DB_NAME as string);
      await playerDBClient.connect();
      console.log("Connected to Player Database.");
    }
  } catch (error) {
    console.error("Database connection error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

// Export the database clients for use in other modules
export { teamDBClient, playerDBClient };