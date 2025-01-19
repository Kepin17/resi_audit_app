import { CiBarcode } from "react-icons/ci";
import Button from "../../Elements/Button";
import MainLayout from "../../Layouts/MainLayout";
import React, { useEffect, useState } from "react";
import BarcodeScannerFragment from "../../Fragments/BarcodeScannerFragment";
import { IoIosCloseCircle } from "react-icons/io";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const HomePage = () => {
  const [isBarcodeActive, setIsBarcodeActive] = useState(false);
  const [changeBtn, setChangeBtn] = useState(false);
  const [data, setData] = useState([]);

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    const day = date.getDate();
    const month = date.toLocaleString("id-ID", { month: "long" });
    const year = date.getFullYear();
    const time = date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    return `${day} ${month} ${year} `;
  };

  useEffect(() => {
    const fetchData = () => {
      const token = localStorage.getItem("token");
      const decodeToken = jwtDecode(token);
      const username = decodeToken.username;

      axios
        .get(`http://localhost:8080/api/v1/auditResi/activity/${username}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        .then((res) => {
          setData(res.data.data);
        })
        .catch((err) => {
          console.error(err.response.data.message);
        });
    };

    // Initial fetch
    fetchData();

    // Set up interval for subsequent fetches
    const interval = setInterval(fetchData, 3000); // 2000 ms = 2 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []); // Empty dependency array

  return (
    <MainLayout>
      <div className="w-full h-16 flex items-center justify-start px-5 border-b">
        <div className="flex items-center space-x-4">
          <Button
            buttonStyle={`${changeBtn ? "bg-red-500 hover:bg-red-600 " : "bg-blue-500 hover:bg-blue-600 "} p-2 rounded-md flex items-center gap-2 text-white transition-all duration-200`}
            onClick={() => {
              setIsBarcodeActive(!isBarcodeActive);
              setChangeBtn(!changeBtn);
            }}
          >
            {isBarcodeActive ? (
              <>
                <IoIosCloseCircle />
                Tutup Scanner
              </>
            ) : (
              <>
                <CiBarcode />
                Update Paket
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="w-full flex-1 p-5 space-y-5">
        {isBarcodeActive && (
          <div className="w-full h-auto py-2 max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="text-lg font-medium">Scanner Resi </h3>
            </div>
            <div>
              <BarcodeScannerFragment />
            </div>
          </div>
        )}
        <div className="w-full bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-medium mb-4">Data Hari Ini</h3>
          <div className="today-data-wrapper">
            {data.map((item, index) => (
              <div key={index} className="today-data-item bg-gray-50 p-5 mb-2 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-md font-medium">{item.nama_pekerja}</p>
                  <p className="text-sm text-gray-500">{item.resi}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{formatDateTime(item.proses_scan)}</p>
                  <p className={`text-sm ${item.status === "success" ? "text-green-500" : "text-red-500"}`}>{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;
