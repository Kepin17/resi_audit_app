import { CiBarcode } from "react-icons/ci";
import Button from "../../Elements/Button";
import MainLayout from "../../Layouts/MainLayout";
import React, { useEffect, useState } from "react";
import BarcodeScannerFragment from "../../Fragments/BarcodeScannerFragment";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import PhotoCaptureFragment from "../../Fragments/PhotoCaptureFragment";
import urlApi from "../../../utils/url";
import { playSuccessSound, playErrorSound } from "../../../utils/audio";
import { FaCartFlatbed } from "react-icons/fa6";
import Unauthorized from "../Unauthorized";

const PickoutPage = () => {
  const [isBarcodeActive, setIsBarcodeActive] = useState(false);
  const [scanMode, setScanMode] = useState("barcode-only"); // Add this new state
  const [data, setData] = useState([]);
  const [dataScan, setDataScan] = useState("");
  const [scanning, setScanning] = useState(true);
  const [currentResi, setCurrentResi] = useState(null);
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [user, setUser] = useState({});
  const [thisPage, setThisPage] = useState("pickout");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decodeToken = jwtDecode(token);
    setUser(decodeToken);
  }, []);
  // Improved scan mode buttons component
  const ScanModeButtons = () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
      <button
        className={`p-4 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-2
          ${scanMode === "barcode-only" ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        onClick={() => setScanMode("barcode-only")}
      >
        <CiBarcode className="text-2xl" />
        <span className="font-medium">Barcode Only</span>
      </button>
      <button
        className={`p-4 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-2
          ${scanMode === "barcode-photo" ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        onClick={() => setScanMode("barcode-photo")}
      >
        <CiBarcode className="text-2xl" />
        <span className="font-medium">Barcode + Photo</span>
      </button>
    </div>
  );

  const scanHandler = async (err, result) => {
    if (result) {
      setDataScan(result.text);
      setScanning(false);
      setCurrentResi(result.text);

      if (scanMode === "barcode-photo") {
        setIsPhotoMode(true);
        setIsBarcodeActive(false);
      } else {
        handleSubmitWithoutPhoto(result.text);
      }
    } else {
      playErrorSound();
      setDataScan("Not Found");
      setScanning(true);
    }
  };

  const handleSubmitWithoutPhoto = async (resiId) => {
    try {
      const token = localStorage.getItem("token");
      const decodeToken = jwtDecode(token);
      const user = decodeToken.id_pekerja;

      const formData = new FormData();
      formData.append("id_pekerja", user);
      formData.append("thisPage", thisPage);

      const response = await axios.post(`${urlApi}/api/v1/auditResi/scan/${resiId || currentResi}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        playSuccessSound();
        toast.success(response.data.message || "Process completed successfully");
      } else {
        playErrorSound();
        toast.error(response.data.message || "Process failed");
      }
    } catch (err) {
      playErrorSound();
      toast.error(err.response?.data?.message || "Failed to process");
    } finally {
      setShowPhotoConfirm(false);
      setScanning(true);
      setCurrentResi(null);
      setIsBarcodeActive(true);
    }
  };

  const handlePhotoCapture = async ({ photo }) => {
    if (!photo) {
      playErrorSound();
      toast.error("Photo is required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const decodeToken = jwtDecode(token);
      const user = decodeToken.id_pekerja;

      // Convert base64 to blob
      const base64Response = await fetch(photo);
      const blob = await base64Response.blob();
      const formData = new FormData();
      const photoFile = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });

      formData.append("photo", photoFile);
      formData.append("id_pekerja", user);
      formData.append("thisPage", thisPage);

      const response = await axios.post(`${urlApi}/api/v1/auditResi/scan/${currentResi}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        playSuccessSound();
        toast.success(response.data.message || "Process completed successfully");
      } else {
        playErrorSound();
        toast.error(response.data.message || "Process failed");
      }
    } catch (err) {
      playErrorSound();
      toast.error(err.response?.data?.message || "Failed to process");
    } finally {
      setIsPhotoMode(false);
      setIsBarcodeActive(true);
      setScanning(true);
      setCurrentResi(null);
    }
  };

  const handlePhotoCancel = () => {
    setIsPhotoMode(false);
    setIsBarcodeActive(true);
    setScanning(true);
    setCurrentResi(null);
  };

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

    return `${day} ${month} ${year} | ${time}`;
  };

  useEffect(() => {
    const fetchData = () => {
      const token = localStorage.getItem("token");
      const decodeToken = jwtDecode(token);
      const username = decodeToken.username;

      const allowedRoles = ["admin", "superadmin"];
      if (allowedRoles.includes(decodeToken.role)) {
        window.location.href = "/admin";
      }

      axios
        .get(`${urlApi}/api/v1/auditResi/activity/${thisPage}/${username}`, {
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

  if (!user?.roles?.includes("pickout")) {
    return (
      <MainLayout>
        <Unauthorized />
      </MainLayout>
    );
  }
  return (
    <MainLayout>
      <ToastContainer />

      {isPhotoMode || isBarcodeActive ? (
        <div className="fixed inset-0 bg-black z-50">
          <div className="w-full h-full flex flex-col">
            {isPhotoMode ? (
              <>
                <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                  <h3 className="text-lg font-medium">Foto Paket - {currentResi}</h3>
                  <button onClick={handlePhotoCancel} className="text-white bg-red-500 px-4 py-2 rounded-lg">
                    Close
                  </button>
                </div>
                <div className="flex-1">
                  <PhotoCaptureFragment onPhotoCapture={handlePhotoCapture} onCancel={handlePhotoCancel} />
                </div>
              </>
            ) : (
              <>
                <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                  <h3 className="text-lg font-medium">Scanner Resi</h3>
                  <button
                    onClick={() => {
                      setIsBarcodeActive(false);
                    }}
                    className="text-white bg-red-500 px-4 py-2 rounded-lg"
                  >
                    Close
                  </button>
                </div>
                <div className="flex-1">
                  <BarcodeScannerFragment dataScan={dataScan} scanning={scanning} scanHandler={scanHandler} />
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          {/* Header Section */}
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <h1 className="text-2xl font-bold text-gray-900">Package Audit Dashboard</h1>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Stats Cards */}
            <div className="bg-blue-100 text-blue-500 w-[22rem] h-full p-1 rounded-md flex items-center justify-center border-2 mb-6">
              <h1 className="text-4xl flex items-center gap-4 font-bold">
                <FaCartFlatbed />
                Pickout Barcode
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-medium text-gray-500">Today's Scans</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">{data.filter((item) => new Date(item.proses_scan).toDateString() === new Date().toDateString()).length}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-medium text-gray-500">Scan Mode</h3>
                <p className="text-2xl font-bold text-blue-500 mt-2">{scanMode === "barcode-only" ? "Basic" : "Advanced"}</p>
              </div>
            </div>

            {/* Scanner Controls */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-auto">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan Settings</h2>
                  <ScanModeButtons />
                </div>
                <Button
                  buttonStyle="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-xl flex items-center gap-3 text-white transition-all duration-300 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300"
                  onClick={() => setIsBarcodeActive(true)}
                >
                  <CiBarcode className="text-xl" />
                  Start Scanning
                </Button>
              </div>
            </div>

            {/* Activity List */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {data.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg transition-all duration-300
                      hover:bg-gray-50 border border-gray-100"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.nama_pekerja}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${item.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{item.status}</span>
                      </div>
                      <p className="text-sm text-gray-500">Resi: {item.resi}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 md:mt-0">{formatDateTime(item.proses_scan)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default PickoutPage;
