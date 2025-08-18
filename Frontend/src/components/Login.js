import React from 'react';
import { useNavigate } from 'react-router-dom';
import { countryCodes } from '../constants';
import { loginUser } from '../api';

function Login({
  loginMethod,
  setLoginMethod,
  email,
  setEmail,
  phone,
  setPhone,
  countryCode,
  setCountryCode,
  password,
  setPassword,
  handlePhoneChange,
  handleCountrySelect,
  showCountryDropdown,
  setShowCountryDropdown,
  phoneInputRef,
  loading,
  setLoading,
  error,
  setError,
  success,
  setSuccess,
  setUsername,
  setRole,
  setIsLoggedIn
}) {
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const credentials = {
      login_method: loginMethod,
      email: loginMethod === 'email' ? email : null,
      phone: loginMethod === 'phone' ? `${countryCode}${phone}` : null,
      password
    };

    try {
      const response = await loginUser(credentials);
      setUsername(response.username);
      setRole(response.role);
      setIsLoggedIn(true);
      setSuccess('Login successful!');
      setTimeout(() => navigate('/main'), 1000);
    } catch (err) {
      setError(err.message || 'An error occurred while logging in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Login</h2>
        <div className="login-method-toggle">
          <label>
            <input
              type="radio"
              value="email"
              checked={loginMethod === 'email'}
              onChange={() => setLoginMethod('email')}
              aria-label="Login with email"
            />
            Email
          </label>
          <label>
            <input
              type="radio"
              value="phone"
              checked={loginMethod === 'phone'}
              onChange={() => setLoginMethod('phone')}
              aria-label="Login with phone"
            />
            Phone
          </label>
        </div>
        {loginMethod === 'email' ? (
          <input
            type="email"
            placeholder="Email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email address"
          />
        ) : (
          <div className="phone-input-wrapper">
            <select
              value={countryCode}
              onChange={(e) => handleCountrySelect(e.target.value)}
              required
              aria-label="Country code"
            >
              {countryCodes.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} ({option.country})
                </option>
              ))}
            </select>
            <input
              type="tel"
              placeholder="Phone Number (e.g., 1234567890) *"
              value={phone}
              onChange={handlePhoneChange}
              onFocus={() => setShowCountryDropdown(true)}
              required
              className="phone-input"
              ref={phoneInputRef}
              aria-label="Phone number"
            />
            {showCountryDropdown && (
              <div className="country-dropdown">
                {countryCodes.map((option) => (
                  <div
                    key={option.code}
                    className="country-option"
                    onClick={() => handleCountrySelect(option.code)}
                    role="option"
                    aria-label={`Select ${option.country} (${option.code})`}
                  >
                    {option.code} ({option.country})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <input
          type="password"
          placeholder="Password *"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-label="Password"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {loading && (
          <div className="loading" aria-live="polite">
            <span className="spinner"></span>
          </div>
        )}
        {error && <p className="error-message" aria-live="assertive">{error}</p>}
        {success && <p className="success-message" aria-live="polite">{success}</p>}
        <p>
          <span
            className="link"
            onClick={() => navigate('/forgot-password')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/forgot-password')}
          >
            Forgot Password?
          </span>
        </p>
        <p>
          Don't have an account?{' '}
          <span
            className="link"
            onClick={() => navigate('/register')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/register')}
          >
            Register
          </span>
        </p>
      </form>
    </div>
  );
}

export default Login;