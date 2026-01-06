/**
 * Database Initialization Script
 * Creates tables and seeds realistic warehouse data with inventory tracking
 */

import sqlite3 from 'sqlite3';
import config from '../../config.js';

const db = new sqlite3.Database(config.database.path);

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

    // Create indexes for performance (IF NOT EXISTS is not standard in all sqlite versions for indexes, but usually safe to ignore error or check)
    db.run('CREATE INDEX IF NOT EXISTS idx_sku ON inventory_items(sku)', (err) => {
        if (err) console.log('Index idx_sku checked/created');
    });

    db.run('CREATE INDEX IF NOT EXISTS idx_expiration ON inventory_items(expiration_date)', (err) => {
        if (err) console.log('Index idx_expiration checked/created');
    });

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
            return;
        }

        if (row && row.count > 0) {
            console.log("\n✓ Database already contains data. Skipping seed.");
            db.close();
            return;
        }

        // Seed realistic warehouse data
        console.log('\nSeeding warehouse data...');

        const zones = ['A', 'B', 'C'];
        const aislesPerZone = 4;
        const racksPerAisle = 5;
        const levelsPerRack = 4;
        const positionsPerLevel = 3;

        // Sample products with realistic expiration dates
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
        const locationIds = [];

        zones.forEach((zona, zoneIdx) => {
            for (let aisle = 1; aisle <= aislesPerZone; aisle++) {
                const pasillo = `${zona}${aisle}`;

                for (let rack = 1; rack <= racksPerAisle; rack++) {
                    const rackName = `R${rack}`;

                    for (let nivel = 1; nivel <= levelsPerRack; nivel++) {
                        for (let posicion = 1; posicion <= positionsPerLevel; posicion++) {
                            // Calculate 3D coordinates
                            const x = zoneIdx * 20 + rack * 3;
                            const y = (nivel - 1) * 2.5;
                            const z = aisle * 4 + posicion * 1.2;

                            // 30% chance of being occupied
                            const isOccupied = Math.random() < 0.3;

                            db.run(`
              INSERT INTO locations (warehouse_id, zona, pasillo, rack, nivel, posicion, x, y, z)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [config.MAIN_WAREHOUSE_ID, zona, pasillo, rackName, nivel, posicion, x, y, z], function (err) {
                                if (err) {
                                    console.error('Error inserting location:', err);
                                    return;
                                }

                                locationIds.push(this.lastID);

                                // Add inventory item if occupied
                                if (isOccupied) {
                                    const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
                                    const arrivalDate = new Date();
                                    arrivalDate.setDate(arrivalDate.getDate() - Math.floor(Math.random() * 30)); // Arrived 0-30 days ago

                                    const expirationDate = new Date();
                                    expirationDate.setDate(expirationDate.getDate() + product.daysToExpire);

                                    const invoiceNumber = `FAC-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

                                    db.run(`
                  INSERT INTO inventory_items (
                    location_id, product_name, sku, arrival_date, expiration_date, 
                    invoice_number, alert_threshold_days
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                                        this.lastID,
                                        product.name,
                                        product.sku,
                                        arrivalDate.toISOString().split('T')[0],
                                        expirationDate.toISOString().split('T')[0],
                                        invoiceNumber,
                                        product.threshold
                                    ]);

                                    occupiedCount++;
                                }
                            });

                            locationCount++;
                        }
                    }
                }
            }
        });

        // Wait for all inserts to complete
        setTimeout(() => {
            console.log(`✓ Created ${locationCount} locations`);
            console.log(`✓ ${occupiedCount} locations with inventory (${Math.round(occupiedCount / locationCount * 100)}%)`);
            console.log(`✓ ${locationCount - occupiedCount} locations available\n`);

            // Add some inventory log entries
            db.run(`
      INSERT INTO inventory_log (location_id, inventory_item_id, action, user_id)
      SELECT l.id, ii.id, 'ASSIGN', 1
      FROM locations l
      JOIN inventory_items ii ON l.id = ii.location_id
      LIMIT 10
    `, (err) => {
                if (err) console.error('Error seeding inventory log:', err);
                else console.log('✓ Seeded inventory log with sample entries');

                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('\n✓ Database initialization complete!');
                        console.log('Run "npm start" to start the server.\n');
                    }
                });
            });
        }, 2000);
    });
});
