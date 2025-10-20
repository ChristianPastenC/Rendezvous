// src/components/groups/AddMemberModal.jsx

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserSearch from '../dms/UserSearch';

const AddMemberModal = ({ isOpen, onClose, onMemberAdded, groupId }) => {
  const { currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setError('');
  };

  const handleAddClick = async () => {
    if (!selectedUser) return;
    setIsAdding(true);
    setError('');
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`http://localhost:3000/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userIdToAdd: selectedUser.uid }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'No se pudo añadir al usuario.');
      }

      onMemberAdded();
      handleClose();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedUser(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Añadir Miembro al Grupo</h2>
        <UserSearch onSelectUser={handleSelectUser} />

        {selectedUser && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-700 text-sm sm:text-base">
              Añadir a <span className="font-bold">{selectedUser.displayName}</span> al grupo?
            </p>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddClick}
                disabled={isAdding}
                className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 text-white font-medium text-sm sm:text-base"
              >
                {isAdding ? 'Añadiendo...' : 'Añadir'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 text-sm sm:text-base"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;