// src/components/Sidebar.jsx
import React from "react";
import { Link } from "react-router-dom";
import { colors } from "../constants/colors";

const Sidebar = ({ sidebarOpen, setSidebarOpen, userData }) => {
  const isSuperAdmin = userData?.role === 'superadmin';

  // Capitalize role for display
  const displayRole = userData?.role
    ? userData.role === 'superadmin'
      ? 'Super Admin'
      : 'Admin'
    : 'Admin';

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 shadow-lg transform transition-transform duration-300 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: colors.primaryDark }}
      >
        <div className="flex flex-col h-full">
          <div
            className="flex items-center justify-between p-5 border-b"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-center min-w-full">
              <h1 className="text-xl font-bold text-white">SmartLab</h1>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-1">
              <li>
                <Link
                  to="/"
                  className="flex items-center px-4 py-3 rounded-lg text-white font-medium hover:bg-white hover:bg-opacity-10 transition"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="mr-3">👨‍⚕️</span>
                  Doctors
                </Link>
              </li>
              {isSuperAdmin && (
                <li>
                  <Link
                    to="/analytics"
                    className="flex items-center px-4 py-3 rounded-lg text-white font-medium hover:bg-white hover:bg-opacity-10 transition"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="mr-3">📊</span>
                    Doctor Analytics
                  </Link>
                </li>
              )}
              {isSuperAdmin && (
                <li>
                  <Link
                    to="/admin-panel"
                    className="flex items-center px-4 py-3 rounded-lg text-white font-medium hover:bg-white hover:bg-opacity-10 transition"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="mr-3">🛠️</span>
                    Admin Panel
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div
            className="p-5 border-t"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <span className="text-white font-medium">
                  {displayRole.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">Admin User</p>
                <p className="text-xs text-gray-300">{displayRole}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;