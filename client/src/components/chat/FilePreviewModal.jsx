import React, { useEffect } from 'react';

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileType = (file) => {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'document';
  if (type.includes('excel') || type.includes('sheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'spreadsheet';
  if (type.includes('powerpoint') || type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'presentation';

  const codeExtensions = ['.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.json', '.xml',
    '.py', '.java', '.c', '.cpp', '.php', '.rb', '.go', '.rs',
    '.md', '.yaml', '.yml', '.sh', '.sql'];
  if (codeExtensions.some(ext => name.endsWith(ext))) return 'code';

  return 'file';
};

const getFileIcon = (fileType) => {
  switch (fileType) {
    case 'pdf':
      return (
        <svg className="w-20 h-20 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
          <path d="M14 2v6h6M9 13h6M9 17h6m-6-8h4" />
        </svg>
      );
    case 'document':
      return (
        <svg className="w-20 h-20 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
          <path d="M14 2v6h6M9 13h6M9 17h6" />
        </svg>
      );
    case 'spreadsheet':
      return (
        <svg className="w-20 h-20 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
          <path d="M14 2v6h6M9 9h6v3H9zM9 15h6v3H9z" />
        </svg>
      );
    case 'presentation':
      return (
        <svg className="w-20 h-20 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
          <path d="M14 2v6h6M10 12l4 3-4 3v-6z" />
        </svg>
      );
    case 'code':
      return (
        <svg className="w-20 h-20 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    default:
      return (
        <svg className="w-20 h-20 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
          <path d="M14 2v6h6" />
        </svg>
      );
  }
};

const FilePreviewModal = ({ previewData, onClose, onConfirm }) => {
  if (!previewData) return null;

  const { file, url } = previewData;
  const fileType = getFileType(file);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const getFileExtension = (filename) => {
    return filename.slice(filename.lastIndexOf('.')).toUpperCase().slice(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg text-white">
        <h2 className="text-2xl font-bold mb-4">
          {fileType === 'image' ? 'Confirmar envío de imagen' : 'Confirmar envío de archivo'}
        </h2>

        <div className="flex justify-center items-center my-6 bg-gray-900 rounded-lg p-4 min-h-[200px]">
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
                <span className="inline-block px-3 py-1 bg-gray-700 rounded-full text-sm font-semibold">
                  {getFileExtension(file.name)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 text-gray-300 bg-gray-900 rounded-lg p-4">
          <div className="flex justify-between">
            <span className="font-semibold">Nombre:</span>
            <span className="text-right truncate ml-2 max-w-[250px]" title={file.name}>
              {file.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Tamaño:</span>
            <span>{formatFileSize(file.size)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Tipo:</span>
            <span className="capitalize">{fileType === 'code' ? 'Código' : fileType}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(file)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;