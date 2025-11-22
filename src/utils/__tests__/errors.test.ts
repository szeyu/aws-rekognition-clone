import { NoFaceDetectedError, isNoFaceError, getErrorMessage } from '../errors';

describe('NoFaceDetectedError', () => {
  it('should create error with correct code and message', () => {
    const error = new NoFaceDetectedError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NoFaceDetectedError);
    expect(error.code).toBe('NO_FACE');
    expect(error.message).toBe('no_face_detected');
    expect(error.name).toBe('NoFaceDetectedError');
  });

  it('should allow custom message', () => {
    const customMessage = 'Custom error message';
    const error = new NoFaceDetectedError(customMessage);

    expect(error.code).toBe('NO_FACE');
    expect(error.message).toBe(customMessage);
  });
});

describe('isNoFaceError', () => {
  it('should detect NoFaceDetectedError instance', () => {
    const error = new NoFaceDetectedError();
    expect(isNoFaceError(error)).toBe(true);
  });

  it('should detect error with NO_FACE code', () => {
    const error = { code: 'NO_FACE', message: 'test' };
    expect(isNoFaceError(error)).toBe(true);
  });

  it('should detect error with "no face" in message', () => {
    const error = new Error('no face detected');
    expect(isNoFaceError(error)).toBe(true);
  });

  it('should return false for regular errors', () => {
    const error = new Error('Regular error');
    expect(isNoFaceError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isNoFaceError(null)).toBe(false);
    expect(isNoFaceError(undefined)).toBe(false);
    expect(isNoFaceError('string')).toBe(false);
    expect(isNoFaceError(123)).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error instance', () => {
    const error = new Error('Test error');
    expect(getErrorMessage(error)).toBe('Test error');
  });

  it('should return string as-is', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('should return "unknown error" for other types', () => {
    expect(getErrorMessage(null)).toBe('unknown error');
    expect(getErrorMessage(undefined)).toBe('unknown error');
    expect(getErrorMessage(123)).toBe('unknown error');
    expect(getErrorMessage({})).toBe('unknown error');
  });
});
