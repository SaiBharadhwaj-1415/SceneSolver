import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, addUser, updateUserRole, deleteUser, getQueries, respondToQuery } from '../api';

function AdminPage({
  systemSettings,
  setSystemSettings,
  userQueries,
  setUserQueries,
  countryCode,
  setCountryCode,
  showCountryDropdown,
  setShowCountryDropdown,
  handleCountrySelect,
  username,
  validatePhone,
  loading,
  setLoading,
  error,
  setError,
  success,
  setSuccess
}) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    phone: '',
    password: 'DefaultPass123!',
    dob: '1995-05-15',
    role: 'user'
  });
  const [queries, setQueries] = useState([]);
  const [response, setResponse] = useState('');
  const [selectedQueryId, setSelectedQueryId] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getUsers();
        setUsers(response.users);
      } catch (err) {
        setError(err.detail || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [setLoading, setError]);

 useEffect(() => {
    const fetchQueries = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getQueries();
            console.log('Fetched queries response:', response);  // Add this log
            const queriesArray = Array.isArray(response) ? response : [];
            console.log('Setting queries to:', queriesArray);  // Add this log
            setQueries(queriesArray);
        } catch (err) {
            console.error('Fetch queries error:', err);
            setError(err.detail || 'Failed to fetch queries');
            console.log('Setting queries to empty array due to error');  // Add this log
            setQueries([]);
        } finally {
            setLoading(false);
        }
    };
    fetchQueries();
}, [setLoading, setError]);

  const handleAddUser = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  setSuccess(null);
  try {
    const response = await addUser(newUser);
    if (!response.user) {
      throw new Error('User data not returned from server');
    }
    setUsers([...users, response.user]);
    setNewUser({ username: '', email: '', phone: '', password: 'DefaultPass123!', dob: '1995-05-15', role: 'user' });
    setSuccess(response.message);
  } catch (err) {
    setError(err.message || 'Failed to add user');
  } finally {
    setLoading(false);
  }
};

  const handleRoleChange = async (identifier, newRole) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await updateUserRole({ [identifier.includes('@') ? 'email' : 'phone']: identifier, role: newRole });
      setUsers(users.map((user) =>
        (user.email === identifier || user.phone === identifier) ? { ...user, role: newRole } : user
      ));
      setSuccess(response.message);
    } catch (err) {
      setError(err.detail || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (identifier) => {
  setLoading(true);
  setError(null);
  setSuccess(null);
  try {
    const response = await deleteUser({ username: identifier });
    setUsers(users.filter((user) => user.username !== identifier)); // Updated filter to use username
    setSuccess(response.message);
  } catch (err) {
    const errorMessage = err.message.includes('404') ? 'User not found' : err.message || 'Failed to delete user';
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};

  const handleRespondQuery = async (queryId) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const responseData = await respondToQuery({
        query_id: queryId,
        response: response
      });
      const updatedQueries = await getQueries();
      setQueries(updatedQueries);
      setResponse('');
      setSelectedQueryId('');
      setSuccess(responseData.message);
    } catch (err) {
      setError(err.detail || 'Failed to respond to query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h2>Admin Dashboard</h2>
        <button onClick={() => navigate('/')} aria-label="Back to home">Back to Home</button>
      </header>
      {loading && (
        <div className="loading" aria-live="polite">
          <span className="spinner"></span>
          <p>Loading...</p>
        </div>
      )}
      {error && <p className="error-message" aria-live="assertive">{error}</p>}
      {success && <p className="success-message" aria-live="polite">{success}</p>}
      <form onSubmit={handleAddUser} className="add-user-form">
        <h3>Add User</h3>
        <input
          type="text"
          placeholder="Username *"
          value={newUser.username}
          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          required
          aria-label="Username"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          aria-label="Email"
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={newUser.phone}
          onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
          aria-label="Phone"
        />
        <input
          type="date"
          placeholder="Date of Birth *"
          value={newUser.dob}
          onChange={(e) => setNewUser({ ...newUser, dob: e.target.value })}
          required
          aria-label="Date of Birth"
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          aria-label="Role"
        >
          <option value="user">User</option>
          <option value="analyst">Analyst</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add User'}
        </button>
      </form>
      <div className="user-list">
        <h3>Registered Users</h3>
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email || user.phone}>
                  <td>{user.username}</td>
                  <td>{user.email || '-'}</td>
                  <td>{user.phone || '-'}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.email || user.phone, e.target.value)}
                      aria-label={`Change role for ${user.username}`}
                    >
                      <option value="user">User</option>
                      <option value="analyst">Analyst</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <button
  onClick={() => handleDeleteUser(user.username)}
  disabled={loading}
  aria-label={`Delete ${user.username}`}
>
  Delete
</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="queries-section">
        <h3>User Queries</h3>
        {queries.length === 0 ? (
          <p>No queries available.</p>
        ) : (
          <ul>
            {queries.map((query) => (
              <li key={query.query_id}>
                <p><strong>User:</strong> {query.username}</p>
                <p><strong>Query:</strong> {query.query}</p>
                <p><strong>Response:</strong> {query.response || 'No response yet'}</p>
                {selectedQueryId === query.query_id ? (
                  <div>
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Enter your response"
                      aria-label={`Response to query from ${query.username}`}
                    />
                    <button
                      onClick={() => handleRespondQuery(query.query_id)}
                      disabled={loading}
                    >
                      {loading ? 'Submitting...' : 'Submit Response'}
                    </button>
                    <button
                      onClick={() => setSelectedQueryId('')}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedQueryId(query.query_id)}
                    disabled={loading}
                  >
                    Respond
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AdminPage;