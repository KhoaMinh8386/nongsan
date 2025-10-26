import { errorResponse } from '../utils/response.js';

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return errorResponse(res, errors.join(', '), 400, 'VALIDATION_ERROR');
    }
    
    next();
  };
};
