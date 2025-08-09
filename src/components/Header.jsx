import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { colors as defaultColors } from '../constants/colors';

const Header = ({ colors = defaultColors, setSidebarOpen }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setError('Please log in to access this section.');
        window.location.href = '/login';
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <header className="p-4 flex items-center justify-between" style={{ backgroundColor: colors.primary, color: colors.text }}>
      <div className="flex items-center">
        <button
          className="lg:hidden mr-4 text-white"
          onClick={() => setSidebarOpen(true)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {user && (
        <button
          onClick={() => auth.signOut()}
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
        >
          Logout
        </button>
      )}
    </header>
  );
};

export default Header;