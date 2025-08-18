import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyQueries } from '../api';
import logo from '../logo3.jpg';

function MyQueries({ username }) {  // Pass username as a prop (in a real app, get from auth context)
    const navigate = useNavigate();
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMyQueries = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await getMyQueries(username);
                const queriesArray = Array.isArray(response) ? response : [];
                setQueries(queriesArray);
            } catch (err) {
                setError(err.message || 'Failed to fetch your queries');
                setQueries([]);
            } finally {
                setLoading(false);
            }
        };
        fetchMyQueries();
    }, [username]);

    return (
        <div className="my-queries-container">
            <header className="my-queries-header">
                <img src={logo} alt="SceneSolver Logo" className="home-logo" />
                <h1>My Queries</h1>
            </header>
            <main className="my-queries-main">
                <section className="queries-section">
                    <h2>Your Submitted Queries</h2>
                    {loading && <p>Loading...</p>}
                    {error && <p className="error-message">{error}</p>}
                    {queries.length === 0 && !loading ? (
                        <p>No queries found.</p>
                    ) : (
                        <ul>
                            {queries.map((query) => (
                                <li key={query.query_id}>
                                    <p><strong>Query:</strong> {query.query}</p>
                                    <p><strong>Submitted At:</strong> {query.createdAt}</p>
                                    <p><strong>Response:</strong> {query.response || 'No response yet'}</p>
                                    {query.response && (
                                        <p><strong>Responded At:</strong> {query.updatedAt}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
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
            </main>
        </div>
    );
}

export default MyQueries;