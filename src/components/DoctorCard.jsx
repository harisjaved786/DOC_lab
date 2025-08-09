import React from 'react';
import { useNavigate } from 'react-router-dom';

const DoctorCard = ({ doctor, colors, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const fallbackImage = 'https://placehold.co/200x200/cccccc/333333?text=Doc';


  if (onDelete) {
    console.log('Rendering delete button for doctor:', doctor.id);
  }

  return (
    <div 
      className="rounded-xl shadow-md overflow-hidden transition-transform duration-200 hover:shadow-lg hover:-translate-y-1"
      style={{ backgroundColor: colors.card }}
    >
      <div className="p-5">
        <div className="flex items-start">
          <img 
            src={doctor.image || fallbackImage} 
            alt={doctor.name} 
            className="rounded-xl w-16 h-16 object-cover" 
            onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage; }} 
          />
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>{doctor.name}</h3>
            <p className="font-medium" style={{ color: colors.primary }}>{doctor.specialty}</p>
          </div>
        </div>
        
        <div className="flex space-x-4 mt-4">
          <button 
            onClick={() => navigate(`/doctor/${doctor.id}`)} 
            className="font-medium py-2 rounded-lg flex-1 flex items-center justify-center transition duration-200"
            style={{ backgroundColor: colors.background, color: colors.primary }}
          >
            View Patients <span className="ml-2">→</span>
          </button>
          
          {onEdit && (
            <button 
              onClick={() => onEdit(doctor)}
              className="font-medium py-2 px-4 rounded-lg flex items-center justify-center transition duration-200"
              style={{ backgroundColor: colors.background, color: colors.warning }}
              title="Edit Doctor"
            >
              ✏️
            </button>
          )}
          
          {onDelete && (
            <button 
              onClick={() => onDelete(doctor.id)}
              className="font-medium py-2 px-4 rounded-lg flex items-center justify-center transition duration-200"
              style={{  backgroundColor: colors.background, color: 'white' }}
              title="Delete Doctor"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;