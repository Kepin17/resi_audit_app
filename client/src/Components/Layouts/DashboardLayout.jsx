import React, { useEffect, useState } from "react";
import Title from "../Elements/Title";
import { jwtDecode } from "jwt-decode";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { Link } from "react-router-dom";
import { HiMenuAlt3 } from "react-icons/hi";

const DashboardLayout = ({ children }) => {
  const token = localStorage.getItem("token");
  const user = jwtDecode(token);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
          fixed md:relative top-0 left-0  z-40
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
                      Data Barang
                    </Link>
                  </li>

                  <li className="hover:bg-blue-300 p-2 rounded">
                    <Link to="/admin/barang/bermasalah" className="text-blue-800 block">
                      Data Barang Bermasalah
                    </Link>
                  </li>
                </ul>
              </div>
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
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
