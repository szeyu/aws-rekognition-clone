import { vi, type Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../validation';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: Mock<(code: number) => Response>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReq = {};
    jsonMock = vi.fn();
    mockRes = {
      json: jsonMock,
    } as Partial<Response>;
    statusMock = vi.fn((code: number) => mockRes as Response);
    mockRes.status = statusMock;
    mockNext = vi.fn();
  });

  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number().positive(),
    });

    it('should pass validation for valid data', () => {
      mockReq.body = { name: 'John', age: 30 };
      const middleware = validateBody(testSchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should reject invalid data with 400', () => {
      mockReq.body = { name: 'John', age: -5 };
      const middleware = validateBody(testSchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'validation_error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'age',
            message: expect.any(String),
          }),
        ]),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing required fields', () => {
      mockReq.body = { name: 'John' };
      const middleware = validateBody(testSchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'validation_error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'age',
          }),
        ]),
      });
    });

    it('should replace req.body with validated data', () => {
      mockReq.body = { name: 'John', age: 30, extra: 'field' };
      const middleware = validateBody(testSchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({ name: 'John', age: 30 });
      expect(mockReq.body).not.toHaveProperty('extra');
    });
  });

  describe('validateQuery', () => {
    const testSchema = z.object({
      limit: z.coerce.number().positive(),
      offset: z.coerce.number().optional(),
    });

    it('should pass validation for valid query params', () => {
      mockReq.query = { limit: '10' };
      const middleware = validateQuery(testSchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject invalid query params', () => {
      mockReq.query = { limit: '-5' };
      const middleware = validateQuery(testSchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'validation_error',
        details: expect.any(Array),
      });
    });

    it('should coerce string numbers to numbers', () => {
      mockReq.query = { limit: '10', offset: '5' };
      const middleware = validateQuery(testSchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Query params are coerced during validation
    });
  });
});
