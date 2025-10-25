export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

export const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

export const ALLOWED_DEV_TYPES = [
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'text/xml',
  'application/x-sh',
  'application/x-python-code',
  'text/x-python',
  'text/x-java-source',
  'text/x-c',
  'text/x-c++',
  'text/x-csharp',
  'text/x-php',
  'text/x-ruby',
  'text/x-go',
  'text/x-rust',
  'text/x-typescript',
  'application/typescript',
  'text/markdown',
  'text/x-yaml',
  'application/x-yaml'
];

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOC_TYPES,
  ...ALLOWED_DEV_TYPES
];

export const isFileTypeAllowed = (file) => {
  if (ALL_ALLOWED_TYPES.includes(file.type)) {
    return true;
  }
  const fileName = file.name.toLowerCase();
  const devExtensions = [
    '.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx',
    '.json', '.xml', '.sh', '.bash', '.py', '.java', '.c',
    '.cpp', '.cs', '.php', '.rb', '.go', '.rs', '.yaml',
    '.yml', '.md', '.txt', '.sql', '.env', '.gitignore',
    '.vue', '.svelte', '.scss', '.sass', '.less'
  ];
  return devExtensions.some(ext => fileName.endsWith(ext));
};
