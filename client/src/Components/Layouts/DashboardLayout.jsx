import React, { useEffect, useState } from "react";
import Title from "../Elements/Title";
import { jwtDecode } from "jwt-decode";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { Link } from "react-router-dom";

const DashboardLayout = ({ children }) => {
  const token = localStorage.getItem("token");
  const user = jwtDecode(token);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogDropdownOpen, setIsLogDropdownOpen] = useState(false);
  const [isResiDropdownOpen, setIsResiDropdownOpen] = useState(false);
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);

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

  const toggleResiDropdown = () => {
    setIsResiDropdownOpen(!isResiDropdownOpen);
  };

  const toggleLogDropdown = () => {
    setIsLogDropdownOpen(!isLogDropdownOpen);
  };

  return (
    <div className="bg-slate-900">
      <div className="flex py-2 px-5 gap-5">
        <nav className="sidebar w-[40vh] h-auto bg-blue-800 shadow-xl rounded-md">
          <div className="h-[8rem] flex items-center justify-start px-5">
            <Link to="/admin">
              <Title titleStyle="text-white font-semibold text-xl flex items-center gap-2">SIAR DASHBOARD</Title>
            </Link>
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
                    <Link to="/barang" className="text-blue-800 block">
                      Data Staff
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
                    <Link to="/kategori" className="text-blue-800 block">
                      Kategori Barang
                    </Link>
                  </li>
                </ul>
              </div>
            </li>

            <li className="bg-blue-200 p-2 rounded-md cursor-pointer ">
              <div className="flex items-center justify-between" onClick={toggleResiDropdown}>
                Scan Activity
                {isResiDropdownOpen ? <IoIosArrowUp /> : <IoIosArrowDown />}
              </div>
              <div className={`transition-all duration-300 overflow-hidden ${isResiDropdownOpen ? "h-30 mt-2" : "h-0"}`}>
                <ul className="list-inside space-y-2">
                  <li className="hover:bg-blue-300 p-2 rounded">
                    <Link to="/barang" className="text-blue-800 block">
                      Data Scan
                    </Link>
                  </li>
                </ul>
              </div>
            </li>

            <li className="bg-blue-200 p-2 rounded-md cursor-pointer">
              <div className="flex items-center justify-between" onClick={toggleLogDropdown}>
                Log Activity
                {isLogDropdownOpen ? <IoIosArrowUp /> : <IoIosArrowDown />}
              </div>
              <div className={`transition-all duration-300 overflow-hidden ${isLogDropdownOpen ? "h-30 mt-2" : "h-0"}`}>
                <ul className="list-inside space-y-2">
                  <li className="hover:bg-blue-300 p-2 rounded">
                    <Link to="/log-proses" className="text-blue-800 block">
                      Log Proses
                    </Link>
                  </li>
                  <li className="hover:bg-blue-300 p-2 rounded">
                    <Link to="/log-login" className="text-blue-800 block">
                      Log Login
                    </Link>
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </nav>
        <div className="h-auto container mx-auto flex flex-col gap-5">
          <nav className="h-[8rem] px-5 bg-blue-700 shadow-lg rounded-lg flex items-center justify-between">
            <h1 className="text-white font-semibold text-xl">Admin Dashboard</h1>
            <div className="profile cursor-pointer relative text-white">
              <div className="flex gap-2 flex-col">
                <p> {user.pekerja}</p>
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
