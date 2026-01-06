/**
 * Location Service
 * Business logic for warehouse location management
 */

import { query, run, get } from '../database/db.js';
import config from '../../config.js';

export const locationService = {
  /**
   * Get all locations with optional filters and inventory data
   */
  async getAllLocations(filters = {}) {
    // This query returns ALL location-item combinations
    // If a location has 3 items, it will appear 3 times in the results
    // If a location is empty, it will appear once with NULL inventory fields
    let sql = `
      SELECT 
        l.id, l.warehouse_id, l.zona, l.pasillo, l.rack, l.nivel, l.posicion, l.x, l.y, l.z,
        ii.id as inventory_id,
        ii.product_name,
        ii.sku,
        ii.arrival_date,
        ii.expiration_date,
        ii.invoice_number,
        ii.alert_threshold_days,
        julianday(ii.expiration_date) - julianday('now') as days_until_expiration,
        CASE
          WHEN ii.id IS NULL THEN 'EMPTY'
          WHEN ii.expiration_date IS NULL THEN 'NO_EXPIRATION'
          WHEN julianday(ii.expiration_date) < julianday('now') THEN 'EXPIRED'
          WHEN julianday(ii.expiration_date) - julianday('now') <= ii.alert_threshold_days THEN 'EXPIRING_SOON'
          ELSE 'NORMAL'
        END as alert_status
      FROM locations l
      LEFT JOIN inventory_items ii ON l.id = ii.location_id
      WHERE l.warehouse_id = ?
    `;
    const params = [config.MAIN_WAREHOUSE_ID];

    if (filters.zona) {
      sql += ' AND l.zona = ?';
      params.push(filters.zona);
    }

    if (filters.pasillo) {
      sql += ' AND l.pasillo = ?';
      params.push(filters.pasillo);
    }

    if (filters.occupied === 'true') {
      sql += ' AND ii.id IS NOT NULL';
    } else if (filters.occupied === 'false') {
      sql += ' AND ii.id IS NULL';
    }

    sql += ' ORDER BY l.zona, l.pasillo, l.rack, l.nivel, l.posicion';


    console.log('Service Debug - Executing SQL with filters:', filters);
    console.log('Service Debug - SQL Params:', params);
    console.log('Service Debug - FINAL SQL:', sql);

    const results = await query(sql, params);

    // Debug log
    if (results.length > 0) {
      console.log('API Debug - First location:', {
        id: results[0].id,
        pasillo: results[0].pasillo,
        rack: results[0].rack,
        product_name: results[0].product_name,
        sku: results[0].sku
      });
    }

    return results;
  },

  /**
   * Get location by ID
   */
  async getLocationById(id) {
    const location = await get(
      'SELECT * FROM locations WHERE id = ? AND warehouse_id = ?',
      [id, config.MAIN_WAREHOUSE_ID]
    );

    if (!location) {
      throw new Error('Location not found');
    }

    return location;
  },

  /**
   * Get occupancy statistics
   */
  async getOccupancyStats() {
    const stats = await get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ii.id IS NOT NULL THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN ii.id IS NULL THEN 1 ELSE 0 END) as available
      FROM locations l
      LEFT JOIN inventory_items ii ON l.id = ii.location_id
      WHERE l.warehouse_id = ?
    `, [config.MAIN_WAREHOUSE_ID]);

    const byZone = await query(`
      SELECT 
        l.zona,
        COUNT(*) as total,
        SUM(CASE WHEN ii.id IS NOT NULL THEN 1 ELSE 0 END) as occupied
      FROM locations l
      LEFT JOIN inventory_items ii ON l.id = ii.location_id
      WHERE l.warehouse_id = ?
      GROUP BY l.zona
      ORDER BY l.zona
    `, [config.MAIN_WAREHOUSE_ID]);

    return {
      ...stats,
      occupancyRate: stats.total > 0 ? (stats.occupied / stats.total * 100).toFixed(1) : 0,
      byZone
    };
  },

  /**
   * Get recent activity log
   */
  async getRecentActivity(limit = 10) {
    return await query(`
      SELECT 
        il.*,
        l.zona,
        l.pasillo,
        l.rack,
        l.nivel,
        l.posicion
      FROM inventory_log il
      JOIN locations l ON il.location_id = l.id
      WHERE l.warehouse_id = ?
      ORDER BY il.timestamp DESC
      LIMIT ?
    `, [config.MAIN_WAREHOUSE_ID, limit]);
  }
};

export default locationService;
