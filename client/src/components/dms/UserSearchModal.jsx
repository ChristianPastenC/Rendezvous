// src/components/dms/UserSearchModal.jsx

import React from 'react';
import UserSearch from './UserSearch';

const UserSearchModal = ({ isOpen, onClose, onSelectUser }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Iniciar nueva conversación
          </h2>
          <p className="text-sm text-gray-600">
            Busca un usuario para chatear.
          </p>
        </div>
        <div className="p-4">
          <UserSearch onSelectUser={onSelectUser} />
        </div>
        <div className="p-4 border-t text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSearchModal;