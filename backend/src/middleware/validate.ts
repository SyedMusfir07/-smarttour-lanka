import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const zodIssues = (error as any).issues || (error as any).errors || [];
        const errors = zodIssues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({ success: false, error: 'Validation failed', details: errors });
        return;
      }
      next(error);
    }
  };
};
