/**
 * Warehouse Vision 3D - Configuration
 * Centralized configuration for easy integration with BiocareTask
 */

export const config = {
  // Main warehouse/branch ID - Update this when deploying to different locations
  MAIN_WAREHOUSE_ID: 1,
  
  // Database configuration
  database: {
    path: './warehouse.db'
  },
  
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  },
  
  // Authentication (mock for now, replace with BiocareTask auth)
  auth: {
    enabled: true,
    mockUser: {
      id: 1,
      username: 'warehouse_admin',
      role: 'admin'
    }
  }
};

export default config;
