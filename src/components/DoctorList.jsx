import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import DoctorCard from './DoctorCard';
import { colors } from '../constants/colors';

const DoctorList = ({ doctors, setDoctors, colors, userData }) => {
  const navigate = useNavigate();
  const [newDoctor, setNewDoctor] = useState({ name: '', specialty: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDoctor, setEditingDoctor] = useState(null);
  const isSuperAdmin = userData?.role === 'superadmin' && userData?.approved === true;

 

  const deleteDoctor = async (id) => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can delete doctors.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await deleteDoc(doc(db, 'doctors', id));
        const recordsSnapshot = await getDocs(collection(db, `doctors/${id}/patients`));
        recordsSnapshot.forEach(async (recordDoc) => {
          await deleteDoc(doc(db, `doctors/${id}/patients`, recordDoc.id));
        });
        setDoctors(doctors.filter(doctor => doctor.id !== id));
      } catch (error) {
        console.error('Error deleting doctor:', error);
        alert('Failed to delete doctor. Check Firestore permissions.');
      }
    }
  };

  const startEditing = (doctor) => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can edit doctors.');
      return;
    }
    setEditingDoctor(doctor);
    setNewDoctor({
      name: doctor.name,
      specialty: doctor.specialty,
    });
  };

  const cancelEditing = () => {
    setEditingDoctor(null);
    setNewDoctor({ name: '', specialty: '' });
  };

  const saveDoctor = async () => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can add or update doctors.');
      return;
    }
    if (!newDoctor.name.trim() || !newDoctor.specialty.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      if (editingDoctor) {
        await updateDoc(doc(db, 'doctors', editingDoctor.id), {
          name: newDoctor.name,
          specialty: newDoctor.specialty,
        });
        setDoctors(doctors.map(doctor =>
          doctor.id === editingDoctor.id ? { ...doctor, ...newDoctor } : doctor
        ));
        setEditingDoctor(null);
      } else {
        const docRef = await addDoc(collection(db, 'doctors'), {
          name: newDoctor.name,
          specialty: newDoctor.specialty,
          image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
        });
        setDoctors([...doctors, { id: docRef.id, ...newDoctor, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80' }]);
      }
      setNewDoctor({ name: '', specialty: '' });
    } catch (error) {
      console.error('Error saving doctor:', error);
      alert('Failed to save doctor. Check Firestore permissions.');
    }
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!auth.currentUser) {
    navigate('/login');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8 py-12" style={{ backgroundColor: colors.background }}>
      <h2 className="text-4xl font-bold mb-8 tracking-tight" style={{ color: colors.text }}>
        Doctors
      </h2>

      {/* Add/Edit Doctor Form */}
      {isSuperAdmin && (
        <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h3 className="text-2xl font-semibold mb-4" style={{ color: colors.text }}>
            {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Name
              </label>
              <input
                type="text"
                value={newDoctor.name}
                onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                placeholder="Enter doctor name"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Specialty
              </label>
              <input
                type="text"
                value={newDoctor.specialty}
                onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                placeholder="Enter specialty"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveDoctor}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: colors.primary }}
            >
              {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
            </button>
            {editingDoctor && (
              <button
                onClick={cancelEditing}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: colors.background, color: colors.text, border: `1px solid ${colors.border}` }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg text-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
          placeholder="Search doctors by name or specialty"
          autoComplete="off"
        />
      </div>

      {/* Doctor List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map(doctor => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              colors={colors}
              onEdit={isSuperAdmin ? startEditing : null}
              onDelete={isSuperAdmin ? deleteDoctor : null}
            />
          ))
        ) : (
          <p className="text-center text-sm" style={{ color: colors.lightText }}>
            No doctors found.
          </p>
        )}
      </div>
    </div>
  );
};

export default DoctorList;