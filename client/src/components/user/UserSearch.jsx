import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { SearchIcon } from '../../assets/Icons';

const UserSearch = ({ onSelectUser }) => {
  const { t } = useTranslation();

  const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handles the user search form submission.
   * It prevents the default form action, validates the query length,
   * and fetches user search results from the API.
   * Updates state for loading, results, and errors.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.length < 3) {
      setError(t('userSearch.error.minLength'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_URL}/api/users/search?query=${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(t('userSearch.error.fetchFailed'));
      }
      const data = await response.json();
      setResults(data);
      if (data.length === 0) {
        setError(t('userSearch.error.noResults'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the selection of a user from the search results.
   * It resets the search input and results, then calls the onSelectUser callback
   * with the chosen user.
   * @param {object} user - The selected user object.
   */
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
          placeholder={t('userSearch.placeholder')}
          className="w-full bg-white text-gray-900 h-10 px-5 pr-12 rounded-lg text-sm border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button 
          type="submit"
          className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <SearchIcon
            className="h-4 w-4 fill-current"
          />
        </button>
      </form>

      {loading && <p className="text-sm text-gray-500 p-2">{t('userSearch.loading')}</p>}
      {error && <p className="text-sm text-red-600 p-2">{error}</p>}
      <div className="mt-2 max-h-48 overflow-y-auto">
        {results.map(user => (
          <button
            key={user.uid}
            onClick={() => handleSelect(user)}
            className="w-full text-left p-2 rounded-md hover:bg-gray-100 flex items-center space-x-2"
          >
            <span className="text-gray-900">
              {user.displayName}
            </span>
            <span className="text-gray-500 text-xs">
              ({user.email})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UserSearch;