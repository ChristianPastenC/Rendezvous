import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserSearch from '../dms/UserSearch';
import { CloseIcon } from '../../assets/Icons';

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Añadir Miembro</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            title="Cerrar"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Busca a un usuario para añadirlo al grupo.
          </p>
          <UserSearch onSelectUser={handleSelectUser} />
          {selectedUser && (
            <div className="mt-5 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-700">
                ¿Añadir a <span className="font-bold text-gray-900">{selectedUser.displayName}</span> al grupo?
              </p>

              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddClick}
                  disabled={isAdding}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isAdding ? 'Añadiendo...' : 'Añadir'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;