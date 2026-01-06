/**
 * Database Initialization Script
 * Creates tables and seeds realistic warehouse data with inventory tracking
 */

import dbWrapper from './db.js';
const { db } = dbWrapper;

export const initDB = () => {
    return new Promise((resolve, reject) => {
        console.log('Initializing Warehouse Vision database with Inventory Management...\n');

        db.serialize(() => {
            // Create locations table if not exists
            db.run(`
            CREATE TABLE IF NOT EXISTS locations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              warehouse_id INTEGER NOT NULL DEFAULT 1,
              zona TEXT NOT NULL,
              pasillo TEXT NOT NULL,
              rack TEXT NOT NULL,
              nivel INTEGER NOT NULL,
              posicion INTEGER NOT NULL,
              x REAL NOT NULL,
              y REAL NOT NULL,
              z REAL NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `, (err) => {
                if (err) console.error('Error creating locations table:', err);
                else console.log('✓ Verified locations table');
            });

            // Create inventory_items table if not exists
            db.run(`
            CREATE TABLE IF NOT EXISTS inventory_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              location_id INTEGER NOT NULL,
              product_name TEXT NOT NULL,
              sku TEXT NOT NULL,
              arrival_date TEXT NOT NULL,
              expiration_date TEXT,
              invoice_number TEXT,
              alert_threshold_days INTEGER DEFAULT 30,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
            )
            `, (err) => {
                if (err) console.error('Error creating inventory_items table:', err);
                else console.log('✓ Verified inventory_items table');
            });

            // Create indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_sku ON inventory_items(sku)');
            db.run('CREATE INDEX IF NOT EXISTS idx_expiration ON inventory_items(expiration_date)');

            // Create inventory log table if not exists
            db.run(`
            CREATE TABLE IF NOT EXISTS inventory_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              location_id INTEGER NOT NULL,
              inventory_item_id INTEGER,
              action TEXT NOT NULL,
              user_id INTEGER,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (location_id) REFERENCES locations(id),
              FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
            )
            `, (err) => {
                if (err) console.error('Error creating inventory_log table:', err);
                else console.log('✓ Verified inventory_log table');
            });

            // Check if data exists before seeding
            db.get("SELECT count(*) as count FROM locations", (err, row) => {
                if (err) {
                    console.error("Error checking locations:", err);
                    resolve(); // Resolve anyway to allow server to start
                    return;
                }

                if (row && row.count > 0) {
                    console.log("\n✓ Database already contains data. Skipping seed.");
                    resolve();
                    return;
                }

                // Seed realistic warehouse data
                console.log('\nSeeding warehouse data...');
                seedData(resolve);
            });
        });
    });
};

function seedData(resolve) {
    const zones = ['A', 'B', 'C'];
    const aislesPerZone = 4;
    const racksPerAisle = 5;
    const levelsPerRack = 4;
    const positionsPerLevel = 3;

    // Sample products
    const sampleProducts = [
        { name: 'Leche Entera', sku: 'LAC-001', daysToExpire: 15, threshold: 7 },
        { name: 'Yogurt Natural', sku: 'YOG-002', daysToExpire: 25, threshold: 10 },
        { name: 'Queso Gouda', sku: 'QUE-003', daysToExpire: 45, threshold: 14 },
        { name: 'Mantequilla', sku: 'MAN-004', daysToExpire: 60, threshold: 30 },
        { name: 'Jamón Cocido', sku: 'JAM-005', daysToExpire: 20, threshold: 7 },
        { name: 'Salchichas', sku: 'SAL-006', daysToExpire: 30, threshold: 10 },
        { name: 'Jugo Naranja', sku: 'JUG-007', daysToExpire: 90, threshold: 30 },
        { name: 'Pan Molde', sku: 'PAN-008', daysToExpire: 10, threshold: 3 },
        { name: 'Galletas', sku: 'GAL-009', daysToExpire: 180, threshold: 60 },
        { name: 'Cereal', sku: 'CER-010', daysToExpire: 365, threshold: 90 }
    ];

    let locationCount = 0;
    let occupiedCount = 0;

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        zones.forEach((zona, zoneIdx) => {
            for (let aisle = 1; aisle <= aislesPerZone; aisle++) {
                const pasillo = `${zona}${aisle}`;
                for (let rack = 1; rack <= racksPerAisle; rack++) {
                    const rackName = `R${rack}`;
                    for (let nivel = 1; nivel <= levelsPerRack; nivel++) {
                        for (let posicion = 1; posicion <= positionsPerLevel; posicion++) {
                            const x = zoneIdx * 20 + rack * 3;
                            const y = (nivel - 1) * 2.5;
                            const z = aisle * 4 + posicion * 1.2;
                            const isOccupied = Math.random() < 0.3;

                            db.run(`
                                INSERT INTO locations (warehouse_id, zona, pasillo, rack, nivel, posicion, x, y, z)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [1, zona, pasillo, rackName, nivel, posicion, x, y, z], function (err) {
                                if (err) return;
                                const locationId = this.lastID;

                                if (isOccupied) {
                                    const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
                                    const arrivalDate = new Date();
                                    arrivalDate.setDate(arrivalDate.getDate() - Math.floor(Math.random() * 30));
                                    const expirationDate = new Date();
                                    expirationDate.setDate(expirationDate.getDate() + product.daysToExpire);
                                    const invoiceNumber = `FAC-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

                                    db.run(`
                                        INSERT INTO inventory_items (
                                            location_id, product_name, sku, arrival_date, expiration_date, 
                                            invoice_number, alert_threshold_days
                                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                                    `, [locationId, product.name, product.sku, arrivalDate.toISOString().split('T')[0], expirationDate.toISOString().split('T')[0], invoiceNumber, product.threshold]);

                                    occupiedCount++;
                                }
                            });
                            locationCount++;
                        }
                    }
                }
            }
        });

        db.run("COMMIT", () => {
            console.log(`✓ Created ${locationCount} locations`);
            console.log(`✓ ${occupiedCount} locations with inventory`);
            console.log('\n✓ Database initialization complete!');
            resolve();
        });
    });
}

// Execute if run directly
import { fileURLToPath } from 'url';
import process from 'process';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    initDB().then(() => process.exit(0));
}
