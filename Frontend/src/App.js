import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import HomePage from './components/HomePage';
import ContactAnalyst from './components/ContactAnalyst';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import MainApp from './components/MainApp';
import AdminPage from './components/AdminPage';
import MyQueries from './components/MyQueries'; // Added import for MyQueries
import { getUsers, submitFile, submitQuery, respondToQuery } from './api';

function AppContent() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('user');
  const [username, setUsername] = useState('');
  const [forgotPasswordStep, setForgotPasswordStep] = useState('step1');
  const [loginMethod, setLoginMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [userQueries, setUserQueries] = useState([]);
  const [queryName, setQueryName] = useState('');
  const [queryEmail, setQueryEmail] = useState('');
  const [queryText, setQueryText] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [users, setUsers] = useState([]);
  const [systemSettings, setSystemSettings] = useState({ phoneLogin: true, otpReset: true });
  const [systemLogs, setSystemLogs] = useState([]);
  const phoneInputRef = useRef(null);
  const sidebarRef = useRef(null);

  const validatePhone = (phone) => {
    return /^\d+$/.test(phone);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/'))) {
      if (preview) URL.revokeObjectURL(preview);
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
      setSuccess(null);
    } else {
      setError('Please select a valid image or video file.');
      setFile(null);
      setPreview(null);
    }
  };

  const handleSubmit = async (event) => {
  event.preventDefault();
  if (!file) {
    setError('Please select a file to upload.');
    return;
  }

  setError(null);
  setSuccess(null);
  setLoading(true); // Add this

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await submitFile(formData);
    const transformedPrediction = {
      image_filename: response.image_filename,
      timestamp: response.timestamp,
      objectDetection: response.object_detection.length > 0 ? response.object_detection[0].label : 'N/A',
      predicted_class: response.classifications.length > 0 ? response.classifications[0].classification : 'N/A',
      raw_scores: response.classifications.length > 0 ? response.classifications[0].confidence : 0,
      description: response.descriptions.length > 0 ? response.descriptions[0].description : 'No description available',
    };

    setPredictions([transformedPrediction]);
    setHistory((prev) => [...prev, transformedPrediction]);
    setSuccess('Prediction successful!');
  } catch (err) {
    setError('Failed to get prediction: ' + err.message);
    setPredictions([]);
  } finally {
    setLoading(false); // Add this
  }
};
 
  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!queryName || !queryEmail || !queryText) {
      setError('Please fill in all query fields.');
      setLoading(false);
      return;
    }

    try {
      const response = await submitQuery({ name: queryName, email: queryEmail, query: queryText });
      setUserQueries((prev) => [...prev, { id: Date.now(), ...response, status: 'open', assignee: null }]);
      setQueryName('');
      setQueryEmail('');
      setQueryText('');
      setSuccess('Query submitted successfully! An analyst will respond soon.');
    } catch (err) {
      setError(err.message || 'Failed to submit query.');
    } finally {
      setLoading(false);
    }
  };

 const handleQueryResponse = async (queryId, responseText) => {
  setLoading(true);
  setError(null);
  setSuccess(null);

  try {
    await respondToQuery({ queryId: queryId.toString(), response: responseText });
    setUserQueries((prev) =>
      prev.map((query) =>
        query.id === queryId ? { ...query, status: 'resolved', response: responseText } : query
      )
    );
    setSystemLogs((prev) => [
      ...prev,
      { id: Date.now(), action: `Responded to query ${queryId}`, timestamp: new Date().toLocaleString() },
    ]);
    setSuccess(`Response sent for query ID: ${queryId}`);
  } catch (err) {
    const errorMessage = err.response?.data?.detail || err.message || 'Failed to respond to query.';
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};

  const handleAssignQuery = (queryId, assignee) => {
    setUserQueries((prev) =>
      prev.map((query) =>
        query.id === queryId ? { ...query, assignee } : query
      )
    );
    setSystemLogs((prev) => [
      ...prev,
      { id: Date.now(), action: `Assigned query ${queryId} to ${assignee}`, timestamp: new Date().toLocaleString() },
    ]);
    setSuccess(`Query ${queryId} assigned to ${assignee}`);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const codeLength = countryCode.length;
    if (value.startsWith(countryCode)) {
      const phonePart = value.slice(codeLength);
      if (validatePhone(phonePart) || phonePart === '') {
        setPhone(phonePart);
      }
    } else {
      setPhone(value);
    }
  };

  const handleCountrySelect = (code) => {
    setCountryCode(code);
    setShowCountryDropdown(false);
    phoneInputRef.current?.focus();
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleClickOutside = (e) => {
    if (
      (sidebarRef.current && !sidebarRef.current.contains(e.target) && !e.target.closest('.profile-section')) ||
      (phoneInputRef.current && !phoneInputRef.current.contains(e.target))
    ) {
      setShowSidebar(false);
      setShowCountryDropdown(false);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUsers();
        setUsers(response.users);
      } catch (err) {
        setError(err.message || 'Failed to fetch users');
      }
    };
    if (isLoggedIn && role === 'admin') {
      fetchUsers();
    }
  }, [isLoggedIn, role]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let prevPreview = preview;
    return () => {
      if (prevPreview) URL.revokeObjectURL(prevPreview);
    };
  }, [preview]);

  useEffect(() => {
    if (isLoggedIn) {
      const currentPath = window.location.pathname;
      if (
        currentPath === '/' ||
        currentPath === '/contact' ||
        currentPath === '/login' ||
        currentPath === '/register' ||
        currentPath === '/forgot-password'
      ) {
        navigate('/main');
      }
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!isLoggedIn) {
      setFile(null);
      setPreview(null);
      setPredictions([]);
      setHistory([]);
      setUserQueries([]);
      setEmail('');
      setPhone('');
      setPassword('');
      setOtp('');
      setNewPassword('');
      setFullName('');
      setDob('');
      setGender('');
      setQueryName('');
      setQueryEmail('');
      setQueryText('');
      setForgotPasswordStep('step1');
      setError(null);
      setSuccess(null);
    }
  }, [isLoggedIn]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          !isLoggedIn ? (
            <HomePage />
          ) : (
            <MainApp
              role={role}
              username={username}
              file={file}
              setFile={setFile}
              preview={preview}
              setPreview={setPreview}
              predictions={predictions}
              setPredictions={setPredictions}
              history={history}
              setHistory={setHistory}
              userQueries={userQueries}
              showSidebar={showSidebar}
              setShowSidebar={setShowSidebar}
              sidebarRef={sidebarRef}
              toggleSidebar={toggleSidebar}
              setIsLoggedIn={setIsLoggedIn}
              setUsername={setUsername}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              handleQueryResponse={handleQueryResponse}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          )
        }
      />
      <Route
        path="/contact"
        element={
          !isLoggedIn ? (
            <ContactAnalyst
              role={role}
              userQueries={userQueries}
              queryName={queryName}
              setQueryName={setQueryName}
              queryEmail={queryEmail}
              setQueryEmail={setQueryEmail}
              queryText={queryText}
              setQueryText={setQueryText}
              handleQuerySubmit={handleQuerySubmit}
              handleQueryResponse={handleQueryResponse}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          ) : (
            <MainApp
              role={role}
              username={username}
              file={file}
              setFile={setFile}
              preview={preview}
              setPreview={setPreview}
              predictions={predictions}
              setPredictions={setPredictions}
              history={history}
              setHistory={setHistory}
              userQueries={userQueries}
              showSidebar={showSidebar}
              setShowSidebar={setShowSidebar}
              sidebarRef={sidebarRef}
              toggleSidebar={toggleSidebar}
              setIsLoggedIn={setIsLoggedIn}
              setUsername={setUsername}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              handleQueryResponse={handleQueryResponse}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          )
        }
      />
      <Route
        path="/login"
        element={
          !isLoggedIn ? (
            <Login
              loginMethod={loginMethod}
              setLoginMethod={setLoginMethod}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              password={password}
              setPassword={setPassword}
              handleLogin={() => {}} // Handled by Login.js
              handlePhoneChange={handlePhoneChange}
              handleCountrySelect={handleCountrySelect}
              showCountryDropdown={showCountryDropdown}
              setShowCountryDropdown={setShowCountryDropdown}
              phoneInputRef={phoneInputRef}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
              setUsername={setUsername}
              setRole={setRole}
              setIsLoggedIn={setIsLoggedIn}
            />
          ) : (
            <MainApp
              role={role}
              username={username}
              file={file}
              setFile={setFile}
              preview={preview}
              setPreview={setPreview}
              predictions={predictions}
              setPredictions={setPredictions}
              history={history}
              setHistory={setHistory}
              userQueries={userQueries}
              showSidebar={showSidebar}
              setShowSidebar={setShowSidebar}
              sidebarRef={sidebarRef}
              toggleSidebar={toggleSidebar}
              setIsLoggedIn={setIsLoggedIn}
              setUsername={setUsername}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              handleQueryResponse={handleQueryResponse}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          )
        }
      />
      <Route
        path="/register"
        element={
          !isLoggedIn ? (
            <Register
              loginMethod={loginMethod}
              setLoginMethod={setLoginMethod}
              fullName={fullName}
              setFullName={setFullName}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              password={password}
              setPassword={setPassword}
              dob={dob}
              setDob={setDob}
              gender={gender}
              setGender={setGender}
              handleRegister={() => {}} // Handled by Register.js
              handlePhoneChange={handlePhoneChange}
              handleCountrySelect={handleCountrySelect}
              showCountryDropdown={showCountryDropdown}
              setShowCountryDropdown={setShowCountryDropdown}
              phoneInputRef={phoneInputRef}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          ) : (
            <MainApp
              role={role}
              username={username}
              file={file}
              setFile={setFile}
              preview={preview}
              setPreview={setPreview}
              predictions={predictions}
              setPredictions={setPredictions}
              history={history}
              setHistory={setHistory}
              userQueries={userQueries}
              showSidebar={showSidebar}
              setShowSidebar={setShowSidebar}
              sidebarRef={sidebarRef}
              toggleSidebar={toggleSidebar}
              setIsLoggedIn={setIsLoggedIn}
              setUsername={setUsername}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              handleQueryResponse={handleQueryResponse}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          )
        }
      />
      <Route
        path="/forgot-password"
        element={
          !isLoggedIn ? (
            <ForgotPassword
              loginMethod={loginMethod}
              setLoginMethod={setLoginMethod}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              otp={otp}
              setOtp={setOtp}
              forgotPasswordStep={forgotPasswordStep}
              setForgotPasswordStep={setForgotPasswordStep}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              handlePhoneChange={handlePhoneChange}
              handleCountrySelect={handleCountrySelect}
              showCountryDropdown={showCountryDropdown}
              setShowCountryDropdown={setShowCountryDropdown}
              phoneInputRef={phoneInputRef}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          ) : (
            <MainApp
              role={role}
              username={username}
              file={file}
              setFile={setFile}
              preview={preview}
              setPreview={setPreview}
              predictions={predictions}
              setPredictions={setPredictions}
              history={history}
              setHistory={setHistory}
              userQueries={userQueries}
              showSidebar={showSidebar}
              setShowSidebar={setShowSidebar}
              sidebarRef={sidebarRef}
              toggleSidebar={toggleSidebar}
              setIsLoggedIn={setIsLoggedIn}
              setUsername={setUsername}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              handleQueryResponse={handleQueryResponse}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          )
        }
      />
      <Route
        path="/main"
        element={
          isLoggedIn ? (
            <MainApp
              role={role}
              username={username}
              file={file}
              setFile={setFile}
              preview={preview}
              setPreview={setPreview}
              predictions={predictions}
              setPredictions={setPredictions}
              history={history}
              setHistory={setHistory}
              userQueries={userQueries}
              showSidebar={showSidebar}
              setShowSidebar={setShowSidebar}
              sidebarRef={sidebarRef}
              toggleSidebar={toggleSidebar}
              setIsLoggedIn={setIsLoggedIn}
              setUsername={setUsername}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              handleQueryResponse={handleQueryResponse}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          ) : (
            <Login
              loginMethod={loginMethod}
              setLoginMethod={setLoginMethod}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              password={password}
              setPassword={setPassword}
              handleLogin={() => {}}
              handlePhoneChange={handlePhoneChange}
              handleCountrySelect={handleCountrySelect}
              showCountryDropdown={showCountryDropdown}
              setShowCountryDropdown={setShowCountryDropdown}
              phoneInputRef={phoneInputRef}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
              setUsername={setUsername}
              setRole={setRole}
              setIsLoggedIn={setIsLoggedIn}
            />
          )
        }
      />
      <Route
        path="/admin"
        element={
          isLoggedIn && role === 'admin' ? (
            <AdminPage
              users={users}
              setUsers={setUsers}
              systemSettings={systemSettings}
              setSystemSettings={setSystemSettings}
              systemLogs={systemLogs}
              setSystemLogs={setSystemLogs}
              userQueries={userQueries}
              setUserQueries={setUserQueries}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              showCountryDropdown={showCountryDropdown}
              setShowCountryDropdown={setShowCountryDropdown}
              handleAssignQuery={handleAssignQuery}
              handleQueryResponse={handleQueryResponse}
              username={username}
              history={history}
              validatePhone={validatePhone}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
              handleCountrySelect={handleCountrySelect}
            />
          ) : isLoggedIn ? (
            <MainApp
              role={role}
              username={username}
              file={file}
              setFile={setFile}
              preview={preview}
              setPreview={setPreview}
              predictions={predictions}
              setPredictions={setPredictions}
              history={history}
              setHistory={setHistory}
              userQueries={userQueries}
              showSidebar={showSidebar}
              setShowSidebar={setShowSidebar}
              sidebarRef={sidebarRef}
              toggleSidebar={toggleSidebar}
              setIsLoggedIn={setIsLoggedIn}
              setUsername={setUsername}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              handleQueryResponse={handleQueryResponse}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          ) : (
            <Login
              loginMethod={loginMethod}
              setLoginMethod={setLoginMethod}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              password={password}
              setPassword={setPassword}
              handleLogin={() => {}}
              handlePhoneChange={handlePhoneChange}
              handleCountrySelect={handleCountrySelect}
              showCountryDropdown={showCountryDropdown}
              setShowCountryDropdown={setShowCountryDropdown}
              phoneInputRef={phoneInputRef}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
              setUsername={setUsername}
              setRole={setRole}
              setIsLoggedIn={setIsLoggedIn}
            />
          )
        }
      />
      <Route
        path="/my-queries"  // Added route for MyQueries
        element={
          isLoggedIn ? (
            <MyQueries username={username} />
          ) : (
            <Login
              loginMethod={loginMethod}
              setLoginMethod={setLoginMethod}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              password={password}
              setPassword={setPassword}
              handleLogin={() => {}}
              handlePhoneChange={handlePhoneChange}
              handleCountrySelect={handleCountrySelect}
              showCountryDropdown={showCountryDropdown}
              setShowCountryDropdown={setShowCountryDropdown}
              phoneInputRef={phoneInputRef}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
              setUsername={setUsername}
              setRole={setRole}
              setIsLoggedIn={setIsLoggedIn}
            />
          )
        }
      />
      <Route
        path="*"
        element={
          isLoggedIn ? (
            <MainApp
              role={role}
              username={username}
              file={file}
              setFile={setFile}
              preview={preview}
              setPreview={setPreview}
              predictions={predictions}
              setPredictions={setPredictions}
              history={history}
              setHistory={setHistory}
              userQueries={userQueries}
              showSidebar={showSidebar}
              setShowSidebar={setShowSidebar}
              sidebarRef={sidebarRef}
              toggleSidebar={toggleSidebar}
              setIsLoggedIn={setIsLoggedIn}
              setUsername={setUsername}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              handleQueryResponse={handleQueryResponse}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              success={success}
              setSuccess={setSuccess}
            />
          ) : (
            <HomePage />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;