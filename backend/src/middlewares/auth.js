import { verifyToken } from '../utils/jwt.js';
import { errorResponse } from '../utils/response.js';
import pool from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return errorResponse(res, 'Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    // Verify user still exists and is active
    const result = await pool.query(
      'SELECT id, email, full_name, role, is_active FROM agri.accounts WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return errorResponse(res, 'User not found or inactive', 401, 'UNAUTHORIZED');
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return errorResponse(res, 'Authentication failed', 401, 'UNAUTHORIZED');
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Forbidden - insufficient permissions', 403, 'FORBIDDEN');
    }

    next();
  };
};
