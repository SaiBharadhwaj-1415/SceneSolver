import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../logo3.jpg';
import { submitFile } from '../api';

function MainApp({
  role,
  username,
  file,
  setFile,
  preview,
  setPreview,
  predictions,
  setPredictions,
  history,
  setHistory,
  userQueries,
  showSidebar,
  setShowSidebar,
  sidebarRef,
  toggleSidebar,
  setIsLoggedIn,
  setUsername,
  handleFileChange,
  clearAll,
  handleQueryResponse,
  loading,
  setLoading,
  error,
  success,
  setError,
  setSuccess,
}) {
  const navigate = useNavigate();
  const [submissionMessage, setSubmissionMessage] = useState(null);
  // Added state for managing query responses
  const [responseTexts, setResponseTexts] = useState({});

  // Handler for updating response text
  const handleResponseChange = (queryId, text) => {
    setResponseTexts((prev) => ({ ...prev, [queryId]: text }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setFile(null);
    setPreview(null);
    setPredictions([]);
    setHistory([]);
    setShowSidebar(false);
    navigate('/');
  };

  // Override handleSubmit to transform the backend response
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    setSubmissionMessage('Submitted, wait for the prediction...');
    setError(null);
    setSuccess(null);
    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await submitFile(file);

      // Transform the backend response into the format expected by the frontend
      const transformedPrediction = {
        image_filename: response.image_filename,
        timestamp: response.timestamp,
        // Map the first detected object (if any) to objectDetection
        objectDetection: response.object_detection.length > 0 ? response.object_detection[0].label : 'N/A',
        // Map the first classification (if any) to predicted_class and raw_scores
        predicted_class: response.classifications.length > 0 ? response.classifications[0].classification : 'N/A',
        raw_scores: response.classifications.length > 0 ? response.classifications[0].confidence : 0,
        // Map the first description (if any) to description
        description: response.descriptions.length > 0 ? response.descriptions[0].description : 'No description available',
        annotated_image: response.annotated_image || preview,
      };

      if (response.object_detection.length === 0) {
        setError('No objects detected in the image. Try a different image or adjust detection settings.');
        setPredictions([]);
        setHistory((prev) => [...prev, { ...transformedPrediction, note: 'No objects detected' }]);
        setSubmissionMessage(null);
        setLoading(false);
        return;
      }

      // Update predictions state (for results-section)
      setPredictions([transformedPrediction]);

      // Update history state (for sidebar)
      setHistory((prev) => [...prev, transformedPrediction]);

      setSuccess('Prediction successful!');
    } catch (err) {
      setError('Failed to get prediction: ' + err.message);
      setPredictions([]);
    }
    finally {
      setSubmissionMessage(null); // Clear submission message
      setLoading(false); // Stop loading
    }
  };

  return (
    <div className={`app-container ${loading ? 'loading' : ''} ${submissionMessage ? 'submission-message' : ''}`}>
      <div className="video-background">
        <video autoPlay muted loop playsInline>
          <source src="/messi.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="video-overlay"></div>
      </div>
      <header className="app-header">
  <div className="header-content">
    <img src={logo} alt="SceneSolver Logo" className="logo-small fixed-logo" />
    <div>
      <h1>SceneSolver</h1>
      <p>Crime Detection - Role: {role.charAt(0).toUpperCase() + role.slice(1)}</p>
    </div>
  </div>
  <div className="header-right">
    <section className="profile-section fixed-sidebar-toggle" onClick={toggleSidebar}>
      <div className="profile-initial" title={`${username} (${role.charAt(0).toUpperCase() + role.slice(1)})`}>
        {username ? username.charAt(0).toUpperCase() : '?'}
      </div>
    </section>
  </div>
</header>
      <div
        ref={sidebarRef}
        className={`profile-sidebar ${showSidebar ? 'open' : ''}`}
      >
        <div className="sidebar-header">
          <h3>{username || 'User'}</h3>
        </div>
        <div className="sidebar-content">
          {role === 'admin' && (
            <button
              className="sidebar-btn"
              onClick={() => {
                navigate('/admin');
                setShowSidebar(false);
              }}
              aria-label="Go to admin dashboard"
            >
              Admin Dashboard
            </button>
          )}
          <h2>Prediction History</h2>
          {history.length > 0 ? (
            history.map((item, index) => (
              <div key={index} className="sidebar-history-item">
                <p>
                  <strong>File:</strong> {item.image_filename}
                </p>
                <p>
                  <strong>Prediction:</strong> {item.predicted_class}
                </p>
                <p>
                  <strong>Confidence:</strong> {(item.raw_scores * 100).toFixed(2)}%
                </p>
                <p className="description">
                  <strong>Description:</strong> {item.description}
                </p>
                <p>
                  <strong>Time:</strong> {item.timestamp}
                </p>
              </div>
            ))
          ) : (
            <p>No prediction history available.</p>
          )}
          <button
            className="sidebar-btn"
            onClick={() => {
              navigate('/my-queries');
              setShowSidebar(false);
            }}
            aria-label="View your queries"
          >
            Get Queries
          </button>
        </div>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      <main className="app-main">
        <section className="upload-section">
          <h2>Upload Evidence (Image or Video)</h2>
          <form onSubmit={handleSubmit} className="upload-form">
            <label htmlFor="file-upload" className="custom-upload-btn">
              Upload File
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="file-input"
              aria-label="Upload image or video"
            />
            {preview && file && (
              <div className="preview-container">
                {file.type.startsWith('image/') ? (
                  <img src={preview} alt="Preview" className="preview-media" />
                ) : (
                  <video src={preview} controls className="preview-media" />
                )}
              </div>
            )}
            <button type="submit" className="submit-btn" disabled={loading || submissionMessage !== null}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
          {submissionMessage && (
            <p className="submission-message" aria-live="polite">{submissionMessage}</p>
          )}
        </section>
        {loading && (
          <div className="loading" aria-live="polite">
            <span className="spinner"></span>
            <p>Analyzing evidence...</p>
          </div>
        )}
        {error && <p className="error-message" aria-live="assertive">{error}</p>}
        {success && <p className="success-message" aria-live="polite">{success}</p>}
        {predictions.length > 0 && (
          <section className="results-section">
            <div className="results-header">
              <h2>Analysis Results</h2>
              {(role === 'admin' || role === 'analyst') && (
                <button
                  className="clear-btn"
                  onClick={() => {
                    setPredictions([]);
                    setSuccess(null);
                    setError(null);
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="image-grid">
  {predictions.map((prediction, index) => (
    <div key={index} className="image-card">
      {prediction.annotated_image && (
        <img src={prediction.annotated_image} alt="Annotated" className="result-media" />
      )}
                  <div className="prediction-info">
                    <p>
                      <strong>File:</strong> {prediction.image_filename}
                    </p>
                    <p>
                      <strong>Prediction:</strong> {prediction.predicted_class}
                    </p>
                    <p>
                      <strong>Object Detection:</strong> {prediction.objectDetection || 'N/A'}
                    </p>
                    <p className="description">
                      <strong>Description:</strong> {prediction.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {role === 'admin' && (
          <section className="admin-section">
            <h2>Admin Controls</h2>
            <p>Manage users or system settings here.</p>
            <button
              className="clear-btn"
              onClick={() => navigate('/admin')}
              aria-label="Go to admin dashboard"
            >
              Admin Dashboard
            </button>
          </section>
        )}
        {role === 'analyst' && (
          <section className="analyst-section">
            <h2>Analyst Tools</h2>
            <p>Review and annotate predictions or respond to user queries.</p>
            <button
              className="clear-btn"
              onClick={() => alert('Annotation tool opened')}
            >
              Annotate Predictions
            </button>
            {userQueries.length > 0 && (
              <div className="query-list">
                <h3>User Queries</h3>
                {userQueries.map((query) => (
                  <div key={query.id} className="query-item">
                    <p>
                      <strong>Name:</strong> {query.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {query.email}
                    </p>
                    <p>
                      <strong>Query:</strong> {query.query}
                    </p>
                    <p>
                      <strong>Time:</strong> {query.timestamp}
                    </p>
                    <textarea
                      placeholder="Enter response"
                      value={responseTexts[query.id] || ''}
                      onChange={(e) => handleResponseChange(query.id, e.target.value)}
                    />
                    <button
                      className="respond-btn"
                      onClick={() => {
                        const responseText = responseTexts[query.id] || '';
                        if (responseText) {
                          handleQueryResponse(query.id.toString(), responseText);
                          setResponseTexts((prev) => ({ ...prev, [query.id]: '' }));
                        } else {
                          alert('Please enter a response.');
                        }
                      }}
                    >
                      Respond
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default MainApp;