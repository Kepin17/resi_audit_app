import { jwtDecode } from "jwt-decode";
import Button from "../../Elements/Button";
import Title from "../../Elements/Title";
import React, { useEffect, useState, useRef } from "react";
import { FaUserCircle, FaSignOutAlt, FaUserCog } from "react-icons/fa";

const NavFragment = () => {
  const [tokenDatas, setTokenDatas] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    setTokenDatas(decoded);
    console.log(decoded);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 flex items-center justify-between w-full h-16 px-5 z-50 bg-white/80 backdrop-blur-md border-b shadow-md border-gray-200/50">
      <Title titleStyle="text-[1.5em] font-bold flex items-center gap-2">
        <img src="images/nav/logo.png" alt="logo" width={30} />
        SIAR SYSTEM
      </Title>
      <ul className="flex items-center space-x-4">
        <li>
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100/50 transition-all duration-200 p-2 rounded-lg" onClick={() => setIsOpen(!isOpen)}>
              <FaUserCircle className="text-xl" />
              <span>{tokenDatas.pekerja}</span>
            </div>
            {isOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white/80 backdrop-blur-md rounded-lg shadow-lg py-2 border border-gray-100/50 transform opacity-100 scale-100 transition-all duration-200">
                <Button
                  buttonStyle="w-full text-left px-4 py-3 hover:bg-red-50/50 flex items-center gap-3 text-red-600 transition-all duration-200"
                  onClick={() => {
                    localStorage.removeItem("token");
                    window.location.href = "/";
                  }}
                >
                  <FaSignOutAlt />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </li>
      </ul>
    </nav>
  );
};

export default NavFragment;
