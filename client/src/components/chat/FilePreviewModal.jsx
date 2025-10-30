// client/src/components/chat/FilePreviewModal.jsx
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CodePreviewIcon,
  DefaultFileIcon,
  DocIcon,
  PDFIcon,
  PPTIcon,
  XLSIcon
} from '../../assets/Icons';

/**
 * Determines the general type of a file based on its MIME type or name.
 * @param {File} file - The file object to analyze.
 * @returns {string} A string representing the file type (e.g., 'image', 'pdf', 'document', 'code').
 */
const getFileType = (file) => {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type.startsWith('image/'))
    return 'image';
  if (type === 'application/pdf')
    return 'pdf';
  if (
    type.includes('word') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  )
    return 'document';
  if (
    type.includes('excel') ||
    type.includes('sheet') ||
    name.endsWith('.xls') ||
    name.endsWith('.xlsx')
  )
    return 'spreadsheet';
  if (
    type.includes('powerpoint') ||
    type.includes('presentation') ||
    name.endsWith('.ppt') ||
    name.endsWith('.pptx')
  )
    return 'presentation';

  const codeExtensions = ['.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.json', '.xml',
    '.py', '.java', '.c', '.cpp', '.php', '.rb', '.go', '.rs',
    '.md', '.yaml', '.yml', '.sh', '.sql'];
  if (codeExtensions.some(ext => name.endsWith(ext))) return 'code';

  return 'file';
};

/**
 * Returns an icon component based on the file type.
 * @param {string} fileType - The file type string returned by getFileType.
 * @returns {JSX.Element} The corresponding icon component.
 */
const getFileIcon = (fileType) => {
  switch (fileType) {
    case 'pdf':
      return <PDFIcon className="w-20 h-20 text-red-500" />;
    case 'document':
      return <DocIcon className="w-20 h-20 text-blue-500" />;
    case 'spreadsheet':
      return <XLSIcon className="w-20 h-20 text-green-500" />;
    case 'presentation':
      return <PPTIcon className="w-20 h-20 text-orange-500" />;
    case 'code':
      return <CodePreviewIcon className="w-20 h-20 text-purple-500" />;
    default:
      return <DefaultFileIcon className="w-20 h-20 text-gray-500" />;
  }
};


const FilePreviewModal = ({ previewData, onClose, onConfirm }) => {
  const { t } = useTranslation();

  const { file, url } = previewData || {};

  /**
   * Formats a file size in bytes into a human-readable string (Bytes, KB, MB, GB).
   * @param {number} bytes - The file size in bytes.
   * @returns {string} A formatted string with the appropriate unit.
   */
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return `0 ${t('filePreview.size.bytes', 'Bytes')}`;
    const k = 1024;
    const sizes = [
      t('filePreview.size.bytes', 'Bytes'),
      t('filePreview.size.kb', 'KB'),
      t('filePreview.size.mb', 'MB'),
      t('filePreview.size.gb', 'GB')
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, [t]);

  if (!previewData) {
    return null;
  }

  const fileType = getFileType(file);

  /**
   * Extracts the file extension from a filename.
   * @param {string} filename - The name of the file.
   * @returns {string} The uppercase file extension without the dot.
   */
  const getFileExtension = (filename) => {
    return filename.slice(filename.lastIndexOf('.')).toUpperCase().slice(1);
  };

  /**
   * Gets the translated string for a given file type.
   * @param {string} type - The file type string.
   * @returns {string} The translated file type string.
   */
  const getTranslatedFileType = (type) => {
    switch (type) {
      case 'code':
        return t('filePreview.types.code');
      case 'pdf':
        return t('filePreview.types.pdf');
      case 'document':
        return t('filePreview.types.document');
      case 'spreadsheet':
        return t('filePreview.types.spreadsheet');
      case 'presentation':
        return t('filePreview.types.presentation');
      case 'image':
        return t('filePreview.types.image');
      default:
        return t('filePreview.types.file');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg text-gray-900">
        <h2 className="text-2xl font-bold mb-4">
          {fileType === 'image' ? t('filePreview.titleImage') : t('filePreview.titleFile')}
        </h2>

        <div className="flex justify-center items-center my-6 bg-gray-100 rounded-lg p-4 min-h-[200px]">
          {fileType === 'image' ? (
            <img
              src={url}
              alt={file.name}
              className="max-h-80 max-w-full rounded-lg object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              {getFileIcon(fileType)}
              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-gray-300 rounded-full text-sm font-semibold text-gray-800">
                  {getFileExtension(file.name)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 text-gray-700 bg-gray-100 rounded-lg p-4">
          <div className="flex justify-between">
            <span className="font-semibold">
              {t('filePreview.fileName')}
            </span>
            <span className="text-right truncate ml-2 max-w-[250px]" title={file.name}>
              {file.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">
              {t('filePreview.fileSize')}
            </span>
            <span>{formatFileSize(file.size)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">
              {t('filePreview.fileType')}
            </span>
            <span className="capitalize">
              {getTranslatedFileType(fileType)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(file)}
            className="px-6 py-2 bg-[#3B82F6] text-white hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            {t('filePreview.send')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;