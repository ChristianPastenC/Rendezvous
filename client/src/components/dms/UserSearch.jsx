import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const UserSearch = ({ onSelectUser }) => {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.length < 3) {
      setError('La búsqueda requiere al menos 3 caracteres.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`http://localhost:3000/api/users/search?query=${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Error al buscar usuarios.');
      }
      const data = await response.json();
      setResults(data);
      if (data.length === 0) {
        setError('No se encontraron usuarios.');
      }
    } catch (err) {
      console.error("Error buscando usuarios:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user) => {
    setQuery('');
    setResults([]);
    setError('');
    onSelectUser(user);
  };

  return (
    <div className="p-2 border-b border-gray-900">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar usuarios por email..."
          className="w-full bg-gray-900 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </form>
      {loading && <p className="text-sm text-gray-400 p-2">Buscando...</p>}
      {error && <p className="text-sm text-red-400 p-2">{error}</p>}
      <div className="mt-2 max-h-48 overflow-y-auto">
        {results.map(user => (
          <button
            key={user.uid}
            onClick={() => handleSelect(user)}
            className="w-full text-left p-2 rounded-md hover:bg-gray-700 flex items-center space-x-2"
          >
            <span className="text-gray-200">{user.displayName}</span>
            <span className="text-gray-400 text-xs">({user.email})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UserSearch;