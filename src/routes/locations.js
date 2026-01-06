/**
 * Location Routes
 * API endpoints for warehouse location management
 */

import express from 'express';
import locationController from '../controllers/locationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Location CRUD
router.get('/', locationController.getAll);
router.get('/search/:sku', locationController.searchBySKU);
router.get('/stats/occupancy', locationController.getStats);
router.get('/activity/recent', locationController.getActivity);
router.get('/:id', locationController.getById);
router.put('/:id', locationController.update);

export default router;
