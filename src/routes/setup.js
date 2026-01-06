/**
 * Setup Routes
 * API endpoints for warehouse setup
 */

import express from 'express';
import setupController from '../controllers/setupController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Warehouse initialization
router.post('/initialize', setupController.initializeWarehouse);
router.get('/config', setupController.getCurrentConfig);

export default router;
