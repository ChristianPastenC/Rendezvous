import { describe, it, expect } from 'vitest';
import {
  isFileTypeAllowed,
  validateFile,
  MAX_FILE_SIZE_BYTES,
} from '../allowedFiles';

const makeFile = (name: string, type: string, sizeBytes = 1024): File => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
};

describe('allowedFiles', () => {
  describe('isFileTypeAllowed', () => {
    it('allows supported image and document MIME types', () => {
      expect(isFileTypeAllowed(makeFile('photo.png', 'image/png'))).toBe(true);
      expect(isFileTypeAllowed(makeFile('doc.pdf', 'application/pdf'))).toBe(true);
      expect(isFileTypeAllowed(makeFile('data.json', 'application/json'))).toBe(true);
    });

    it('allows safe source code extensions even when MIME type is empty', () => {
      expect(isFileTypeAllowed(makeFile('script.py', ''))).toBe(true);
      expect(isFileTypeAllowed(makeFile('notes.md', ''))).toBe(true);
    });

    it('rejects executable web/script files to mitigate XSS risks', () => {
      expect(isFileTypeAllowed(makeFile('evil.html', 'text/html'))).toBe(false);
      expect(isFileTypeAllowed(makeFile('payload.js', 'application/javascript'))).toBe(false);
      expect(isFileTypeAllowed(makeFile('vector.svg', 'image/svg+xml'))).toBe(false);
      expect(isFileTypeAllowed(makeFile('run.sh', 'application/x-sh'))).toBe(false);
    });

    it('returns false for null or undefined', () => {
      expect(isFileTypeAllowed(null)).toBe(false);
      expect(isFileTypeAllowed(undefined)).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('accepts valid files within the size limit', () => {
      const file = makeFile('avatar.webp', 'image/webp', 500_000);
      expect(validateFile(file)).toEqual({ valid: true });
    });

    it('rejects disallowed file types with reason "type"', () => {
      const file = makeFile('index.html', 'text/html', 100);
      expect(validateFile(file)).toEqual({ valid: false, reason: 'type' });
    });

    it('rejects files exceeding MAX_FILE_SIZE_BYTES with reason "size"', () => {
      const file = makeFile('large.pdf', 'application/pdf', MAX_FILE_SIZE_BYTES + 1);
      expect(validateFile(file)).toEqual({ valid: false, reason: 'size' });
    });
  });
});
