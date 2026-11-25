import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';

const server = app.listen(config.PORT, '0.0.0.0', () => console.log(`SchemePilot API listening on ${config.PORT}`));
async function shutdown(signal: string) {
  console.log(`${signal}: closing API`);
  server.close(async () => { await pool.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
