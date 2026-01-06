/**
 * Database Connection Wrapper
 * Promise-based SQLite interface
 */

import sqlite3 from 'sqlite3';
import config from '../../config.js';
import fs from 'fs';
import path from 'path';

// Ensure database directory exists
const dbPath = config.database.path;
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Created database directory: ${dbDir}`);
    } catch (err) {
        console.error(`Error creating database directory: ${err.message}`);
    }
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('✓ Connected to SQLite database');
    }
});

// Promisify database methods
export const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

export const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

export const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

export default { query, run, get, db };
