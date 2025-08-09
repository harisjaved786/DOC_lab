import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../datepicker.css';
import { colors as defaultColors } from '../constants/colors';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DoctorAnalytics = ({ doctors, colors = defaultColors }) => {
  const navigate = useNavigate();
  const [doctorStats, setDoctorStats] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'doctorName', direction: 'asc' });
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check if user is superadmin
  useEffect(() => {
    const checkUserRole = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().role === 'superadmin' && userDoc.data().approved === true) {
        setIsSuperAdmin(true);
      } else {
        navigate('/login');
      }
    };
    checkUserRole();
  }, [navigate]);

  // Fetch and compute doctor statistics
  useEffect(() => {
    const fetchStats = async () => {
      const stats = await Promise.all(doctors.map(async (doctor) => {
        const recordsQuery = query(
          collection(db, `doctors/${doctor.id}/patients`), // Updated path
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(recordsQuery);
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filteredRecords = records
          .filter(r => {
            const recordDate = new Date(r.date);
            recordDate.setHours(0, 0, 0, 0);
            const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
            const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
            const validStart = start ? recordDate >= start : true;
            const validEnd = end ? recordDate <= end : true;
            return validStart && validEnd && !isNaN(recordDate.getTime());
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        const monthlyCounts = {};
        filteredRecords.forEach(r => {
          const date = new Date(r.date);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
        });

        const totalBusiness = filteredRecords.reduce((sum, r) => sum + Number(r.total || 0), 0);
        const totalDoctorShare = filteredRecords.reduce((sum, r) => sum + Number(r.doctorShare || 0), 0);

        return {
          doctorId: doctor.id,
          doctorName: doctor.name,
          monthlyCounts,
          totalPatients: filteredRecords.length,
          totalBusiness,
          totalDoctorShare
        };
      }));
      setDoctorStats(stats);
    };
    if (isSuperAdmin) {
      fetchStats();
    }
  }, [doctors, startDate, endDate, isSuperAdmin]);

  // Sort doctor stats for table
  const sortedDoctorStats = [...doctorStats].sort((a, b) => {
    const key = sortConfig.key;
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    if (key === 'doctorName') return direction * a[key].localeCompare(b[key]);
    return direction * (a[key] - b[key]);
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const allMonths = Array.from(
    new Set(doctorStats.flatMap(d => Object.keys(d.monthlyCounts)))
  ).sort();

  const chartColors = [
    `linear-gradient(90deg, ${colors.primary} 0%, ${colors.primaryDark || '#0d47a1'} 100%)`,
    colors.success,
    colors.warning,
    colors.danger,
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f43f5e'
  ];

  const selectedDoctor = selectedDoctorId
    ? doctorStats.find(d => d.doctorId === selectedDoctorId) // Removed parseInt
    : null;

  const chartData = {
    labels: allMonths,
    datasets: selectedDoctor
      ? [{
          label: selectedDoctor.doctorName,
          data: allMonths.map(month => selectedDoctor.monthlyCounts[month] || 0),
          backgroundColor: chartColors[0],
          borderRadius: 8,
          barThickness: 24,
          hoverBackgroundColor: colors.primaryDark || '#0d47a1'
        }]
      : doctorStats.map((doc, index) => ({
          label: doc.doctorName,
          data: allMonths.map(month => doc.monthlyCounts[month] || 0),
          backgroundColor: chartColors[index % chartColors.length],
          borderRadius: 8,
          barThickness: 24,
          hoverBackgroundColor: chartColors[index % chartColors.length]
        }))
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 16, family: 'Inter, sans-serif', weight: '500' },
          color: colors.text,
          padding: 20
        }
      },
      title: {
        display: true,
        text: selectedDoctor ? `Monthly Patient Referrals for ${selectedDoctor.doctorName}` : 'Monthly Patient Referrals by Doctor',
        font: { size: 24, family: 'Inter, sans-serif', weight: '600' },
        color: colors.text,
        padding: { top: 20, bottom: 20 }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return ` ${context.dataset.label}: ${context.raw} patient(s)`;
          }
        },
        backgroundColor: colors.card,
        titleColor: colors.text,
        bodyColor: colors.lightText,
        cornerRadius: 8,
        padding: 12,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }
    },
    scales: {
      x: {
        ticks: { 
          color: colors.lightText, 
          font: { size: 14, family: 'Inter, sans-serif' },
          maxRotation: 45,
          minRotation: 45
        },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { 
          stepSize: 1, 
          color: colors.lightText, 
          font: { size: 14, family: 'Inter, sans-serif' }
        },
        grid: { 
          color: colors.border,
          drawBorder: false
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  const resetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedDoctorId('');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont('Inter', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(colors.text);
    doc.text('Doctor Analytics Report', 14, 20);

    const dateRangeText = startDate || endDate
      ? `From ${startDate ? new Date(startDate).toLocaleDateString('en-US') : 'Start'} to ${endDate ? new Date(endDate).toLocaleDateString('en-US') : 'End'}`
      : 'All Time';
    doc.setFontSize(12);
    doc.setTextColor(colors.lightText);
    doc.text(`Date Range: ${dateRangeText}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 14, 38);

    if (selectedDoctor) {
      autoTable(doc, {
        head: [['Doctor', 'Total Patients', 'Total Business (PKR)', 'Total Doctor Share (PKR)']],
        body: [[
          selectedDoctor.doctorName,
          selectedDoctor.totalPatients,
          selectedDoctor.totalBusiness.toFixed(2),
          selectedDoctor.totalDoctorShare.toFixed(2)
        ]],
        startY: 46,
        theme: 'grid',
        headStyles: {
          fillColor: colors.primary,
          textColor: '#ffffff',
          fontSize: 12,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          textColor: colors.text,
          cellPadding: 4
        }
      });
    }

    autoTable(doc, {
      head: [['Doctor', 'Total Patients', 'Total Business (PKR)', 'Total Doctor Share (PKR)']],
      body: sortedDoctorStats.map(doc => [
        doc.doctorName,
        doc.totalPatients,
        doc.totalBusiness.toFixed(2),
        doc.totalDoctorShare.toFixed(2)
      ]),
      startY: selectedDoctor ? doc.lastAutoTable.finalY + 10 : 46,
      theme: 'grid',
      headStyles: {
        fillColor: colors.primary,
        textColor: '#ffffff',
        fontSize: 12,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        textColor: colors.text,
        cellPadding: 4
      }
    });

    doc.save('doctor_analytics.pdf');
  };

  if (!isSuperAdmin) {
    return null; // Navigation handled in useEffect
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12" style={{ backgroundColor: colors.background }}>
      <h2 className="text-4xl font-bold mb-8 tracking-tight" style={{ color: colors.text }}>
        📊 Doctor Analytics Dashboard
      </h2>

      {/* Filter Controls */}
      <div className="mb-8 p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>Select Doctor</label>
            <select
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value)}
              className="border rounded-lg px-4 py-2.5 w-full text-sm focus:ring-2 focus:ring-opacity-50 transition duration-200"
              style={{ 
                backgroundColor: colors.card, 
                borderColor: colors.border, 
                color: colors.text,
                focusRingColor: colors.primary
              }}
            >
              <option value="">All Doctors</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>From Date</label>
            <div className="relative">
              <DatePicker
                selected={startDate}
                onChange={date => setStartDate(date)}
                className="border rounded-lg px-4 py-2.5 w-full text-sm focus:ring-2 focus:ring-opacity-50 transition duration-200 pr-10"
                style={{ 
                  backgroundColor: colors.card, 
                  borderColor: colors.border, 
                  color: colors.text
                }}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select from date"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                minDate={new Date(2020, 0, 1)}
                maxDate={new Date()}
                yearDropdownItemNumber={5}
                ref={startDateRef}
                aria-label="Select from date"
              />
              <span 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm cursor-pointer transition duration-200 hover:scale-110"
                style={{ color: colors.primary }}
                onClick={() => startDateRef.current?.setOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>To Date</label>
            <div className="relative">
              <DatePicker
                selected={endDate}
                onChange={date => {
                  if (date) {
                    date.setHours(23, 59, 59, 999);
                    setEndDate(date);
                  } else {
                    setEndDate(null);
                  }
                }}
                className="border rounded-lg px-4 py-2.5 w-full text-sm focus:ring-2 focus:ring-opacity-50 transition duration-200 pr-10"
                style={{ 
                  backgroundColor: colors.card, 
                  borderColor: colors.border, 
                  color: colors.text
                }}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select to date"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                minDate={new Date(2020, 0, 1)}
                maxDate={new Date()}
                convertMonthDropdown
                yearDropdownItemNumber={5}
                ref={endDateRef}
                aria-label="Select to date"
              />
              <span 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm cursor-pointer transition duration-200 hover:scale-110"
                style={{ color: colors.primary }}
                onClick={() => endDateRef.current?.setOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <button
              onClick={resetFilters}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
              style={{ 
                backgroundColor: colors.background, 
                color: colors.text,
                border: `1px solid ${colors.border}`
              }}
            >
              Reset
            </button>
            <button
              onClick={exportPDF}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: colors.primary }}
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Single Doctor Stats */}
      {selectedDoctor && (
        <div className="mb-8 p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h3 className="text-2xl font-semibold mb-6 tracking-tight" style={{ color: colors.text }}>
            📈 {selectedDoctor.doctorName} Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md" style={{ backgroundColor: colors.background }}>
              <p className="text-sm font-medium uppercase" style={{ color: colors.lightText }}>Total Patients</p>
              <p className="text-3xl font-bold mt-2" style={{ color: colors.primary }}>{selectedDoctor.totalPatients}</p>
            </div>
            <div className="p-6 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md" style={{ backgroundColor: `${colors.success}10` }}>
              <p className="text-sm font-medium uppercase" style={{ color: colors.lightText }}>Total Business</p>
              <p className="text-3xl font-bold mt-2" style={{ color: colors.success }}>{selectedDoctor.totalBusiness.toFixed(2)} PKR</p>
            </div>
            <div className="p-6 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md" style={{ backgroundColor: colors.background }}>
              <p className="text-sm font-medium uppercase" style={{ color: colors.lightText }}>Total Doctor Share</p>
              <p className="text-3xl font-bold mt-2" style={{ color: colors.text }}>PKR {selectedDoctor.totalDoctorShare.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="mb-8 p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <h3 className="text-2xl font-semibold mb-6 tracking-tight" style={{ color: colors.text }}>
          📈 All Doctors Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: colors.background }}>
                <th 
                  className="px-6 py-4 text-left text-sm font-semibold cursor-pointer" 
                  style={{ color: colors.lightText }}
                  onClick={() => handleSort('doctorName')}
                >
                  Doctor {sortConfig.key === 'doctorName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-4 text-left text-sm font-semibold cursor-pointer" 
                  style={{ color: colors.lightText }}
                  onClick={() => handleSort('totalPatients')}
                >
                  Total Patients {sortConfig.key === 'totalPatients' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-4 text-left text-sm font-semibold cursor-pointer" 
                  style={{ color: colors.lightText }}
                  onClick={() => handleSort('totalBusiness')}
                >
                  Total Business (PKR) {sortConfig.key === 'totalBusiness' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-4 text-left text-sm font-semibold cursor-pointer" 
                  style={{ color: colors.lightText }}
                  onClick={() => handleSort('totalDoctorShare')}
                >
                  Total Doctor Share (PKR) {sortConfig.key === 'totalDoctorShare' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: colors.border }}>
              {sortedDoctorStats.map((doc, index) => (
                <tr 
                  key={index} 
                  className="transition-all duration-200 hover:bg-opacity-80" 
                  style={{ backgroundColor: colors.card }}
                >
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: colors.text }}>{doc.doctorName}</td>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: colors.text }}>{doc.totalPatients}</td>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: colors.success }}>PKR {doc.totalBusiness.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: colors.text }}>PKR {doc.totalDoctorShare.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="h-[500px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default DoctorAnalytics;