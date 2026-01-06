/**
 * Authentication Middleware (Mock - Merge Ready)
 * 
 * INTEGRATION NOTE:
 * This is a simple mock authentication for stand-alone operation.
 * To integrate with BiocareTask, replace this file with your production
 * authentication middleware that validates JWT tokens or session cookies.
 * 
 * Expected behavior:
 * - Validate user credentials/tokens
 * - Attach user object to req.user
 * - Return 401 if authentication fails
 */

import config from '../../config.js';

export const authenticate = (req, res, next) => {
    // Mock authentication - always succeeds with default user
    if (config.auth.enabled) {
        // In production, validate token here:
        // const token = req.headers.authorization?.split(' ')[1];
        // const user = validateToken(token);
        // if (!user) return res.status(401).json({ error: 'Unauthorized' });

        // For now, use mock user
        req.user = config.auth.mockUser;
    }

    next();
};

export const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (req.user.role !== role && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        next();
    };
};

export default { authenticate, requireRole };
