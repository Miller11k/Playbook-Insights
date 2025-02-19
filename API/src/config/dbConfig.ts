/**
 * @module DatabaseClients
 * This module sets up and manages connections to PostgreSQL databases for team data, defensive data, player data, and user login.
 */

import pkg from 'pg';
const { Client } = pkg;

// USER DATABASE IS NOT USED IN THIS PROJECT YET
// /**
//  * PostgreSQL client for the user login database.
//  * Configured using environment variables:
//  * - USERS_DB_HOST: User database host
//  * - USERS_DB_USER: User database username
//  * - USERS_DB_PASSWORD: User database password
//  * - USERS_DB_NAME: User database name
//  * - USERS_DB_PORT: User database port (default 5432)
//  * @constant {Client}
//  */
// const userDBClient = new Client({
//   host: process.env.USERS_DB_HOST,
//   user: process.env.USERS_DB_USER,
//   password: process.env.USERS_DB_PASSWORD,
//   database: process.env.USERS_DB_NAME,
//   port: parseInt(process.env.USERS_DB_PORT || '5432', 10),
//   ssl: { rejectUnauthorized: false },
// });


/**
 * PostgreSQL client for the team database.
 * Configured using environment variables:
 * - TEAM_DB_HOST: Team database host
 * - TEAM_DB_USER: Team database username
 * - TEAM_DB_PASSWORD: Team database password
 * - TEAM_DB_NAME: Team database name
 * - TEAM_DB_PORT: Team database port (default 5432)
 * @constant {Client}
 */
const teamDBClient = new Client({
  host: process.env.TEAM_DB_HOST,
  user: process.env.TEAM_DB_USER,
  password: process.env.TEAM_DB_PASSWORD,
  database: process.env.TEAM_DB_NAME,
  port: parseInt(process.env.TEAM_DB_PORT || '5432', 10),
  ssl: { rejectUnauthorized: false },
});


/**
 * PostgreSQL client for the defensive database.
 * Configured using environment variables:
 * - DEFENSE_DB_HOST: Defensive database host
 * - DEFENSE_DB_USER: Defensive database username
 * - DEFENSE_DB_PASSWORD: Defensive database password
 * - DEFENSE_DB_NAME: Defensive database name
 * - DEFENSE_DB_PORT: Defensive database port (default 5432)
 * @constant {Client}
 */
const defenseDBClient = new Client({
  host: process.env.DEFENSE_DB_HOST,
  user: process.env.DEFENSE_DB_USER,
  password: process.env.DEFENSE_DB_PASSWORD,
  database: process.env.DEFENSE_DB_NAME,
  port: parseInt(process.env.DEFENSE_DB_PORT || '5432', 10),
  ssl: { rejectUnauthorized: false },
});


/**
 * PostgreSQL client for the player database.
 * Configured using environment variables:
 * - PLAYER_DB_HOST: Player database host
 * - PLAYER_DB_USER: Player database username
 * - PLAYER_DB_PASSWORD: Player database password
 * - PLAYER_DB_NAME: Player database name
 * - PLAYER_DB_PORT: Player database port (default 5432)
 * @constant {Client}
 */
const playerDBClient = new Client({
  host: process.env.PLAYER_DB_HOST,
  user: process.env.PLAYER_DB_USER,
  password: process.env.PLAYER_DB_PASSWORD,
  database: process.env.PLAYER_DB_NAME,
  port: parseInt(process.env.PLAYER_DB_PORT || '5432', 10),
  ssl: { rejectUnauthorized: false },
});


/**
 * Connects all PostgreSQL database clients.
 * Terminates the process if any connection fails.
 * @async
 * @function connectDatabases
 * @throws {Error} If any database connection fails.
 */
export const connectDatabases = async () => {
  try {
    // await userDBClient.connect();
    await teamDBClient.connect();
    await defenseDBClient.connect();
    await playerDBClient.connect();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "An unknown error occurred.");
  }
};

// Export the database clients
// export { userDBClient, teamDBClient, defenseDBClient, playerDBClient };
export { teamDBClient, defenseDBClient, playerDBClient };
