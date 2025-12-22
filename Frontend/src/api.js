import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const getUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/users`, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to fetch users');
  }
};

export const addUser = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/add-user`, userData, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to add user');
  }
};

export const updateUserRole = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/update-user-role`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating user role:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to update user role');
  }
};

export const deleteUser = async (data) => {
  // Validate data
  if (!data || typeof data !== 'object') {
    console.error('Invalid data: Data must be an object');
    throw new Error('Invalid data: Data must be an object');
  }
  if (!data.username || typeof data.username !== 'string') {
    console.error('Invalid username: Username is required and must be a string');
    throw new Error('Invalid username: Username is required and must be a string');
  }

  try {
    const response = await axios.post(`${API_URL}/delete-user`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to delete user');
  }
};

export const submitQuery = async (queryData) => {
  try {
    const response = await axios.post(`${API_URL}/submit-query`, queryData, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting query:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to submit query');
  }
};

export const respondToQuery = async (queryData) => {
  try {
    const response = await axios.post(`${API_URL}/respond-query`, queryData, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error responding to query:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to respond to query');
  }
};

export const sendOtp = async (data) => {
  // Log the data being sent for debugging
  console.log('Sending OTP request with data:', data);

  // Validate the data before sending
  if (!data.login_method || !['email', 'phone'].includes(data.login_method)) {
    console.error('Invalid login_method:', data.login_method);
    throw new Error('Invalid login method: must be "email" or "phone"');
  }
  if (data.login_method === 'email' && (!data.email || typeof data.email !== 'string')) {
    console.error('Invalid email for email login method:', data.email);
    throw new Error('Email is required and must be a string when login_method is "email"');
  }
  if (data.login_method === 'phone' && (!data.phone || typeof data.phone !== 'string')) {
    console.error('Invalid phone for phone login method:', data.phone);
    throw new Error('Phone is required and must be a string when login_method is "phone"');
  }

  try {
    const response = await axios.post(`${API_URL}/send-otp`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    const errorDetail = error.response?.data?.detail || error.message;
    console.error('Error sending OTP:', error.response?.data || error.message);
    throw new Error(errorDetail || 'Failed to send OTP');
  }
};

export const verifyOtp = async (data) => {
  // Log the data being sent for debugging
  console.log('Verifying OTP request with data:', data);

  // Validate the data before sending
  if (!data.login_method || !['email', 'phone'].includes(data.login_method)) {
    console.error('Invalid login_method:', data.login_method);
    throw new Error('Invalid login method: must be "email" or "phone"');
  }
  if (data.login_method === 'email' && (!data.email || typeof data.email !== 'string')) {
    console.error('Invalid email for email login method:', data.email);
    throw new Error('Email is required and must be a string when login_method is "email"');
  }
  if (data.login_method === 'phone' && (!data.phone || typeof data.phone !== 'string')) {
    console.error('Invalid phone for phone login method:', data.phone);
    throw new Error('Phone is required and must be a string when login_method is "phone"');
  }
  if (!data.otp || typeof data.otp !== 'string') {
    console.error('Invalid OTP:', data.otp);
    throw new Error('OTP is required and must be a string');
  }

  try {
    const response = await axios.post(`${API_URL}/verify-otp`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    const errorDetail = error.response?.data?.detail || error.message;
    console.error('Error verifying OTP:', error.response?.data || error.message);
    throw new Error(errorDetail || 'Failed to verify OTP');
  }
};

export const resetPassword = async (data) => {
  console.log('Resetting password with data:', data);

  // Validate the data before sending
  if (!data.login_method || !['email', 'phone'].includes(data.login_method)) {
    console.error('Invalid login_method:', data.login_method);
    throw new Error('Invalid login method: must be "email" or "phone"');
  }
  if (!data.new_password || typeof data.new_password !== 'string') {
    console.error('Invalid new_password:', data.new_password);
    throw new Error('New password is required and must be a string');
  }
  if (data.login_method === 'email' && (!data.email || typeof data.email !== 'string')) {
    console.error('Invalid email for email login method:', data.email);
    throw new Error('Email is required and must be a string when login_method is "email"');
  }
  if (data.login_method === 'phone' && (!data.phone || typeof data.phone !== 'string')) {
    console.error('Invalid phone for phone login method:', data.phone);
    throw new Error('Phone is required and must be a string when login_method is "phone"');
  }

  try {
    const response = await axios.post(`${API_URL}/reset-password`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    const errorDetail = error.response?.data?.detail || error.message;
    console.error('Error resetting password:', errorDetail);
    throw new Error(errorDetail || 'Failed to reset password');
  }
};

export const getWelcomeMessage = async () => {
  try {
    const response = await axios.get(`${API_URL}/welcome`, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching welcome message:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to fetch welcome message');
  }
};

export const submitFile = async (file) => {
  console.log('Submitting file:', file); // Add this
  console.log('File size:', file.size); // Add this

  const formData = new FormData();

  const fileExtension = file.name.split('.').pop().toLowerCase();
  const mimeType = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'mp4': 'video/mp4',
  }[fileExtension] || file.type || 'application/octet-stream';

  const correctedFile = new File([file], file.name, { type: mimeType });
  console.log('Corrected file type:', correctedFile.type); // Add this
  formData.append('image', correctedFile);

  try {
    const response = await axios.post(`${API_URL}/submit-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Full error:', error);
    console.error('Error submitting file:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to submit file');
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${API_URL}/login`, credentials, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error logging in user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to login');
  }
};

export const register = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/register`, userData, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error registering user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to register');
  }
};

// Add getQueries function to fetch queries
export const getQueries = async () => {
  try {
    const response = await axios.get(`${API_URL}/queries`, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching queries:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to fetch queries');
  }
};

export const getMyQueries = async (username) => {
    try {
        if (!username) {
            throw new Error('Username is required to fetch queries');
        }
        const response = await axios.get(`${API_URL}/my-queries`, {
            params: { username }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching user queries:', error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || 'Failed to fetch user queries');
    }
};