import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { colors } from '../constants/colors';

const datePickerConfig = {
  dateFormat: 'yyyy-MM-dd',
  showMonthDropdown: true,
  showYearDropdown: true,
  dropdownMode: 'select',
  minDate: new Date(2020, 0, 1),
  maxDate: new Date(),
  yearDropdownItemNumber: 5,
  popperClassName: 'custom-datepicker z-[1000] bg-white shadow-lg rounded-lg border border-gray-200',
};

const CustomDateInput = React.forwardRef(({ value, onClick, onChange, disabled, placeholder, portalId }, ref) => (
  <div className="relative">
    <input
      type="text"
      value={value}
      onChange={onChange}
      onClick={onClick}
      ref={ref}
      disabled={disabled}
      placeholder={placeholder}
      className="border p-1.5 sm:p-2 rounded w-full focus:ring-2 focus:outline-none text-xs sm:text-sm pr-10"
      style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
      readOnly
    />
    <span
      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm cursor-pointer transition duration-200 hover:scale-110"
      style={{ color: disabled ? colors.lightText : colors.primary }}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
      </svg>
    </span>
  </div>
));

const PatientRecords = ({ doctors }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const doctor = doctors.find(d => d.id === id);
  const currentUser = auth.currentUser;

  const [records, setRecords] = useState([]);
  const [newRecord, setNewRecord] = useState({
    name: '',
    age: '',
    test: '',
    total: '',
    discount: '',
    received: '',
    doctorShare: '',
    date: new Date(),
  });
  const [filter, setFilter] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const sortByDate = (arr) => {
    return [...arr].sort((a, b) => new Date(b.date) - new Date(a.date)); // DESC
  };

  useEffect(() => {
    const checkUserRole = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          setIsSuperAdmin(role === 'superadmin');
          setIsAdmin(role === 'admin');
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        alert('Failed to verify user role. Please try again.');
      }
    };
    checkUserRole();
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const recordsQuery = query(
          collection(db, `doctors/${id}/patients`),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(recordsQuery);
        let fetchedRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (isAdmin && !isSuperAdmin) {
          fetchedRecords = fetchedRecords.filter(
            record => record.author_uid === currentUser.uid && record.date === today
          );
        }

        setRecords(sortByDate(fetchedRecords));
      } catch (error) {
        console.error('Error fetching records:', error);
      }
    };
    if (isSuperAdmin || isAdmin) fetchRecords();
  }, [id, isSuperAdmin, isAdmin, currentUser]);

  const saveRecord = async () => {
    if (!newRecord.name.trim()) {
      alert('Patient Name is required.');
      return;
    }

    const totalAmount = Number(newRecord.total || 0);
    const discountAmount = Number(newRecord.discount || 0);
    const receivedAmount = Number(newRecord.received || 0);
    const doctorShareAmount = Number(newRecord.doctorShare || 0);

    if ([totalAmount, discountAmount, receivedAmount, doctorShareAmount].some(isNaN)) {
      alert('Total, Discount, Received, and Doctor Share must be valid numbers.');
      return;
    }

    if (discountAmount > totalAmount) {
      alert("Discount can't be greater than Total amount.");
      return;
    }

    if (receivedAmount > totalAmount) {
      alert("Received amount can't be greater than Total amount.");
      return;
    }

    if (discountAmount + receivedAmount > totalAmount) {
      alert("Sum of Discount and Received can't exceed Total amount.");
      return;
    }

    if (doctorShareAmount > receivedAmount) {
      alert("Doctor Share can't be greater than Received amount.");
      return;
    }

    if (doctorShareAmount < 0) {
      alert("Doctor Share can't be negative.");
      return;
    }

    const recordData = {
      ...newRecord,
      total: totalAmount,
      discount: discountAmount,
      received: receivedAmount,
      doctorShare: doctorShareAmount,
      date: newRecord.date.toISOString().split('T')[0],
      author_uid: currentUser.uid,
      doctor_id: id,
    };

    try {
      if (editingRecord) {
        await updateDoc(doc(db, `doctors/${id}/patients`, editingRecord.id), recordData);
        setRecords(sortByDate(records.map(r => (r.id === editingRecord.id ? { id: editingRecord.id, ...recordData } : r))));
        setEditingRecord(null);
      } else {
        const newRec = await addDoc(collection(db, `doctors/${id}/patients`), recordData);
        setRecords(sortByDate([...records, { id: newRec.id, ...recordData }]));
      }

      setNewRecord({
        name: '',
        age: '',
        test: '',
        total: '',
        discount: '',
        received: '',
        doctorShare: '',
        date: new Date(),
      });
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save record. Please check your permissions or try again.');
    }
  };

  const deleteRecord = async (recordId) => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can delete patient records.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteDoc(doc(db, `doctors/${id}/patients`, recordId));
        setRecords(sortByDate(records.filter(record => record.id !== recordId)));
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete record. Please try again.');
      }
    }
  };

  const filteredRecords = sortByDate(
    isSuperAdmin
      ? records.filter(r => {
          const recordDate = new Date(r.date);
          if (isNaN(recordDate.getTime())) return false;
          const startDate = filter.start ? new Date(filter.start).setHours(0, 0, 0, 0) : null;
          const endDate = filter.end ? new Date(filter.end).setHours(23, 59, 59, 999) : null;
          return (!startDate || recordDate.getTime() >= startDate) && (!endDate || recordDate.getTime() <= endDate);
        })
      : records
  );

  const total = filteredRecords.reduce((acc, r) => acc + Number(r.total || 0), 0);
  const discount = filteredRecords.reduce((acc, r) => acc + Number(r.discount || 0), 0);
  const received = filteredRecords.reduce((acc, r) => acc + Number(r.received || 0), 0);
  const doctorShareTotal = filteredRecords.reduce((acc, r) => acc + Number(r.doctorShare || 0), 0);
  const due = total - discount - received;

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(`Share to Doctor: ${doctor.name}`, pageWidth / 2, 15, { align: 'center' });

    const currentDate = new Date().toLocaleDateString('en-US');
    const dateRangeText = filter.start || filter.end
      ? `From ${filter.start ? new Date(filter.start).toLocaleDateString('en-US') : 'Start'} to ${filter.end ? new Date(filter.end).toLocaleDateString('en-US') : 'End'}`
      : 'All Records';

    autoTable(doc, {
      startY: 25,
      body: [
        [{ content: `Date Range: ${dateRangeText}`, styles: { halign: 'left', fontStyle: 'bold' } }],
        [{ content: `Report Generated: ${currentDate}`, styles: { halign: 'left', fontStyle: 'italic' } }],
      ],
      theme: 'plain',
      styles: { fontSize: 10, textColor: 80 },
      margin: { top: 10, left: 14, right: 14 },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 5,
      head: [['Patient Name', 'Test', 'Doctor Share (PKR)']],
      body: filteredRecords.map(r => [
        r.name,
        r.test,
        Number(r.doctorShare || 0).toFixed(2),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 123, 255], textColor: 255, fontSize: 11 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Doctor Share: PKR ${doctorShareTotal.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`${doctor.name.replace(/\s+/g, '_')}_Doctor_Share_Report.pdf`);
  };

  const exportOverallPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(`Patient Records for ${doctor.name}`, pageWidth / 2, 15, { align: 'center' });

    const currentDate = new Date().toLocaleDateString('en-US');
    const dateRangeText = filter.start || filter.end
      ? `From ${filter.start ? new Date(filter.start).toLocaleDateString('en-US') : 'Start'} to ${filter.end ? new Date(filter.end).toLocaleDateString('en-US') : 'End'}`
      : 'All Records';

    autoTable(doc, {
      startY: 25,
      body: [
        [{ content: `Date Range: ${dateRangeText}`, styles: { halign: 'left', fontStyle: 'bold' } }],
        [{ content: `Report Generated: ${currentDate}`, styles: { halign: 'left', fontStyle: 'italic' } }],
      ],
      theme: 'plain',
      styles: { fontSize: 10, textColor: 80 },
      margin: { top: 10, left: 14, right: 14 },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 5,
      head: [['Patient Name', 'Age', 'Test', 'Total (PKR)', 'Received (PKR)', 'Discount (PKR)', 'Doctor Share (PKR)', 'Date']],
      body: filteredRecords.map(r => [
        r.name,
        r.age,
        r.test,
        Number(r.total || 0).toFixed(2),
        Number(r.received || 0).toFixed(2),
        Number(r.discount || 0).toFixed(2),
        Number(r.doctorShare || 0).toFixed(2),
        new Date(r.date).toLocaleDateString('en-US'),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 123, 255], textColor: 255, fontSize: 11 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    let y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Summary', 14, y);
    y += 8;
    doc.text(`Total Amount: PKR ${total.toFixed(2)}`, 14, y);
    doc.text(`Total Discount: PKR ${discount.toFixed(2)}`, 80, y);
    y += 7;
    doc.text(`Total Received: PKR ${received.toFixed(2)}`, 14, y);
    doc.text(`Total Doctor Share: PKR ${doctorShareTotal.toFixed(2)}`, 80, y);
    doc.save(`${doctor.name.replace(/\s+/g, '_')}_Overall_Patient_Report.pdf`);
  };


  // Render input field with consistent styling
  const renderInputField = (field, label, type = 'text', placeholder) => (
    <div className="sm:col-span-1">
      <label className="block text-xs sm:text-sm font-medium mb-1 capitalize" style={{ color: colors.text }}>
        {label}
      </label>
      <input
        type={type}
        className="border p-1.5 sm:p-2 rounded w-full focus:ring-2 focus:outline-none text-xs sm:text-sm"
        style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
        placeholder={placeholder}
        value={newRecord[field]}
        readOnly={field === 'received'}
        onChange={e => {
          const value = e.target.value;
          let updated = { ...newRecord, [field]: value };
          if (field === 'total' || field === 'discount') {
            const total = Number(field === 'total' ? value : updated.total || 0);
            const discount = Number(field === 'discount' ? value : updated.discount || 0);
            if (!isNaN(total) && !isNaN(discount)) {
              updated.received = Math.max(0, total - discount);
            }
          }
          setNewRecord(updated);
        }}
      />
    </div>
  );

  // Render DatePicker with unique portal ID
  const renderDatePicker = (selected, onChange, label, disabled = false, portalId) => (
    <div className="sm:col-span-1">
      <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: colors.text }}>{label}</label>
      <DatePicker
        selected={selected}
        onChange={onChange}
        customInput={<CustomDateInput portalId={portalId} />}
        placeholderText={`Select ${label.toLowerCase()}`}
        disabled={disabled}
        aria-label={`Select ${label.toLowerCase()}`}
        wrapperClassName="w-full"
        {...datePickerConfig}
        portalId={portalId} // Assign unique portal ID
      />
    </div>
  );

  if (!doctor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center p-4" style={{ backgroundColor: colors.background, color: colors.text }}>
        <h2 className="text-2xl font-bold mb-4">Doctor Not Found</h2>
        <p className="text-lg mb-6">The doctor you are looking for does not exist.</p>
        <button
          onClick={() => navigate('/')}
          className="text-white px-6 py-3 rounded-lg flex items-center justify-center transition duration-200 w-full max-w-xs"
          style={{ backgroundColor: colors.primary }}
        >
          Go back to Doctor List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-2 sm:px-3 md:px-4 lg:px-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4 py-3">
        <div className="w-full sm:w-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center mb-2 font-medium py-2 px-3 rounded-md transition duration-200 w-full sm:w-auto justify-center"
            style={{ backgroundColor: colors.primary, color: '#fff', border: `1px solid ${colors.primary}` }}
          >
            <span className="mr-2">←</span> Back to Doctors
          </button>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: colors.text }}>
            Patients of {doctor.name}
          </h2>
          <p className="text-xs sm:text-sm" style={{ color: colors.lightText }}>{doctor.specialty}</p>
        </div>
        {isSuperAdmin && (
          <div className="w-full sm:w-auto mt-2 sm:mt-0 flex flex-col sm:flex-row gap-2">
            <button
              onClick={exportPDF}
              className="flex items-center justify-center font-medium py-2 px-3 rounded-md transition duration-200 w-full sm:w-auto"
              style={{ backgroundColor: colors.secondary, color: '#fff', border: `1px solid ${colors.secondary}` }}
            >
              <span className="mr-2">📄</span> Export to PDF
            </button>
            <button
              onClick={exportOverallPDF}
              className="flex items-center justify-center font-medium py-2 px-3 rounded-md transition duration-200 w-full sm:w-auto"
              style={{ backgroundColor: colors.secondary, color: '#fff', border: `1px solid ${colors.secondary}` }}
            >
              <span className="mr-2">📊</span> Overall Record PDF
            </button>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Patient Form */}
        <div className="lg:col-span-2">
          <div className="rounded-xl shadow-md p-3 sm:p-4 h-full" style={{ backgroundColor: colors.card }}>
            <h3 className="text-base sm:text-lg font-medium mb-3" style={{ color: colors.text }}>
              {editingRecord ? 'Edit Patient Record' : 'Add New Patient Record'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {renderInputField('name', 'Patient Name', 'text', 'Enter name')}
              {renderInputField('age', 'Age', 'number', 'e.g. 45')}
              {renderInputField('test', 'Test', 'text', 'Enter test')}
              {renderInputField('total', 'Total', 'number', 'Enter total')}
              {renderInputField('discount', 'Discount', 'number', 'Enter discount')}
              {renderInputField('received', 'Received', 'number', 'Enter received')}
              {renderInputField('doctorShare', 'Doctor Share', 'number', 'e.g. 500')}
              {renderDatePicker(
                newRecord.date,
                date => setNewRecord({ ...newRecord, date }),
                'Date',
                false,
                'date-picker-portal-new-record'
              )}
              <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:col-span-2 md:col-span-3">
                {(isSuperAdmin || isAdmin) && (
                  <button
                    onClick={saveRecord}
                    className="text-white px-3 py-1.5 sm:py-2 rounded flex items-center justify-center transition duration-200 hover:opacity-90 text-xs sm:text-sm"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <span className="mr-1 sm:mr-2">+</span> {editingRecord ? 'Update Record' : 'Add Record'}
                  </button>
                )}
                {editingRecord && (
                  <button
                    onClick={cancelEditingRecord}
                    className="px-3 py-1.5 sm:py-2 rounded flex items-center justify-center transition duration-200 text-xs sm:text-sm"
                    style={{ backgroundColor: colors.background, color: colors.text }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-xl shadow-md p-3 sm:p-4 h-fit" style={{ backgroundColor: colors.card }}>
          <h3 className="text-base sm:text-lg font-medium mb-3" style={{ color: colors.text }}>Financial Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between pb-1 border-b" style={{ borderColor: colors.border }}>
              <span className="text-xs sm:text-sm" style={{ color: colors.lightText }}>Total Amount:</span>
              <span className="font-medium text-xs sm:text-sm" style={{ color: colors.text }}>PKR {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pb-1 border-b" style={{ borderColor: colors.border }}>
              <span className="text-xs sm:text-sm" style={{ color: colors.lightText }}>Total Discount:</span>
              <span className="font-medium text-xs sm:text-sm" style={{ color: colors.danger }}>-PKR {discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pb-1 border-b" style={{ borderColor: colors.border }}>
              <span className="text-xs sm:text-sm" style={{ color: colors.lightText }}>Amount Received:</span>
              <span className="font-medium text-xs sm:text-sm" style={{ color: colors.success }}>PKR {received.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pb-1 border-b" style={{ borderColor: colors.border }}>
              <span className="text-xs sm:text-sm" style={{ color: colors.lightText }}>Total Doctor Share:</span>
              <span className="font-medium text-xs sm:text-sm" style={{ color: colors.text }}>PKR {doctorShareTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-medium text-xs sm:text-sm" style={{ color: colors.text }}>Amount Due:</span>
              <span className={`font-bold text-xs sm:text-sm ${due > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                PKR {Math.abs(due).toFixed(2)} {due > 0 ? '(Due)' : '(Overpaid)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-xl shadow-md mb-6" style={{ backgroundColor: colors.card }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end p-2 sm:p-3">
          {renderDatePicker(
            filter.start,
            date => setFilter({ ...filter, start: date }),
            'From Date',
            !isSuperAdmin,
            'date-picker-portal-from-date'
          )}
          {renderDatePicker(
            filter.end,
            date => setFilter({ ...filter, end: date }),
            'To Date',
            !isSuperAdmin,
            'date-picker-portal-to-date'
          )}
          <button
            onClick={() => setFilter({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) })}
            className="text-white px-3 py-1.5 sm:py-2 rounded w-full text-xs sm:text-sm disabled:opacity-50"
            style={{ backgroundColor: colors.danger }}
            disabled={!isSuperAdmin}
          >
            Reset to Current Month
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] sm:min-w-0">
            <thead>
              <tr style={{ backgroundColor: colors.background }}>
                {['Patient', 'Age', 'Test', 'Total', 'Discount', 'Received', 'Doctor Share', 'Date', 'Actions'].map(header => (
                  <th key={header} className="px-2 py-1.5 sm:px-3 sm:py-2 text-left text-xs font-medium uppercase" style={{ color: colors.lightText }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ color: colors.text, borderColor: colors.border }}>
              {filteredRecords.map(r => (
                <tr key={r.id} className="hover:bg-gray-50" style={{ backgroundColor: colors.card }}>
                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-[120px]">{r.name}</div>
                  </td>
                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm">{r.age}</td>
                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{r.test}</td>
                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm font-medium">PKR {Number(r.total).toFixed(2)}</td>
                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm" style={{ color: colors.danger }}>
                    PKR {Number(r.discount).toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm" style={{ color: colors.success }}>
                    PKR {Number(r.received).toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm">PKR {Number(r.doctorShare || 0).toFixed(2)}</td>
                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm">
                    {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm">
                    <div className="flex gap-1 sm:gap-2">
                      {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        const isLatestRecord = records[0]?.id === r.id;
                        const isOwnRecord = r.author_uid === currentUser.uid;
                        const isToday = r.date === today;
                        
                        // Show edit button if:
                        // 1. User is superadmin, OR
                        // 2. User is admin AND it's their own record AND it's from today AND it's the latest record
                        const canEdit = isSuperAdmin || (isAdmin && isOwnRecord && isToday && isLatestRecord);
                        
                        return (
                          <>
                            {canEdit && (
                              <button
                                onClick={() => startEditingRecord(r)}
                                className="p-0.5 sm:p-1 rounded"
                                style={{ backgroundColor: colors.background, color: colors.warning }}
                                title="Edit"
                              >
                                ✏️
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                onClick={() => deleteRecord(r.id)}
                                className="p-0.5 sm:p-1 rounded"
                                style={{ backgroundColor: colors.background, color: colors.danger }}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-6 sm:py-8">
            <div className="mx-auto rounded-full p-2 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mb-2 sm:mb-3" style={{ backgroundColor: colors.background }}>
              <span className="text-lg sm:text-xl">👥</span>
            </div>
            <h3 className="text-sm sm:text-base font-medium mb-1" style={{ color: colors.text }}>
              {isSuperAdmin ? 'No patient records found' : 'No record available'}
            </h3>
            <p className="text-xs" style={{ color: colors.lightText }}>
              {isSuperAdmin ? 'Try adjusting your filters or add a new record' : 'Enter a new record to view it'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientRecords;