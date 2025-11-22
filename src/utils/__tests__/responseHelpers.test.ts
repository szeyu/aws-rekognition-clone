import { vi } from 'vitest';
import { Response } from 'express';
import { validateBase64Image } from '../responseHelpers';

describe('validateBase64Image', () => {
  let mockRes: Partial<Response>;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn();
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  it('should return true for valid base64 string', () => {
    const result = validateBase64Image(mockRes as Response, 'validBase64String');

    expect(result).toBe(true);
    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it('should return false and send 400 for undefined', () => {
    const result = validateBase64Image(mockRes as Response, undefined);

    expect(result).toBe(false);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing image_base64' });
  });

  it('should return false and send 400 for empty string', () => {
    const result = validateBase64Image(mockRes as Response, '');

    expect(result).toBe(false);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing image_base64' });
  });

  it('should use custom parameter name in error message', () => {
    const result = validateBase64Image(
      mockRes as Response,
      undefined,
      'custom_image'
    );

    expect(result).toBe(false);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing custom_image' });
  });
});
