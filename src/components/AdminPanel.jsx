import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { colors as defaultColors } from '../constants/colors';

const AdminPanel = ({ colors = defaultColors }) => {
  const [users, setUsers] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setError(''); // Clear previous errors

    // Monitor authentication state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.warn('User is not authenticated. Redirecting to login.');
        window.location.href = '/login';
      }
    });

    // Real-time listener for users (only admins)
    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        try {
          const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => user.role === 'admin');
          setUsers(userList);
        } catch (err) {
          console.error('Error in users listener:', err);
          setError(`Failed to fetch users: ${err.message}`);
        }
      },
      (err) => {
        console.error('Firestore users listener error:', err);
        setError(`Failed to fetch users: ${err.message}`);
      }
    );

    // Real-time listener for approvals (only admin-related)
    const unsubscribeApprovals = onSnapshot(
      collection(db, 'approvals'),
      (snapshot) => {
        try {
          const approvalList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(approval => approval.type === 'add_admin');
          setApprovals(approvalList);
        } catch (err) {
          console.error('Error in approvals listener:', err);
          setError(`Failed to fetch approvals: ${err.message}`);
        }
      },
      (err) => {
        console.error('Firestore approvals listener error:', err);
        setError(`Failed to fetch approvals: ${err.message}`);
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeUsers();
      unsubscribeApprovals();
    };
  }, []);

  const addAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password) {
      setError('Email and password are required.');
      return;
    }

    const userExists = users.some(u => u.email === newAdmin.email);
    if (userExists) {
      setError('User already exists.');
      return;
    }

    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, newAdmin.email, newAdmin.password);
      const user = userCredential.user;

      // Store user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: newAdmin.email,
        role: 'admin',
        approved: false,
      });

      setMessage('Admin added successfully.');
      setNewAdmin({ email: '', password: '' });
    } catch (err) {
      console.error('Error adding admin:', err);
      setError(`Failed to add admin: ${err.message}`);
    }
  };

  const approveUser = async (id) => {
    try {
      await updateDoc(doc(db, 'users', id), { approved: true });
      await setDoc(
        doc(db, 'admins', id),
        {
          currentPatientRecord: null,
          lastUpdated: new Date(),
        },
        { merge: true }
      );
      setMessage('Admin approved successfully.');
    } catch (err) {
      console.error('Error approving admin:', err);
      setError(`Failed to approve admin: ${err.message}`);
    }
  };

  const rejectUser = async (id) => {
    try {
      await deleteDoc(doc(db, 'users', id));
      setMessage('Admin request rejected successfully.');
    } catch (err) {
      console.error('Error rejecting admin:', err);
      setError(`Failed to reject admin: ${err.message}`);
    }
  };

  const removeUser = async (id) => {
    if (window.confirm('Are you sure you want to remove this admin?')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        await deleteDoc(doc(db, 'admins', id));
        setMessage('Admin removed successfully.');
      } catch (err) {
        console.error('Error removing admin:', err);
        setError(`Failed to remove admin: ${err.message}`);
      }
    }
  };

  // Filter users to show only admins (pending and approved)
  const manageableUsers = users.filter(u => u.role === 'admin');
  // Filter approvals to show only pending admin requests
  const pendingApprovals = approvals.filter(a => a.status === 'pending' && a.type === 'add_admin');

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8 py-12" style={{ backgroundColor: colors.background }}>
      <h2 className="text-4xl font-bold mb-8 tracking-tight" style={{ color: colors.text }}>
        Admin Panel
      </h2>

      {/* Add Admin */}
      <div className="mb-8 p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <h3 className="text-2xl font-semibold mb-6 tracking-tight" style={{ color: colors.text }}>
          Add Admin
        </h3>
        {message && <p className="text-green-600 text-sm mb-4">{message}</p>}
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: colors.text }}>New Admin Email</label>
            <input
              type="email"
              placeholder="Enter admin email"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              className="w-full px-4 py-2 border text-gray-800 bg-white rounded-lg focus:ring-2 focus:ring-blue-700"
              style={{ borderColor: colors.border }}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: colors.text }}>Temporary Password</label>
            <input
              type="password"
              placeholder="Enter temporary password"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              className="w-full px-4 py-2 border text-gray-800 bg-white rounded-lg focus:ring-2 focus:ring-blue-700"
              style={{ borderColor: colors.border }}
              autoComplete="new-password"
            />
          </div>
        </div>
        <button
          onClick={addAdmin}
          className="mt-6 w-full bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-800 transition font-semibold"
          style={{ backgroundColor: colors.primary }}
        >
          Add Admin
        </button>
      </div>

      {/* Admin Management */}
      <div className="p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <h3 className="text-2xl font-semibold mb-6 tracking-tight" style={{ color: colors.text }}>
          Manage Admins
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: colors.background }}>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.lightText }}>Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.lightText }}>Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.lightText }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: colors.border }}>
              {manageableUsers.map((user, index) => (
                <tr key={index} className="transition-all duration-200 hover:bg-opacity-80" style={{ backgroundColor: colors.card }}>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: colors.text }}>{user.email}</td>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: user.approved ? colors.success : colors.danger }}>
                    {user.approved ? 'Approved' : 'Pending'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {!user.approved && (
                      <button
                        onClick={() => approveUser(user.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded mr-2 hover:bg-green-700 transition"
                        style={{ backgroundColor: colors.success }}
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => removeUser(user.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                      style={{ backgroundColor: colors.danger }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="mt-8 p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <h3 className="text-2xl font-semibold mb-6 tracking-tight" style={{ color: colors.text }}>
          Pending Admin Approvals
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: colors.background }}>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.lightText }}>User Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.lightText }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: colors.border }}>
              {pendingApprovals.map((approval, index) => {
                const user = users.find(u => u.id === approval.targetUserId);
                return (
                  <tr key={index} className="transition-all duration-200 hover:bg-opacity-80" style={{ backgroundColor: colors.card }}>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: colors.text }}>
                      {user ? user.email : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => approveUser(approval.targetUserId)}
                        className="bg-green-600 text-white px-4 py-2 rounded mr-2 hover:bg-green-700 transition"
                        style={{ backgroundColor: colors.success }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectUser(approval.targetUserId)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                        style={{ backgroundColor: colors.danger }}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;