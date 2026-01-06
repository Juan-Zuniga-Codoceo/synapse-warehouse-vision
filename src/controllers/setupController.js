/**
 * Setup Controller
 * Request handlers for warehouse setup endpoints
 */

import setupService from '../services/setupService.js';

export const setupController = {
    /**
     * POST /api/setup/initialize
     * Initialize warehouse structure
     */
    async initializeWarehouse(req, res, next) {
        try {
            const { zone_name, aisles, racks_per_aisle, levels_per_rack, positions_per_level, force_reset } = req.body;

            // Validation
            if (!zone_name || !aisles || !racks_per_aisle || !levels_per_rack || !positions_per_level) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: zone_name, aisles, racks_per_aisle, levels_per_rack, positions_per_level'
                });
            }

            const result = await setupService.initializeWarehouse(req.body);
            res.json({ success: true, data: result });
        } catch (error) {
            // Handle inventory safety check error
            if (error.statusCode === 400 && error.inventoryCount) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                    inventoryCount: error.inventoryCount,
                    requiresForceReset: true
                });
            }
            next(error);
        }
    },

    /**
     * GET /api/setup/config
     * Get current warehouse configuration
     */
    async getCurrentConfig(req, res, next) {
        try {
            const config = await setupService.getCurrentConfig();
            res.json({ success: true, data: config });
        } catch (error) {
            next(error);
        }
    }
};

export default setupController;
