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
    <div className="p-2 border-b border-gray-200">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar usuarios por email..."
          className="w-full bg-gray-50 text-gray-800 p-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>
      {loading && <p className="text-sm text-gray-500 p-2">Buscando...</p>}
      {error && <p className="text-sm text-red-500 p-2">{error}</p>}
      <div className="mt-2 max-h-48 overflow-y-auto">
        {results.map(user => (
          <button
            key={user.uid}
            onClick={() => handleSelect(user)}
            className="w-full text-left p-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <span className="text-gray-700">{user.displayName}</span>
            <span className="text-gray-500 text-xs">({user.email})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UserSearch;