// src/components/groups/CreateGroupModal.jsx

import React, { useState } from 'react';

const CreateGroupModal = ({ isOpen, onClose, onCreate }) => {
  const [groupName, setGroupName] = useState('');
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (groupName.trim()) onCreate(groupName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Crear un Nuevo Grupo</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 rounded-lg text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            placeholder="Nombre del Grupo"
            autoFocus
          />
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!groupName.trim()}
              className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 text-white font-medium text-sm sm:text-base"
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