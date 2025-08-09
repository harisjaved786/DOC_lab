import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'; // Import signOut
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { colors as defaultColors } from '../constants/colors';

const Signup = ({ colors = defaultColors }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user data in Firestore with admin role
      await setDoc(doc(db, 'users', user.uid), {
        email,
        role: 'admin',
        approved: false,
      });

      // Sign out the user immediately after signup
      await signOut(auth);

      alert('Your account has been created and is pending approval by the Super Admin.');
      navigate('/login');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. It must be at least 6 characters.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e6ffe6] to-[#ccf5cc]">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-4xl font-bold mb-6 text-center text-green-800">Create Admin Account</h2>
        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border text-gray-800 bg-white rounded-lg focus:ring-2 focus:ring-green-700"
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
              className="w-full px-4 py-2 border text-gray-800 bg-white rounded-lg focus:ring-2 focus:ring-green-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ borderColor: colors.border }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Confirm Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border text-gray-800 bg-white rounded-lg focus:ring-2 focus:ring-green-700"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ borderColor: colors.border }}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 transition font-semibold"
            style={{ backgroundColor: colors.primary, ':hover': { backgroundColor: colors.primaryDark } }}
          >
            Create Admin Account
          </button>
        </form>
        <p className="text-sm text-center mt-6 text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-green-700 hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;