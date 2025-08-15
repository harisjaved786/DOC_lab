import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Changed from HashRouter
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DoctorList from './components/DoctorList';
import PatientRecords from './components/PatientRecord';
import DoctorAnalytics from './components/DoctorAnalytics';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SetPassword from './pages/SetPassword';
import ForgotPassword from './pages/ForgotPassword';
import AdminPanel from './components/AdminPanel';
import './datepicker.css';
import { colors } from './constants/colors';

function App() {
  const [doctors, setDoctors] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [doctorsListener, setDoctorsListener] = useState(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  useEffect(() => {
    let unsubscribeAuth = () => {};
    let unsubscribeDoctors = () => {};

    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            setError('');
            setIsPendingApproval(false);
            
            if (data.role === 'admin' && !data.approved) {
              setIsPendingApproval(true);
              setIsAuthenticated(false);
              setUserData(null);
            } else if (data.role === 'admin' && data.approved) {
              setIsAuthenticated(true);
              setUserData(prev => {
                const newData = { uid: user.uid, ...data };
                if (JSON.stringify(prev) === JSON.stringify(newData)) {
                  return prev;
                }
                return newData;
              });
            } else if (data.role === 'superadmin') {
              setIsAuthenticated(true);
              setUserData(prev => {
                const newData = { uid: user.uid, ...data };
                if (JSON.stringify(prev) === JSON.stringify(newData)) {
                  return prev;
                }
                return newData;
              });
            } else {
              setError('Unauthorized access. Please contact administrator.');
              setIsAuthenticated(false);
              setUserData(null);
            }
          } else {
            setError('User data not found in Firestore.');
            setIsAuthenticated(false);
            setUserData(null);
            setIsPendingApproval(false);
          }
        } else {
          setIsAuthenticated(false);
          setUserData(null);
          setError('');
          setIsPendingApproval(false);
        }
      } catch (err) {
        setError('Failed to fetch user authentication data. Please try again.');
        setIsAuthenticated(false);
        setUserData(null);
        setIsPendingApproval(false);
      } finally {
        setLoading(false);
      }
    });

    if (isAuthenticated && !doctorsListener) {
      unsubscribeDoctors = onSnapshot(
        collection(db, 'doctors'),
        (snapshot) => {
          const doctorList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setDoctors(prev => {
            const newData = doctorList;
            if (JSON.stringify(prev) === JSON.stringify(newData)) {
              return prev;
            }
            return newData;
          });
        },
        (err) => {
          setError('Failed to fetch doctors data. Please check your connection or Firestore rules.');
        }
      );
      setDoctorsListener(() => unsubscribeDoctors);
    }

    return () => {
      unsubscribeAuth();
      if (doctorsListener) {
        doctorsListener();
        setDoctorsListener(null);
      }
    };
  }, [isAuthenticated, doctorsListener]);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUserData(userData);
  };

  const handleLogout = () => {
    auth.signOut();
    setIsAuthenticated(false);
    setUserData(null);
    setError('');
    setIsPendingApproval(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (isPendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center p-8 rounded-lg shadow-lg" style={{ backgroundColor: colors.card }}>
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: colors.text }}>
            Account Pending Approval
          </h2>
          <p className="text-lg mb-6" style={{ color: colors.lightText }}>
            Your account is pending approval from the Super Admin.
          </p>
          <p className="text-sm" style={{ color: colors.lightText }}>
            Please wait for approval to access the system.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 px-6 py-2 rounded-lg text-white transition duration-200"
            style={{ backgroundColor: colors.primary }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen">
        {error && <p className="text-red-600 text-center p-4">{error}</p>}
        {!isAuthenticated ? (
          <Routes>
            <Route path="/signup" element={<Signup colors={colors} />} />
            <Route path="/login" element={<Login setIsAuthenticated={handleLogin} colors={colors} />} />
            <Route path="/set-password/:token" element={<SetPassword colors={colors} />} />
            <Route path="/forgot-password" element={<ForgotPassword colors={colors} />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        ) : (
          <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              ></div>
            )}
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} userData={userData} />
            <div className="flex-1 flex flex-col">
              <Header setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />
              <main
                className="flex-1 overflow-y-auto p-4 md:p-6 w-full"
                style={{ backgroundColor: colors.background }}
              >
                <Routes>
                  <Route path="/" element={<DoctorList doctors={doctors} setDoctors={setDoctors} colors={colors} userData={userData} />} />
                  <Route path="/doctor/:id" element={<PatientRecords doctors={doctors} colors={colors} />} />
                  <Route path="/analytics" element={<DoctorAnalytics doctors={doctors} colors={colors} />} />
                  <Route
                    path="/admin-panel"
                    element={userData?.role === 'superadmin' ? <AdminPanel colors={colors} /> : <Navigate to="/" />}
                  />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
