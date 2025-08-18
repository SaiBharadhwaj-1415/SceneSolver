import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWelcomeMessage } from '../api';
import logo from '../logo3.jpg';

function HomePage() {
  const navigate = useNavigate();
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWelcomeMessage = async () => {
      try {
        const response = await getWelcomeMessage();
        setWelcomeMessage(response.message);
      } catch (err) {
        setError(err.detail || 'Failed to fetch welcome message');
      } finally {
        setLoading(false);
      }
    };
    fetchWelcomeMessage();
  }, []);

  return (
    <div className="home-container">
      <header className="home-header">
        <img src={logo} alt="SceneSolver Logo" className="home-logo" />
        <h1>SceneSolver</h1>
      </header>
      <main className="home-main">
        <section className="project-description">
          <h2>About SceneSolver</h2>
          <p>
            SceneSolver is an AI-POWERED CRIME DETECTION platform designed to assist law enforcement and security professionals. By analyzing images and videos, our advanced algorithms detect suspicious activities, providing actionable insights with high accuracy. Whether you're a user uploading evidence, an analyst reviewing predictions, or an admin managing the system, SceneSolver streamlines the process of crime detection and evidence analysis.
          </p>
        </section>

        {loading ? (
          <div className="loading" aria-live="polite">
            <span className="spinner"></span>
            <p>Loading welcome message...</p>
          </div>
        ) : error ? (
          <p className="error-message" aria-live="assertive">{error}</p>
        ) : (
          <section className="welcome-message">
            <h3>{welcomeMessage}</h3>
          </section>
        )}

        <section className="dashboard">
          <h2>Dashboard</h2>
          <div className="dashboard-buttons">
            <button
              className="dashboard-btn"
              onClick={() => navigate('/login')}
              aria-label="Go to login page"
            >
              Login
            </button>
            <button
              className="dashboard-btn"
              onClick={() => navigate('/contact')}
              aria-label="Go to contact analyst page"
            >
              Contact
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;