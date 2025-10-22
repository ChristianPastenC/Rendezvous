import React, { useState } from 'react';
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
    <div className="fixed inset-0 bg-gray-100 bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-gray-200 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-black mb-4">Añadir Miembro al Grupo</h2>
        <UserSearch onSelectUser={handleSelectUser} />

        {selectedUser && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className="text-white">
              Añadir a 
              <span className="font-bold">{selectedUser.displayName}</span> al grupo?
            </p>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <div className="mt-4 flex justify-end space-x-3">
              <button onClick={() => setSelectedUser(null)} className="px-4 py-2 bg-gray-600 rounded-lg">Cancelar</button>
              <button onClick={handleAddClick} disabled={isAdding} className="px-4 py-2 bg-blue-600 rounded-lg disabled:opacity-50">
                {isAdding ? 'Añadiendo...' : 'Añadir'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={handleClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-100 rounded-lg font-semibold">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;