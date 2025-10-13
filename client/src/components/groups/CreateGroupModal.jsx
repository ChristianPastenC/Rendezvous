import React, { useState } from 'react';

const CreateGroupModal = ({ isOpen, onClose, onCreate }) => {
  const [groupName, setGroupName] = useState('');
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (groupName.trim()) onCreate(groupName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Crear un Nuevo Grupo</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
            placeholder="Nombre del Grupo" autoFocus
          />
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Cancelar</button>
            <button type="submit" disabled={!groupName.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">Crear Grupo</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;