import { useState } from 'react';
import { CloseIcon } from '../../assets/Icons';

const CreateGroupModal = ({ isOpen, onClose, onCreate }) => {
  const [groupName, setGroupName] = useState('');
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (groupName.trim()) onCreate(groupName);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Crear un Nuevo Grupo</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            title="Cerrar"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-600 mb-2">
              Nombre del Grupo
            </label>
            <input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Ej: Nuevo Grupo"
              autoFocus
            />
          </div>
          <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!groupName.trim()}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Crear Grupo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;