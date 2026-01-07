/**
 * Inventory Service
 * Business logic for inventory management and expiration alerts
 */

import { query, run, get } from '../database/db.js';
import config from '../../config.js';

export const inventoryService = {
  /**
   * Get all inventory items with expiration alerts
   */
  async getAlerts() {
    const sql = `
      SELECT 
        ii.*,
        l.zona, l.pasillo, l.rack, l.nivel, l.posicion,
        julianday(ii.expiration_date) - julianday('now') as days_until_expiration,
        CASE
          WHEN ii.expiration_date IS NULL THEN 'NO_EXPIRATION'
          WHEN julianday(ii.expiration_date) < julianday('now') THEN 'EXPIRED'
          WHEN julianday(ii.expiration_date) - julianday('now') <= ii.alert_threshold_days THEN 'EXPIRING_SOON'
          ELSE 'NORMAL'
        END as alert_status
      FROM inventory_items ii
      JOIN locations l ON ii.location_id = l.id
      WHERE l.warehouse_id = ?
        AND ii.expiration_date IS NOT NULL
        AND julianday(ii.expiration_date) - julianday('now') <= ii.alert_threshold_days
      ORDER BY days_until_expiration ASC
    `;

    return await query(sql, [config.MAIN_WAREHOUSE_ID]);
  },

  /**
   * Get inventory item by ID
   */
  async getItemById(id) {
    const sql = `
      SELECT 
        ii.*,
        l.zona, l.pasillo, l.rack, l.nivel, l.posicion,
        julianday(ii.expiration_date) - julianday('now') as days_until_expiration,
        CASE
          WHEN ii.expiration_date IS NULL THEN 'NO_EXPIRATION'
          WHEN julianday(ii.expiration_date) < julianday('now') THEN 'EXPIRED'
          WHEN julianday(ii.expiration_date) - julianday('now') <= ii.alert_threshold_days THEN 'EXPIRING_SOON'
          ELSE 'NORMAL'
        END as alert_status
      FROM inventory_items ii
      JOIN locations l ON ii.location_id = l.id
      WHERE ii.id = ? AND l.warehouse_id = ?
    `;

    const item = await get(sql, [id, config.MAIN_WAREHOUSE_ID]);

    if (!item) {
      throw new Error('Inventory item not found');
    }

    return item;
  },

  /**
   * Create new inventory item
   */
  async createItem(data) {
    const { location_id, product_name, sku, arrival_date, expiration_date, invoice_number, alert_threshold_days } = data;

    // Verify location exists and is in main warehouse
    const location = await get(
      'SELECT * FROM locations WHERE id = ? AND warehouse_id = ?',
      [location_id, config.MAIN_WAREHOUSE_ID]
    );

    if (!location) {
      throw new Error('Location not found');
    }

    // Check if location already has inventory
    // REMOVED: Allow multiple items per location
    /*
    const existing = await get(
        'SELECT * FROM inventory_items WHERE location_id = ?',
        [location_id]
    );

    if (existing) {
        throw new Error('Location already has inventory');
    }
    */

    // Insert inventory item
    const result = await run(`
      INSERT INTO inventory_items (
        location_id, product_name, sku, arrival_date, expiration_date,
        invoice_number, alert_threshold_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      location_id,
      product_name,
      sku,
      arrival_date,
      expiration_date || null,
      invoice_number || null,
      alert_threshold_days || 30
    ]);

    // Log the action
    await run(
      'INSERT INTO inventory_log (location_id, inventory_item_id, action, user_id) VALUES (?, ?, ?, ?)',
      [location_id, result.id, 'ASSIGN', 1]
    );

    return await this.getItemById(result.id);
  },

  /**
   * Update inventory item
   */
  async updateItem(id, data) {
    const item = await this.getItemById(id);

    const { product_name, sku, arrival_date, expiration_date, invoice_number, alert_threshold_days } = data;

    await run(`
      UPDATE inventory_items
      SET product_name = ?,
          sku = ?,
          arrival_date = ?,
          expiration_date = ?,
          invoice_number = ?,
          alert_threshold_days = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      product_name || item.product_name,
      sku || item.sku,
      arrival_date || item.arrival_date,
      expiration_date !== undefined ? expiration_date : item.expiration_date,
      invoice_number !== undefined ? invoice_number : item.invoice_number,
      alert_threshold_days !== undefined ? alert_threshold_days : item.alert_threshold_days,
      id
    ]);

    // Log the action
    await run(
      'INSERT INTO inventory_log (location_id, inventory_item_id, action, user_id) VALUES (?, ?, ?, ?)',
      [item.location_id, id, 'UPDATE', 1]
    );

    return await this.getItemById(id);
  },

  /**
   * Delete inventory item
   */
  async deleteItem(id) {
    const item = await this.getItemById(id);

    // Log the action before deleting
    await run(
      'INSERT INTO inventory_log (location_id, inventory_item_id, action, user_id) VALUES (?, ?, ?, ?)',
      [item.location_id, id, 'REMOVE', 1]
    );

    await run('DELETE FROM inventory_items WHERE id = ?', [id]);

    return { success: true, message: 'Inventory item deleted' };
  },

  /**
   * Get alert statistics
   */
  async getAlertStats() {
    const stats = await get(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN julianday(expiration_date) < julianday('now') THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN julianday(expiration_date) - julianday('now') <= alert_threshold_days 
                 AND julianday(expiration_date) >= julianday('now') THEN 1 ELSE 0 END) as expiring_soon,
        SUM(CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END) as no_expiration
      FROM inventory_items ii
      JOIN locations l ON ii.location_id = l.id
      WHERE l.warehouse_id = ?
    `, [config.MAIN_WAREHOUSE_ID]);

    return stats;
  },

  /**
   * Search unique products by name or SKU
   */
  async searchProducts(queryStr) {
    const sql = `
      SELECT DISTINCT product_name, sku, alert_threshold_days
      FROM inventory_items
      WHERE (product_name LIKE ? OR sku LIKE ?)
      ORDER BY product_name
      LIMIT 10
    `;
    const searchPattern = `%${queryStr}%`;
    return await query(sql, [searchPattern, searchPattern]);
  }
};

export default inventoryService;
