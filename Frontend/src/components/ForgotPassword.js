import React from 'react';
import { useNavigate } from 'react-router-dom';
import { countryCodes } from '../constants';
import { sendOtp, verifyOtp, resetPassword } from '../api';

function ForgotPassword({
  loginMethod,
  setLoginMethod,
  email,
  setEmail,
  phone,
  setPhone,
  countryCode,
  setCountryCode,
  otp,
  setOtp,
  forgotPasswordStep,
  setForgotPasswordStep,
  newPassword,
  setNewPassword,
  loading,
  setLoading,
  error,
  setError,
  success,
  setSuccess
}) {
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
  e.preventDefault();
  setError(null);
  setSuccess(null);
  setLoading(true);
  try {
    const data = loginMethod === 'email'
      ? { login_method: loginMethod, email, phone: null }
      : { login_method: loginMethod, phone: countryCode + phone, email: null };
    const response = await sendOtp(data);
    setSuccess(response.message);
    setForgotPasswordStep('step2');
  } catch (err) {
    setError(err.detail || 'Failed to send OTP');
  } finally {
    setLoading(false);
  }
};

const handleVerifyOtp = async (e) => {
  e.preventDefault();
  setError(null);
  setSuccess(null);
  setLoading(true);
  try {
    const data = loginMethod === 'email'
      ? { login_method: loginMethod, email, phone: null, otp }
      : { login_method: loginMethod, phone: countryCode + phone, email: null, otp };
    const response = await verifyOtp(data);
    setSuccess(response.message);
    setForgotPasswordStep('step3');
  } catch (err) {
    setError(err.detail || 'Invalid OTP');
  } finally {
    setLoading(false);
  }
};

 const handleResetPassword = async (e) => {
  e.preventDefault();
  setError(null);
  setSuccess(null);
  setLoading(true);
  try {
    // Validate inputs
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim() === '') {
      throw new Error('New password is required');
    }
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (loginMethod === 'email' && (!email || typeof email !== 'string' || email.trim() === '')) {
      throw new Error('Email is required');
    }
    if (loginMethod === 'phone' && (!phone || typeof phone !== 'string' || phone.trim() === '')) {
      throw new Error('Phone is required');
    }

    const data = loginMethod === 'email'
      ? { login_method: loginMethod, email, phone: null, new_password: newPassword }
      : { login_method: loginMethod, phone: countryCode + phone, email: null, new_password: newPassword };
    const response = await resetPassword(data);
    setSuccess(response.message);
    setTimeout(() => navigate('/login'), 2000);
  } catch (err) {
    setError(err.message || 'Failed to reset password');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="auth-container">
      <form
        onSubmit={
          forgotPasswordStep === 'step1'
            ? handleSendOtp
            : forgotPasswordStep === 'step2'
            ? handleVerifyOtp
            : handleResetPassword
        }
        className="auth-form"
      >
        <h2>Forgot Password</h2>
        {forgotPasswordStep === 'step1' ? (
          <>
            <div className="login-method-toggle">
              <label>
                <input
                  type="radio"
                  value="email"
                  checked={loginMethod === 'email'}
                  onChange={() => setLoginMethod('email')}
                  aria-label="Use email for OTP"
                />
                Email
              </label>
              <label>
                <input
                  type="radio"
                  value="phone"
                  checked={loginMethod === 'phone'}
                  onChange={() => setLoginMethod('phone')}
                  aria-label="Use phone for OTP"
                />
                Phone
              </label>
            </div>
            {loginMethod === 'email' ? (
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email address"
              />
            ) : (
              <div className="phone-input-wrapper">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  required
                  aria-label="Country code"
                >
                  {countryCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Phone Number (e.g., 1234567890)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="phone-input"
                  aria-label="Phone number"
                />
              </div>
            )}
            <button type="submit" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Get OTP'}
            </button>
          </>
        ) : forgotPasswordStep === 'step2' ? (
          <>
            <input
              type="tel"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              pattern="\d{6}"
              maxLength="6"
              aria-label="6-digit OTP"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </>
        ) : (
          <>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              aria-label="New password"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </>
        )}
        {loading && (
          <div className="loading" aria-live="polite">
            <span className="spinner"></span>
          </div>
        )}
        {error && <p className="error-message" aria-live="assertive">{error}</p>}
        {success && <p className="success-message" aria-live="polite">{success}</p>}
        <p>
          Back to{' '}
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

export default ForgotPassword;