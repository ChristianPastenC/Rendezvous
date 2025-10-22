import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SearchIcon } from '../../assets/Icons';

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
    <div className="p-2 border-b border-gray-300">
      <form onSubmit={handleSearch} className="relative w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar usuarios por email..."
          className="w-full bg-white text-gray-900 h-10 px-5 pr-12 rounded-lg text-sm border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button type="submit" className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-600">
          <SearchIcon 
            className="h-4 w-4 fill-current"
          />
        </button>
      </form>

      {loading && <p className="text-sm text-gray-500 p-2">Buscando...</p>}
      {error && <p className="text-sm text-red-600 p-2">{error}</p>}
      <div className="mt-2 max-h-48 overflow-y-auto">
        {results.map(user => (
          <button
            key={user.uid}
            onClick={() => handleSelect(user)}
            className="w-full text-left p-2 rounded-md hover:bg-gray-100 flex items-center space-x-2"
          >
            <span className="text-gray-900">{user.displayName}</span>
            <span className="text-gray-500 text-xs">({user.email})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UserSearch;