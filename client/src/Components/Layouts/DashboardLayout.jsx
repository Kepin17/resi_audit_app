import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import { HiMenuAlt3 } from "react-icons/hi";
import { FaUsers, FaBoxes, FaHistory, FaMoneyBillWave, FaQrcode, FaDatabase, FaSignOutAlt } from "react-icons/fa";
import Title from "../Elements/Title";
import { toast } from "react-toastify";
import axios from "axios";
import { backupEndpoint } from "../../utils/url";
import { TbTruckReturn } from "react-icons/tb";

const DashboardLayout = ({ children, activePage }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = jwtDecode(token);
    setUser(user);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleBackup = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios({
        url: backupEndpoint,
        method: "GET",
        responseType: "blob", // Important for file download
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Create download link
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = downloadUrl;

      // Get filename from response headers or use default
      const contentDisposition = response.headers["content-disposition"];
      const fileName = contentDisposition ? contentDisposition.split("filename=")[1] : "backup.zip";

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Backup berhasil diunduh!");
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("Terjadi kesalahan saat melakukan backup");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen">
      <div className="flex flex-col md:flex-row py-2 px-2 md:px-5 gap-5">
        {/* Mobile Hamburger Menu */}
        <div className="md:hidden flex items-center p-4">
          <button onClick={toggleSidebar} className="text-white text-2xl">
            <HiMenuAlt3 />
          </button>
        </div>

        {/* Sidebar */}
        <nav
          className={`
          sidebar w-[85%] md:w-[250px] lg:w-[300px] bg-gradient-to-b from-blue-800 to-blue-900 shadow-xl rounded-md h-screen
          fixed md:sticky top-0 left-0 z-40
          transform transition-transform duration-300 ease-in-out 
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        >
          {/* Sidebar Header */}
          <div className="h-[6rem] flex items-center justify-between px-4 border-b border-blue-700">
            <Link to="/admin">
              <Title titleStyle="text-white font-semibold text-xl flex items-center gap-2">
                <FaDatabase className="text-2xl" /> SIAR DASHBOARD
              </Title>
            </Link>
            <button onClick={toggleSidebar} className="md:hidden text-white text-2xl hover:text-gray-300">
              ✕
            </button>
          </div>

          {/* Sidebar Menu */}
          <div className="px-3 py-4 overflow-y-auto">
            <ul className="space-y-3">
              {/* Staff Management Section */}
              <li className="menu-section">
                <ul className="space-y-1">
                  {user?.roles?.includes("superadmin") && (
                    <>
                      <div className="text-gray-300 text-sm font-medium mb-2 px-3">STAFF MANAGEMENT</div>
                      <li>
                        <Link to="/admin/staff" className={`flex items-center p-3 text-white rounded-lg hover:bg-blue-700 transition-colors ${activePage === "staff" && "bg-blue-700"}`}>
                          <FaUsers className="w-5 h-5" />
                          <span className="ml-3">Data Staff</span>
                        </Link>
                      </li>
                      <li>
                        <Link to="/admin/staff/log-login" className={`flex items-center p-3 text-white rounded-lg hover:bg-blue-700 transition-colors ${activePage === "log" && "bg-blue-700"}`}>
                          <FaHistory className="w-5 h-5" />
                          <span className="ml-3">Log Login Staff</span>
                        </Link>
                      </li>
                    </>
                  )}
                  {user?.roles?.includes("finance") && (
                    <li>
                      <Link to="/admin/staff/packer-salary" className={`flex items-center p-3 text-white rounded-lg hover:bg-blue-700 transition-colors ${activePage === "Packing Salary" && "bg-blue-700"}`}>
                        <FaMoneyBillWave className="w-5 h-5" />
                        <span className="ml-3">Packer Salary</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </li>

              {/* Data Management Section */}
              <li className="menu-section">
                <div className="text-gray-300 text-sm font-medium mb-2 px-3">DATA MANAGEMENT</div>
                <ul className="space-y-1">
                  <li>
                    <Link to="/admin/barang" className={`flex items-center p-3 text-white rounded-lg hover:bg-blue-700 transition-colors ${activePage === "barang" && "bg-blue-700"}`}>
                      <FaBoxes className="w-5 h-5" />
                      <span className="ml-3">Data Resi</span>
                    </Link>
                  </li>
                  {(user?.roles?.includes("retur_barang") || user?.roles?.includes("packing") || user?.roles?.includes("pickout")) && (
                    <li>
                      <Link to="/admin/retur-barang" className={`flex items-center p-3 text-white rounded-lg hover:bg-blue-700 transition-colors ${activePage === "retur" && "bg-blue-700"}`}>
                        <TbTruckReturn className="w-5 h-5" />
                        <span className="ml-3">Retur Barang</span>
                      </Link>
                    </li>
                  )}
                  {(user?.roles?.includes("picker") || user?.roles?.includes("packing") || user?.roles?.includes("pickout") || user?.roles?.includes("retur_barang")) && (
                    <li>
                      <Link to="/" className={`flex items-center p-3 text-white rounded-lg hover:bg-blue-700 transition-colors ${activePage === "scan" && "bg-blue-700"}`}>
                        <FaQrcode className="w-5 h-5" />
                        <span className="ml-3">Scan Resi</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </li>

              {/* System Actions */}
              <li className="menu-section mt-auto">
                <div className="text-gray-300 text-sm font-medium mb-2 px-3">SYSTEM</div>
                <ul className="space-y-1">
                  {user?.roles?.includes("superadmin") && (
                    <li>
                      <button
                        onClick={!isLoading ? handleBackup : undefined}
                        className={`w-full flex items-center p-3 text-white rounded-lg transition-colors ${isLoading ? "bg-gray-600 cursor-not-allowed" : "bg-green-700 hover:bg-green-600"}`}
                        disabled={isLoading}
                      >
                        <FaDatabase className="w-5 h-5" />
                        <span className="ml-3">{isLoading ? "Processing..." : "Backup"}</span>
                      </button>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={() => {
                        localStorage.removeItem("token");
                        window.location.href = "/login";
                      }}
                      className="w-full flex items-center p-3 text-white rounded-lg hover:bg-red-600 bg-red-700 transition-colors"
                    >
                      <FaSignOutAlt className="w-5 h-5" />
                      <span className="ml-3">Logout</span>
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </nav>

        {/* Overlay for mobile */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={toggleSidebar} />}

        {/* Main Content */}
        <div className="h-auto w-full flex flex-col gap-5">
          <nav className="h-auto md:h-[8rem] p-4 md:px-5 bg-blue-700 shadow-lg rounded-lg flex flex-col md:flex-row md:items-center justify-between">
            <h1 className="text-white font-semibold text-xl mb-2 md:mb-0">Admin Dashboard</h1>
            <div className="profile cursor-pointer relative text-white">
              <div className="flex gap-2 flex-col">
                <p>{user.pekerja}</p>
                <p>{currentTime.toLocaleTimeString()} | Fighting 🔥</p>
              </div>
            </div>
          </nav>
          {children}

          <footer className="bg-blue-800 text-white rounded-lg shadow-lg p-4 mt-auto">
            <div className="container mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-lg font-semibold">SIAR Dashboard</h3>
                  <p className="text-sm text-gray-300">Sistem Informasi Audit Resi</p>
                </div>
                <div className="text-center mb-4 md:mb-0">
                  <p className="text-sm">&copy; {new Date().getFullYear()} All rights reserved.</p>
                  <p className="text-xs text-gray-300">Version 1.0.0</p>
                </div>
                <div className="text-sm text-gray-300">
                  <p>Made with ❤️ by Olyzano Team</p>
                  <p>{currentTime.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
