import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { colors as defaultColors } from '../constants/colors';

const ForgotPassword = ({ colors = defaultColors }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async () => {
    setMessage('');
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox (and spam/junk folder).');
      setEmail('');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError('Failed to send reset email. Please try again later.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e0f2ff] to-[#d0ebff]">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-4xl font-bold mb-6 text-center text-blue-900">Reset Your Password</h2>
        {message && <p className="text-green-600 text-sm mb-4 text-center">{message}</p>}
        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border text-gray-800 bg-white rounded-lg focus:ring-2 focus:ring-blue-700"
              style={{ borderColor: colors.border }}
              required
            />
          </div>
          <button
            onClick={handleReset}
            className="w-full bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-800 transition font-semibold"
            style={{ backgroundColor: colors.primary, ':hover': { backgroundColor: colors.primaryDark } }}
          >
            Send Reset Link
          </button>
        </div>
        <p className="text-sm text-center mt-6 text-gray-600">
          Remember your password?{' '}
          <Link to="/login" className="text-blue-700 hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;