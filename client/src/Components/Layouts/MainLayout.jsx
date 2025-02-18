import { useState, useEffect } from "react";
import NavFragment from "../Fragments/NavFragment";

const MainLayout = ({ children, getPage }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header>
        <NavFragment />
      </header>
      <main className="flex-1 w-full p-4">{children}</main>
      <footer className={`${getPage === "picker" ? "bg-blue-600" : getPage === "packing" ? "bg-green-600" : getPage === "pickout" ? "bg-indigo-500" : "bg-indigo-500"} text-white rounded-lg shadow-lg p-4 mx-4 mb-4`}>
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0 mobile:text-center">
              <h3 className="text-lg font-semibold">SIAR System</h3>
              <p className="text-sm text-gray-300">Sistem Informasi Audit Resi</p>
            </div>
            <div className="text-center mb-4 md:mb-0">
              <p className="text-sm">&copy; {new Date().getFullYear()} All rights reserved.</p>
              <p className="text-xs text-gray-300">Version 1.0.0</p>
            </div>
            <div className="text-sm text-gray-300 mobile:text-center">
              <p>Made with ❤️ by Olyzano Team</p>
              <p>{currentTime.toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
