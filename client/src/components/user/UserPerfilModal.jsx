import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';

const ProfileEditModal = ({ isOpen, onClose, onProfileUpdate, onAccountDelete }) => {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentUser.photoURL);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('La imagen es muy grande (máx 2MB).');
        return;
      }
      setPhotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    let newPhotoURL = currentUser.photoURL;

    try {
      if (photoFile) {
        setIsUploading(true);
        const storageRef = ref(storage, `avatars/${currentUser.uid}/${photoFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, photoFile);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            () => { },
            (uploadError) => reject(uploadError),
            () => {
              getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                newPhotoURL = downloadURL;
                resolve();
              });
            }
          );
        });
        setIsUploading(false);
      }

      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          photoURL: newPhotoURL,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'No se pudo actualizar el perfil.');
      }

      onProfileUpdate();
      onClose();

    } catch (err) {
      console.error("Error al guardar perfil:", err);
      setError(err.message);
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("Usuario cerró sesión exitosamente.");
      navigate("/auth");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-md text-gray-800 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Editar Perfil</h2>

        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <img
              src={previewUrl || 'default-avatar.png'}
              alt="Avatar"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-gray-200"
            />
            <label
              htmlFor="photo-upload"
              className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full cursor-pointer hover:bg-blue-600"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="w-full">
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Nombre de usuario
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-sm sm:text-base"
          >
            {isUploading ? 'Subiendo...' : (isSaving ? 'Guardando...' : 'Guardar Cambios')}
          </button>
        </div>
        <button
          onClick={handleSignOut}
          className="flex-1 p-2 rounded-lg hover:bg-red-50 bg-red-500 flex items-center justify-center"
          title="Cerrar Sesión"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <p>Cerrar Sesión</p>
        </button>
        <div className="border-t border-red-200 mt-6 pt-4">
          <h3 className="font-bold text-base sm:text-lg text-red-500">Zona de Peligro</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            La eliminación de tu cuenta es una acción permanente y no se puede deshacer.
          </p>
          <button
            onClick={onAccountDelete}
            className="w-full mt-3 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 font-semibold transition-colors text-white text-sm sm:text-base"
          >
            Eliminar mi cuenta
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;