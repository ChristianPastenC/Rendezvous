export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export const ALLOWED_TEXT_DATA_TYPES = [
  'text/css',
  'application/json',
  'application/xml',
  'text/xml',
  'text/markdown',
  'text/x-yaml',
  'application/x-yaml',
  'text/csv',
] as const;

export const ALL_ALLOWED_TYPES: readonly string[] = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOC_TYPES,
  ...ALLOWED_TEXT_DATA_TYPES,
];

const ALLOWED_SAFE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.py', '.java', '.c', '.cpp', '.cs', '.rb', '.go', '.rs', '.sql',
];

/**
 * Checks whether the file MIME type or extension is allowed for upload.
 * Executable web/script types (e.g. .html, .js, .svg, .sh) are excluded to mitigate XSS risks.
 */
export const isFileTypeAllowed = (file: File | null | undefined): boolean => {
  if (!file) return false;
  if (ALL_ALLOWED_TYPES.includes(file.type)) {
    return true;
  }
  const fileName = file.name.toLowerCase();
  return ALLOWED_SAFE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
};

/**
 * Validates both file type and maximum allowed size.
 */
export const validateFile = (file: File): { valid: boolean; reason?: 'type' | 'size' } => {
  if (!isFileTypeAllowed(file)) {
    return { valid: false, reason: 'type' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: 'size' };
  }
  return { valid: true };
};
