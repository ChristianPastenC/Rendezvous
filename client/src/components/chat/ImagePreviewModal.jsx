import React, { useEffect } from 'react';

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ImagePreviewModal = ({ previewData, onClose, onConfirm }) => {
  if (!previewData) return null;

  const { file, url } = previewData;

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg text-white">
        <h2 className="text-2xl font-bold mb-4">Confirmar envío de imagen</h2>

        <div className="flex justify-center my-4">
          <img src={url} alt={file.name} className="max-h-80 max-w-full rounded-lg object-contain" />
        </div>

        <div className="text-center text-gray-300">
          <p><strong>Archivo:</strong> {file.name}</p>
          <p><strong>Tamaño:</strong> {formatFileSize(file.size)}</p>
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

export default ImagePreviewModal;