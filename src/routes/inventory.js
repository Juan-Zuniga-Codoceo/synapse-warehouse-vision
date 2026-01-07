/**
 * Inventory Routes
 * API endpoints for inventory management
 */

import express from 'express';
import inventoryController from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Alerts and stats
router.get('/alerts', inventoryController.getAlerts);
router.get('/stats', inventoryController.getStats);
router.get('/search', inventoryController.searchProducts);

// Inventory items CRUD
router.get('/items/:id', inventoryController.getItem);
router.post('/items', inventoryController.createItem);
router.put('/items/:id', inventoryController.updateItem);
router.delete('/items/:id', inventoryController.deleteItem);

export default router;
