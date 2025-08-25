import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = {
  required: (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token d\'accès requis' });
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'fallback-secret') as any;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token invalide' });
    }
  },

  optional: (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req || !req.headers) {
      return next();
    }
    const token = req.headers?.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'fallback-secret') as any;
        req.user = decoded;
      } catch (error) {
        // Token invalide mais on continue sans authentification
      }
    }
    
    next();
  }
}; 