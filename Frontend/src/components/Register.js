import React from 'react';
import { useNavigate } from 'react-router-dom';
import { countryCodes } from '../constants';
import { register } from '../api';

function Register({
  loginMethod,
  setLoginMethod,
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  countryCode,
  setCountryCode,
  password,
  setPassword,
  dob,
  setDob,
  gender,
  setGender,
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
  setSuccess
}) {
  const navigate = useNavigate();

  const validatePhoneInput = (value) => {
    // Allow only digits and enforce 10-digit length
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits;
    }
    return digits.slice(0, 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate inputs
      if (!fullName.trim()) {
        throw new Error('Full name is required');
      }
      if (loginMethod === 'email' && !email.includes('@')) {
        throw new Error('Invalid email format');
      }
      if (loginMethod === 'phone' && phone.length !== 10) {
        throw new Error('Phone number must be exactly 10 digits');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      if (!dob) {
        throw new Error('Date of birth is required');
      }

      // Convert dob to ISO format
      const isoDob = new Date(dob).toISOString();
      
      // Use unique dummy values to avoid conflicts
      const uniqueId = Date.now();
      const userData = {
        username: fullName,
        email: loginMethod === 'email' ? email : `dummy${uniqueId}@example.com`,
        phone: loginMethod === 'phone' ? `${countryCode}${phone}` : `+91${uniqueId}`,
        password,
        dob: isoDob,
        role: 'user',
        login_method: loginMethod // Add this field
      };

      console.log('Registering with:', userData); // Debug log
      const response = await register(userData);
      setSuccess(response.message);
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      console.error('Registration error:', err); // Debug log
      setError(err.message || 'An error occurred while registering');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Register</h2>
        <div className="login-method-toggle">
          <label>
            <input
              type="radio"
              value="email"
              checked={loginMethod === 'email'}
              onChange={() => setLoginMethod('email')}
              aria-label="Register with email"
            />
            Email
          </label>
          <label>
            <input
              type="radio"
              value="phone"
              checked={loginMethod === 'phone'}
              onChange={() => setLoginMethod('phone')}
              aria-label="Register with phone"
            />
            Phone
          </label>
        </div>
        <input
          type="text"
          placeholder="Full Name *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          aria-label="Full name"
        />
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
              onChange={(e) => setPhone(validatePhoneInput(e.target.value))}
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
          placeholder="Password * (e.g., Abc123!)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-label="Password"
        />
        <input
          type="date"
          placeholder="Date of Birth *"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
          aria-label="Date of birth"
        />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          required
          aria-label="Gender"
        >
          <option value="">Select Gender *</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        {loading && (
          <div className="loading" aria-live="polite">
            <span className="spinner"></span>
          </div>
        )}
        {error && <p className="error-message" aria-live="assertive">{error}</p>}
        {success && <p className="success-message" aria-live="polite">{success}</p>}
        <p>
          Already have an account?{' '}
          <span
            className="link"
            onClick={() => navigate('/login')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/login')}
          >
            Login
          </span>
        </p>
      </form>
    </div>
  );
}

export default Register;