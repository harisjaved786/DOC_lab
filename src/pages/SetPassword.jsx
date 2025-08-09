import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import { colors as defaultColors } from '../constants/colors';

const SetPassword = ({ colors = defaultColors }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isValidCode, setIsValidCode] = useState(false);

  const oobCode = searchParams.get('oobCode'); // Firebase reset code from URL

  useEffect(() => {
    if (!oobCode) {
      setError('Invalid or missing reset code.');
      return;
    }

    // Verify the password reset code
    verifyPasswordResetCode(auth, oobCode)
      .then(() => {
        setIsValidCode(true);
      })
      .catch((error) => {
        if (error.code === 'auth/expired-action-code') {
          setError('The password reset link has expired.');
        } else if (error.code === 'auth/invalid-action-code') {
          setError('The password reset link is invalid.');
        } else {
          setError('An error occurred. Please request a new reset link.');
        }
      });
  }, [oobCode]);

  const handleSetPassword = async () => {
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isValidCode) {
      setError('Cannot reset password due to an invalid or expired link.');
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setMessage('Password reset successfully! You can now log in with your new password.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      if (error.code === 'auth/expired-action-code') {
        setError('The password reset link has expired.');
      } else if (error.code === 'auth/invalid-action-code') {
        setError('The password reset link is invalid.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e0f2ff] to-[#d0ebff]">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-4xl font-bold mb-6 text-center text-blue-900">Set New Password</h2>
        {message && <p className="text-green-600 text-sm mb-4 text-center">{message}</p>}
        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border text-gray-800 bg-white rounded-lg focus:ring-2 focus:ring-blue-700"
              style={{ borderColor: colors.border }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border text-gray-800 bg-white rounded-lg focus:ring-2 focus:ring-blue-700"
              style={{ borderColor: colors.border }}
              required
            />
          </div>
          <button
            onClick={handleSetPassword}
            className="w-full bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-800 transition font-semibold"
            style={{ backgroundColor: colors.primary, ':hover': { backgroundColor: colors.primaryDark } }}
          >
            Set Password
          </button>
        </div>
        <p className="text-sm text-center mt-6 text-gray-600">
          Return to{' '}
          <Link to="/login" className="text-blue-700 hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SetPassword;