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

  // Inline styles for cross-browser compatibility
  const logoutButtonStyle = {
    backgroundColor: '#dc2626', // red-600
    color: '#ffffff',
    padding: '4px 12px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    outline: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none'
  };

  const logoutButtonHoverStyle = {
    backgroundColor: '#b91c1c' // red-700
  };

  const [isHovered, setIsHovered] = useState(false);

  return (
    <header 
      className="p-4 flex items-center justify-between" 
      style={{ backgroundColor: colors.primary, color: colors.text }}
    >
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
          style={{
            ...logoutButtonStyle,
            ...(isHovered ? logoutButtonHoverStyle : {})
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
        >
          Logout
        </button>
      )}
    </header>
  );
};

export default Header;
