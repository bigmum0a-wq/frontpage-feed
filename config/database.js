// Database Connection and Initialization
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let dbInstance = null;

/**
 * Initializes and returns a SQLite database connection.
 * Compatible with Node 20+ built-in node:sqlite or fallback drivers.
 */
export async function getDatabase() {
  if (dbInstance) return dbInstance;

  const dbDir = path.dirname(env.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  try {
    // Attempt using built-in node:sqlite (Node 20+)
    const { DatabaseSync } = await import('node:sqlite');
    dbInstance = new DatabaseSync(env.DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA busy_timeout = 5000;');
  } catch {
    // Fallback if node:sqlite is not enabled
    console.warn('[Database] Built-in node:sqlite not found, please install better-sqlite3 or sqlite3.');
  }

  // Ensure schema is applied
  const schemaPath = path.join(rootDir, 'database', 'schema.sql');
  if (fs.existsSync(schemaPath) && dbInstance) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    dbInstance.exec(schemaSql);

    // Migration for new AI columns
    try {
      const tableInfo = dbInstance.prepare("PRAGMA table_info(articles)").all();
      const columnNames = new Set(tableInfo.map((col) => col.name));

      if (!columnNames.has('ai_summary')) {
        dbInstance.exec('ALTER TABLE articles ADD COLUMN ai_summary TEXT;');
      }
      if (!columnNames.has('ai_takeaways')) {
        dbInstance.exec('ALTER TABLE articles ADD COLUMN ai_takeaways TEXT;');
      }
      if (!columnNames.has('ai_tags')) {
        dbInstance.exec('ALTER TABLE articles ADD COLUMN ai_tags TEXT;');
      }
      if (!columnNames.has('ai_reading_time')) {
        dbInstance.exec('ALTER TABLE articles ADD COLUMN ai_reading_time INTEGER;');
      }
      if (!columnNames.has('ai_generated_at')) {
        dbInstance.exec('ALTER TABLE articles ADD COLUMN ai_generated_at DATETIME;');
      }
    } catch (migErr) {
      console.warn('[Database Migration Warning]', migErr.message);
    }
  }

  return dbInstance;
}
