// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { colors as defaultColors } from '../constants/colors';

const Login = ({ setIsAuthenticated, colors = defaultColors }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setError('User data not found.');
        return;
      }

      const userData = userDoc.data();
      if (userData.role === 'admin' && !userData.approved) {
        setError('Your account is pending approval from the Super Admin.');
        return;
      }

      setIsAuthenticated(userData);
      navigate('/');
    } catch (error) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setError('Invalid email or password.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError('Failed to log in. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e0f2ff] to-[#d0ebff]">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-4xl font-bold mb-6 text-center text-blue-900">Login to Your Account</h2>
        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border text-gray-800 bg-white rounded-lg focus:ring-2 focus:ring-blue-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ borderColor: colors.border }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border text-gray-800 bg-white rounded-lg focus:ring-2 focus:ring-blue-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ borderColor: colors.border }}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-800 transition font-semibold"
            style={{ backgroundColor: colors.primary, ':hover': { backgroundColor: colors.primaryDark } }}
          >
            Login
          </button>
        </form>
        <p className="text-sm text-center mt-6 text-gray-600">
          <Link to="/forgot-password" className="text-blue-700 hover:underline font-medium">
            Forgot Password?
          </Link>
        </p>
        <p className="text-sm text-center mt-2 text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-700 hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;