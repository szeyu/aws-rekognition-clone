import { Request, Response, NextFunction } from "express";
import { z, ZodType } from "zod";

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 */
export const validateBody = <T extends ZodType>(
  schema: T
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      const validated = schema.parse(req.body);

      // Replace req.body with validated data (ensures type safety)
      req.body = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod validation errors
        const errors = error.issues.map((err: z.core.$ZodIssue) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json({
          error: "validation_error",
          details: errors,
        });
      } else {
        // Unexpected error
        res.status(500).json({
          error: "internal_error",
          message: "Validation failed unexpectedly",
        });
      }
    }
  };
};

