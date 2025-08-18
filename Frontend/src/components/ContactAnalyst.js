import React from 'react';
import { useNavigate } from 'react-router-dom';
import { submitQuery, respondToQuery } from '../api';
import logo from '../logo3.jpg';

function ContactAnalyst({
  role,
  userQueries,
  queryName,
  setQueryName,
  queryEmail,
  setQueryEmail,
  queryText,
  setQueryText,
  loading,
  setLoading,
  error,
  setError,
  success,
  setSuccess
}) {
  const navigate = useNavigate();

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await submitQuery({
        username: queryName, // Changed from name to username to match backend
        query: queryText
      });
      setSuccess(response.message);
      setQueryName('');
      setQueryEmail('');
      setQueryText('');
    } catch (err) {
      setError(err.detail || 'An error occurred while submitting the query');
    } finally {
      setLoading(false);
    }
  };

  const handleQueryResponse = async (queryId, responseText) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await respondToQuery({ query_id: queryId, response: responseText });
      setSuccess(response.message);
    } catch (err) {
      setError(err.detail || 'An error occurred while responding to the query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analyst-container">
      <header className="analyst-header">
        <img src={logo} alt="SceneSolver Logo" className="home-logo" />
      </header>
      <main className="analyst-main">
        <section className="query-form-section">
          <h2>Submit Your Query</h2>
          <form onSubmit={handleQuerySubmit} className="query-form">
            <input
              type="text"
              placeholder="Your Name *"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              required
              aria-label="Your name"
            />
            <input
              type="email"
              placeholder="Your Email *"
              value={queryEmail}
              onChange={(e) => setQueryEmail(e.target.value)}
              required
              aria-label="Your email address"
            />
            <textarea
              placeholder="Your Query *"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              required
              aria-label="Your query"
            ></textarea>
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Query'}
            </button>
            {loading && (
              <div className="loading" aria-live="polite">
                <span className="spinner"></span>
              </div>
            )}
            {error && <p className="error-message" aria-live="assertive">{error}</p>}
            {success && <p className="success-message" aria-live="polite">{success}</p>}
          </form>
          <p>
            Back to{' '}
            <span
              className="link"
              onClick={() => navigate('/')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
            >
              Home
            </span>
          </p>
        </section>

        {role === 'analyst' && userQueries.length > 0 && (
          <section className="query-list-section">
            <h2>User Queries</h2>
            <div className="query-list">
              {userQueries.map((query) => (
                <div key={query.id} className="query-item">
                  <p><strong>Name:</strong> {query.name}</p>
                  <p><strong>Email:</strong> {query.email}</p>
                  <p><strong>Query:</strong> {query.query}</p>
                  <p><strong>Time:</strong> {query.timestamp}</p>
                  <button
                    className="respond-btn"
                    onClick={() => handleQueryResponse(query.id, 'Mock response')}
                  >
                    Respond
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default ContactAnalyst;