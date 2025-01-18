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
    <nav className="flex items-center justify-between w-full h-16 bg-white px-5 shadow-md z-50">
      <Title titleStyle="text-[1.5em] font-bold flex items-center gap-2">
        <img src="images/nav/logo.png" alt="logo" width={30} />
        ProofPath
      </Title>
      <ul className="flex items-center space-x-4">
        <li>
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors duration-200 p-2 rounded-md" onClick={() => setIsOpen(!isOpen)}>
              <FaUserCircle className="text-xl" />
              <span>{tokenDatas.pekerja}</span>
            </div>
            {isOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 border border-gray-100 transform opacity-100 scale-100 transition-all duration-200">
                <Button buttonStyle="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors duration-200">
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
