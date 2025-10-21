// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import ProfileEditModal from '../components/user/UserPerfilModal';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser, reloadUser } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  const handleProfileUpdate = async () => {
    if (reloadUser) {
      await reloadUser();
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar tu cuenta permanentemente? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:3000/api/users/me', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Tu cuenta ha sido eliminada exitosamente.');
        await signOut(auth);
        navigate('/auth');
      } else {
        const { error } = await response.json();
        alert(`Error al eliminar la cuenta: ${error}`);
      }
    } catch (error) {
      console.error('Error en el proceso de eliminación:', error);
      alert('Ocurrió un error de red. Inténtalo de nuevo.');
    }
  };

  const handleCloseProfile = () => {
    setIsOpen(false);
    navigate('/');
  };

  useEffect(() => {
    setIsOpen(true);
  }, []);

  return (
    <>
      <ProfileEditModal
        isOpen={isOpen}
        onClose={handleCloseProfile}
        onProfileUpdate={handleProfileUpdate}
        onAccountDelete={handleDeleteAccount}
      />
    </>
  );
};

export default ProfilePage;