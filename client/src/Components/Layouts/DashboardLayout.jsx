import React, { useEffect, useState } from "react";
import Title from "../Elements/Title";
import { jwtDecode } from "jwt-decode";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { Link } from "react-router-dom";
import { HiMenuAlt3 } from "react-icons/hi";

import { toast } from "react-toastify";
import axios from "axios";
import { backupEndpoint } from "../../utils/url";

const DashboardLayout = ({ children }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);
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

  const toggleAuthDropdown = () => {
    setIsAuthDropdownOpen(!isAuthDropdownOpen);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

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
          sidebar w-[85%] md:w-[40vh] bg-blue-800 shadow-xl rounded-md h-screen
          fixed md:sticky top-0 left-0  z-40
          transform transition-transform duration-300 ease-in-out 
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        >
          {/* Sidebar Content */}
          <div className="h-[8rem] flex items-center justify-between px-5">
            <Link to="/admin">
              <Title titleStyle="text-white font-semibold text-xl flex items-center gap-2">SIAR DASHBOARD</Title>
            </Link>
            <button onClick={toggleSidebar} className="md:hidden text-white text-2xl">
              ✕
            </button>
          </div>

          <ul className="list-wrapper px-5 flex flex-col gap-5  ">
            <li className="bg-blue-200 p-2 rounded-md cursor-pointer ">
              <div className="flex items-center justify-between" onClick={toggleAuthDropdown}>
                Staff Management
                {isAuthDropdownOpen ? <IoIosArrowUp /> : <IoIosArrowDown />}
              </div>
              <div className={`transition-all duration-300 overflow-hidden ${isAuthDropdownOpen ? "h-30 mt-2" : "h-0"}`}>
                <ul className="list-inside space-y-2">
                  {user?.roles?.includes("superadmin") && (
                    <>
                      <li className="hover:bg-blue-300 p-2 rounded">
                        <Link to="/admin/staff" className="text-blue-800 block">
                          Data Staff
                        </Link>
                      </li>
                      <li className="hover:bg-blue-300 p-2 rounded">
                        <Link to="/admin/staff/log-login" className="text-blue-800 block">
                          log login Staff
                        </Link>
                      </li>
                    </>
                  )}
                  <li className="hover:bg-blue-300 p-2 rounded">
                    <Link to="/admin/staff/packer-salary" className="text-blue-800 block">
                      Packer Salary Staff
                    </Link>
                  </li>
                </ul>
              </div>
            </li>

            <li className="bg-blue-200 p-2 rounded-md cursor-pointer ">
              <div className="flex items-center justify-between" onClick={toggleDropdown}>
                Barang Management
                {isDropdownOpen ? <IoIosArrowUp /> : <IoIosArrowDown />}
              </div>
              <div className={`transition-all duration-300 overflow-hidden ${isDropdownOpen ? "h-30 mt-2" : "h-0"}`}>
                <ul className="list-inside space-y-2">
                  <li className="hover:bg-blue-300 p-2 rounded">
                    <Link to="/admin/barang" className="text-blue-800 block">
                      Data Resi
                    </Link>
                  </li>
                  {user?.roles?.includes("picker") || user?.roles?.includes("packing") || user?.roles?.includes("pickout") ? (
                    <li className="hover:bg-blue-300 p-2 rounded">
                      <Link to="/" className="text-blue-800 block">
                        Scan Resi
                      </Link>
                    </li>
                  ) : (
                    ""
                  )}
                </ul>
              </div>
            </li>

            <li
              className={`${isLoading ? "bg-gray-500" : "bg-green-700 hover:bg-green-600"} p-2 rounded-md cursor-pointer text-white flex items-center justify-left ${user?.roles?.includes("superadmin") ? "" : "hidden"}`}
              onClick={!isLoading ? handleBackup : undefined}
            >
              {isLoading ? "Sedang memproses..." : "Backup"}
            </li>

            <li
              className="bg-red-500 p-2 rounded-md cursor-pointer text-white"
              onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
              }}
            >
              Logout
            </li>
          </ul>
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
