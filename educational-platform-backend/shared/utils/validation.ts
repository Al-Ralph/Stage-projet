// shared/utils/validation.ts
import { body, param, query, ValidationChain } from 'express-validator';

export const validators = {
  pagination: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  
  courseId: param('courseId').isUUID().withMessage('Invalid course ID'),
  
  userId: param('userId').isUUID().withMessage('Invalid user ID'),
  
  rating: body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  
  search: query('q').optional().isString().trim().isLength({ min: 2 })
};
