/**
 * Setup Service
 * Business logic for warehouse structure initialization
 */

import { run, query } from '../database/db.js';
import config from '../../config.js';

export const setupService = {
    /**
     * Initialize warehouse structure
     * Clears existing data and generates new warehouse layout
     */
    async initializeWarehouse(params) {
        const { zone_name, aisles, racks_per_aisle, levels_per_rack, positions_per_level, force_reset } = params;

        // Validate parameters
        if (!zone_name || !aisles || !racks_per_aisle || !levels_per_rack || !positions_per_level) {
            throw new Error('Missing required parameters');
        }

        if (aisles < 1 || racks_per_aisle < 1 || levels_per_rack < 1 || positions_per_level < 1) {
            throw new Error('All numeric parameters must be greater than 0');
        }

        // Safety check: Verify if inventory exists
        const inventoryCheck = await query(
            'SELECT COUNT(*) as count FROM inventory_items WHERE location_id IN (SELECT id FROM locations WHERE warehouse_id = ?)',
            [config.MAIN_WAREHOUSE_ID]
        );

        const inventoryCount = inventoryCheck[0]?.count || 0;

        if (inventoryCount > 0 && !force_reset) {
            const error = new Error('La bodega contiene productos. Debe vaciar el inventario antes de reconfigurar la estructura.');
            error.statusCode = 400;
            error.inventoryCount = inventoryCount;
            throw error;
        }

        // Clear existing data
        await run('DELETE FROM inventory_items WHERE location_id IN (SELECT id FROM locations WHERE warehouse_id = ?)', [config.MAIN_WAREHOUSE_ID]);
        await run('DELETE FROM inventory_log WHERE location_id IN (SELECT id FROM locations WHERE warehouse_id = ?)', [config.MAIN_WAREHOUSE_ID]);
        await run('DELETE FROM locations WHERE warehouse_id = ?', [config.MAIN_WAREHOUSE_ID]);

        console.log(`Cleared existing warehouse data (${inventoryCount} inventory items removed)`);

        // Generate new structure
        let locationCount = 0;
        const locations = [];

        // For each aisle
        for (let aisleNum = 1; aisleNum <= aisles; aisleNum++) {
            let aisleName;

            if (params.aisle_naming === 'alpha') {
                // Generate A, B, C... Z, AA, AB...
                // ASCII A = 65
                if (aisleNum <= 26) {
                    aisleName = String.fromCharCode(64 + aisleNum);
                } else {
                    // Simple fallback for > 26 aisles (AA, AB logic could be added if needed, but for now A01 fallback or simple double letter)
                    // For simplicity in this iteration: A01 style fallback if > 26 or just keep numeric
                    // Let's implement simple AA, AB logic for robustness
                    const firstChar = String.fromCharCode(64 + Math.floor((aisleNum - 1) / 26));
                    const secondChar = String.fromCharCode(65 + ((aisleNum - 1) % 26));
                    aisleName = `${firstChar}${secondChar}`;
                }
            } else {
                // Default: A01, A02... (Prefix 'A' hardcoded in original, maybe user wants just '01', '02'?)
                // Original code was `A${String(aisleNum).padStart(2, '0')}`
                // Let's keep the 'A' prefix for numeric to match previous behavior unless requested otherwise.
                // Actually, "pasillo a. b c." implies just the letter.
                // "A01" implies "Aisle 01".
                // If user selected "Numeric", we stick to "A01".
                aisleName = `P${String(aisleNum).padStart(2, '0')}`; // Changed prefix to 'P' for 'Pasillo' or keep 'A'? 
                // User complaint was "solo se ven A". Original was `A${aisleNum}`.
                // Let's make numeric be "01", "02" or "P01".
                // Let's stick to "01", "02" if they want pure numbers, or "P01".
                // Given the user said "pasillo a. b c.", they likely want the aisle to be the main identifier.
                // Let's use "P" prefix for numeric to distinguish from "A" zone.
                aisleName = `P${String(aisleNum).padStart(2, '0')}`;
            }

            // For each rack on each side (left and right)
            for (let side = 0; side < 2; side++) {
                const sideLabel = side === 0 ? 'L' : 'R'; // Left or Right

                for (let rackNum = 1; rackNum <= racks_per_aisle; rackNum++) {
                    const rackName = `${sideLabel}${String(rackNum).padStart(2, '0')}`;

                    // For each level
                    for (let level = 1; level <= levels_per_rack; level++) {
                        // For each position
                        for (let position = 1; position <= positions_per_level; position++) {
                            // Calculate SVG coordinates
                            // Aisles are vertical, racks are horizontal
                            const x = (aisleNum - 1) * 150 + (side === 0 ? 0 : 80); // Aisle spacing + side offset
                            const y = (rackNum - 1) * 50; // Rack spacing
                            const z = (level - 1) * 30 + position * 10; // For 3D reference if needed

                            locations.push({
                                warehouse_id: config.MAIN_WAREHOUSE_ID,
                                zona: zone_name,
                                pasillo: aisleName,
                                rack: rackName,
                                nivel: level,
                                posicion: position,
                                x,
                                y,
                                z
                            });

                            locationCount++;
                        }
                    }
                }
            }
        }

        // Batch insert locations using transaction (100x faster)
        console.log(`Inserting ${locations.length} locations using transaction...`);

        await run('BEGIN TRANSACTION');

        try {
            for (const loc of locations) {
                await run(`
                    INSERT INTO locations (warehouse_id, zona, pasillo, rack, nivel, posicion, x, y, z)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    loc.warehouse_id,
                    loc.zona,
                    loc.pasillo,
                    loc.rack,
                    loc.nivel,
                    loc.posicion,
                    loc.x,
                    loc.y,
                    loc.z
                ]);
            }

            await run('COMMIT');
            console.log(`Successfully generated ${locationCount} locations`);
        } catch (error) {
            await run('ROLLBACK');
            console.error('Error inserting locations, rolled back transaction');
            throw error;
        }

        return {
            success: true,
            message: 'Warehouse structure initialized successfully',
            stats: {
                zone_name,
                aisles,
                racks_per_aisle,
                racks_per_side: racks_per_aisle * 2,
                total_racks: aisles * racks_per_aisle * 2,
                levels_per_rack,
                positions_per_level,
                total_locations: locationCount
            }
        };
    },

    /**
     * Get current warehouse configuration
     */
    async getCurrentConfig() {
        const locations = await query('SELECT * FROM locations WHERE warehouse_id = ? LIMIT 1000', [config.MAIN_WAREHOUSE_ID]);

        if (locations.length === 0) {
            return {
                exists: false,
                message: 'No warehouse structure found'
            };
        }

        // Analyze structure
        const zones = [...new Set(locations.map(l => l.zona))];
        const aisles = [...new Set(locations.map(l => l.pasillo))];
        const racks = [...new Set(locations.map(l => l.rack))];
        const maxLevel = Math.max(...locations.map(l => l.nivel));
        const maxPosition = Math.max(...locations.map(l => l.posicion));

        return {
            exists: true,
            zones,
            aisles: aisles.length,
            racks: racks.length,
            levels_per_rack: maxLevel,
            positions_per_level: maxPosition,
            total_locations: locations.length
        };
    }
};

export default setupService;
