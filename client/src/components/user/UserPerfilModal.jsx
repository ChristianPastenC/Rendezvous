import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import UserAvatar from './UserAvatar';
import { CameraIcon, CloseIcon } from '../../assets/Icons';

const ProfileEditModal = ({
  isOpen,
  onClose,
  onProfileUpdate,
  onAccountDelete,
  onSignOut
}) => {
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Editar Perfil</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            title="Cerrar"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <UserAvatar
                photoURL={previewUrl}
                displayName={displayName}
                className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                size="lg"
              />
              <label
                htmlFor="photo-upload"
                className="absolute bottom-1 right-1 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-all shadow-md active:scale-95"
                title="Cambiar foto de perfil"
              >
                <CameraIcon className="w-5 h-5" />
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
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-600 mb-2">
                Nombre de usuario
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Escribe tu nombre"
              />
            </div>
          </div>
          {error && (
            <p className="text-red-600 text-sm mt-4 text-center">{error}</p>
          )}
          <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {isUploading ? 'Subiendo...' : (isSaving ? 'Guardando...' : 'Guardar Cambios')}
            </button>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-2 p-6 space-y-5">
          <button
            onClick={onSignOut}
            className="w-full px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            title="Cerrar Sesión"
          >
            Cerrar Sesión
          </button>
          <div className="border border-red-300 bg-red-50 rounded-lg p-4">
            <h3 className="font-semibold text-lg text-red-700">Zona de Peligro</h3>
            <p className="text-sm text-red-600 mt-1">
              La eliminación de tu cuenta es una acción permanente y no se puede deshacer.
            </p>
            <button
              onClick={onAccountDelete}
              className="w-full mt-3 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Eliminar mi cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;