/**
 * Inventory Controller
 * Request handlers for inventory endpoints
 */

import inventoryService from '../services/inventoryService.js';

export const inventoryController = {
    /**
     * GET /api/inventory/alerts
     * Get products approaching expiration
     */
    async getAlerts(req, res, next) {
        try {
            const alerts = await inventoryService.getAlerts();
            res.json({ success: true, data: alerts });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/inventory/stats
     * Get alert statistics
     */
    async getStats(req, res, next) {
        try {
            const stats = await inventoryService.getAlertStats();
            res.json({ success: true, data: stats });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/inventory/search
     * Search products by name or SKU
     */
    async searchProducts(req, res, next) {
        try {
            const { q } = req.query;
            if (!q) {
                return res.json({ success: true, data: [] });
            }
            const products = await inventoryService.searchProducts(q);
            res.json({ success: true, data: products });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/inventory/items/:id
     * Get specific inventory item
     */
    async getItem(req, res, next) {
        try {
            const item = await inventoryService.getItemById(req.params.id);
            res.json({ success: true, data: item });
        } catch (error) {
            if (error.message === 'Inventory item not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            next(error);
        }
    },

    /**
     * POST /api/inventory/items
     * Create new inventory item
     */
    async createItem(req, res, next) {
        try {
            const { location_id, product_name, sku, arrival_date, expiration_date, invoice_number, alert_threshold_days } = req.body;

            // Validation
            if (!location_id || !product_name || !sku || !arrival_date) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: location_id, product_name, sku, arrival_date'
                });
            }

            const item = await inventoryService.createItem(req.body);
            res.status(201).json({ success: true, data: item });
        } catch (error) {
            console.error('Inventory Create Error:', error);
            if (error.message === 'Location not found') {
                return res.status(400).json({ success: false, error: error.message });
            }
            next(error);
        }
    },

    /**
     * PUT /api/inventory/items/:id
     * Update inventory item
     */
    async updateItem(req, res, next) {
        try {
            const item = await inventoryService.updateItem(req.params.id, req.body);
            res.json({ success: true, data: item });
        } catch (error) {
            if (error.message === 'Inventory item not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            next(error);
        }
    },

    /**
     * DELETE /api/inventory/items/:id
     * Delete inventory item
     */
    async deleteItem(req, res, next) {
        try {
            const result = await inventoryService.deleteItem(req.params.id);
            res.json({ success: true, data: result });
        } catch (error) {
            if (error.message === 'Inventory item not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            next(error);
        }
    }
};

export default inventoryController;
