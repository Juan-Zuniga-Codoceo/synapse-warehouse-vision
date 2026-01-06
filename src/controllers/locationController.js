/**
 * Location Controller
 * Request handlers for location endpoints
 */

import locationService from '../services/locationService.js';

export const locationController = {
    /**
     * GET /api/locations
     * Get all locations with optional filters
     */
    async getAll(req, res, next) {
        try {
            const filters = {
                zona: req.query.zona,
                pasillo: req.query.pasillo,
                occupied: req.query.occupied === 'true' ? true : req.query.occupied === 'false' ? false : undefined
            };
            
            console.log('Controller Debug - Received filters:', filters);

            const locations = await locationService.getAllLocations(filters);
            res.json({ success: true, data: locations });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/locations/:id
     * Get specific location by ID
     */
    async getById(req, res, next) {
        try {
            const location = await locationService.getLocationById(req.params.id);
            res.json({ success: true, data: location });
        } catch (error) {
            if (error.message === 'Location not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            next(error);
        }
    },

    /**
     * GET /api/locations/search/:sku
     * Search locations by SKU
     */
    async searchBySKU(req, res, next) {
        try {
            const locations = await locationService.searchBySKU(req.params.sku);
            res.json({ success: true, data: locations });
        } catch (error) {
            next(error);
        }
    },

    /**
     * PUT /api/locations/:id
     * Update location (assign/remove SKU)
     */
    async update(req, res, next) {
        try {
            const { sku } = req.body;

            if (sku && typeof sku !== 'string') {
                return res.status(400).json({ success: false, error: 'SKU must be a string' });
            }

            const location = await locationService.updateLocation(
                req.params.id,
                sku,
                req.user?.id || 1
            );

            res.json({ success: true, data: location });
        } catch (error) {
            if (error.message === 'Location not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            next(error);
        }
    },

    /**
     * GET /api/locations/stats/occupancy
     * Get occupancy statistics
     */
    async getStats(req, res, next) {
        try {
            const stats = await locationService.getOccupancyStats();
            res.json({ success: true, data: stats });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/locations/activity/recent
     * Get recent activity log
     */
    async getActivity(req, res, next) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const activity = await locationService.getRecentActivity(limit);
            res.json({ success: true, data: activity });
        } catch (error) {
            next(error);
        }
    }
};

export default locationController;
