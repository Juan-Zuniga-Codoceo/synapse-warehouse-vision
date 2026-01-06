/**
 * Warehouse Vision 3D - Main Server
 * Express API server with SQLite backend
 */

import express from 'express';
import cors from 'cors';
import config from './config.js';
import locationRoutes from './src/routes/locations.js';
import inventoryRoutes from './src/routes/inventory.js';
import setupRoutes from './src/routes/setup.js';

const app = express();

// Middleware
app.use(cors({
    origin: config.server.corsOrigin,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        warehouse: config.MAIN_WAREHOUSE_ID,
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/locations', locationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/setup', setupRoutes);

// Serve static files in production/electron
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Handle SPA routing - return index.html for any other request
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║     Warehouse Vision 3D - Server Running              ║
╠═══════════════════════════════════════════════════════╣
║  Port:       ${PORT}                                    ║
║  Warehouse:  #${config.MAIN_WAREHOUSE_ID}                                      ║
║  Database:   ${config.database.path}                    ║
║  Frontend:   ${config.server.corsOrigin}  ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
