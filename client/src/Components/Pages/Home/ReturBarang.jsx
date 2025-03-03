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
import Unauthorized from "../../Pages/Unauthorized";
import { DatePicker, Pagination } from "antd";
import SearchFragment from "../../Fragments/SearchFragment";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaCalendarAlt, FaExchangeAlt, FaQrcode, FaSpinner } from "react-icons/fa";
import { BiSearchAlt } from "react-icons/bi";

const ReturBarangPage = () => {
  const [isBarcodeActive, setIsBarcodeActive] = useState(false);
  const [scanMode, setScanMode] = useState("barcode-only"); // Add this new state
  const [data, setData] = useState([]);
  const [dataBeloman, setDataBeloman] = useState([]);
  const [dataScan, setDataScan] = useState("");
  const [scanning, setScanning] = useState(true);
  const [currentResi, setCurrentResi] = useState(null);
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [user, setUser] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Add this line
  const [thisPage, setThisPage] = useState("retur_barang");
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [switchMode, setSwitchMode] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 0,
  });

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const checkTokenExpiration = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      handleLogout();
      return false;
    }
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        toast.error("Session expired. Please login again.");
        handleLogout();
        return false;
      }
      return true;
    } catch (error) {
      handleLogout();
      return false;
    }
  };

  useEffect(() => {
    if (!checkTokenExpiration()) return;

    const token = localStorage.getItem("token");
    const decodeToken = jwtDecode(token);
    setUser(decodeToken.roles);
    setIsLoading(false);
  }, []);

  // Add animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  // Improved scan mode buttons component
  const ScanModeButtons = () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={`p-4 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-2 border border-transparent
          ${
            scanMode === "barcode-only"
              ? "bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg backdrop-blur-sm"
              : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:text-yellow-400 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-800 text-gray-700 shadow"
          }`}
        onClick={() => setScanMode("barcode-only")}
      >
        <CiBarcode className="text-2xl" />
        <span className="font-medium">Barcode Only</span>
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={`p-4 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-2 border border-transparent
          ${
            scanMode === "barcode-photo"
              ? "bg-gradient-to-br  from-purple-400 to-purple-600 text-white shadow-lg backdrop-blur-sm"
              : "bg-white hover:bg-slate-50  hover:border-slate-200 text-gray-700 dark:bg-slate-800 dark:hover:border-slate-800  dark:text-yellow-400 dark:hover:bg-slate-800 shadow"
          }`}
        onClick={() => setScanMode("barcode-photo")}
      >
        <CiBarcode className="text-2xl" />
        <span className="font-medium">Barcode + Photo</span>
      </motion.button>
    </div>
  );

  // Add cleanup effect for scanner/camera
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      if (isBarcodeActive || isPhotoMode) {
        setIsBarcodeActive(false);
        setIsPhotoMode(false);
      }
    };
  }, [isBarcodeActive, isPhotoMode]);

  const scanHandler = async (err, result) => {
    if (result) {
      setDataScan(result.text);
      setScanning(false);
      setCurrentResi(result.text);

      if (scanMode === "barcode-photo") {
        // Ensure state updates are done in the correct order
        setIsBarcodeActive(false);
        setTimeout(() => setIsPhotoMode(true), 0);
      } else {
        handleSubmitWithoutPhoto(result.text);
      }
    } else {
      setDataScan("Not Found");
      setScanning(true);
    }
  };

  const handleSubmitWithoutPhoto = async (resiId) => {
    if (!checkTokenExpiration()) return;

    try {
      const token = localStorage.getItem("token");
      const decodeToken = jwtDecode(token);
      const user = decodeToken.id_pekerja;
      const formData = new FormData();
      formData.append("id_pekerja", user);

      const response = await axios.put(`${urlApi}/api/v1/retur-scan/${resiId || currentResi}`, formData, {
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
      setScanning(true);
      setCurrentResi(null);
      setIsBarcodeActive(true);
      setIsBarcodeActive(false);
    }
  };

  const handlePhotoCapture = async ({ photo }) => {
    if (!checkTokenExpiration()) return;

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

      const response = await axios.put(`${urlApi}/api/v1/retur-scan/${currentResi}`, formData, {
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
      setIsBarcodeActive(false);
    }
  };

  const handlePhotoCancel = () => {
    // Ensure state updates are done in the correct order
    setIsPhotoMode(false);
    setCurrentResi(null);
    setScanning(true);
    // Remove barcode activation from here to prevent DOM conflicts
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
      if (!checkTokenExpiration()) return;

      const token = localStorage.getItem("token");
      const decodeToken = jwtDecode(token);
      const id_pekerja = decodeToken.id_pekerja;

      let url = `${urlApi}/api/v1/auditResi/activity-retur/${id_pekerja}`;
      const queryParams = [];

      if (selectedDate) {
        queryParams.push(`date=${selectedDate.format("YYYY-MM-DD")}`);
      }

      if (searchQuery) {
        queryParams.push(`search=${encodeURIComponent(searchQuery)}`);
      }

      // Add pagination parameters
      queryParams.push(`page=${pagination.currentPage}`);
      queryParams.push(`limit=${pagination.limit}`);

      if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
      }

      axios
        .get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          if (res.data.success) {
            setData(res.data.data);
            setPagination((prev) => ({
              ...prev,
              currentPage: res.data.pagination.currentPage,
              limit: res.data.pagination.limit,
              totalItems: res.data.pagination.totalItems,
              totalPages: res.data.pagination.totalPages,
            }));
          }
        })
        .catch((err) => {
          console.error(err.response?.data?.message);
          toast.error(err.response?.data?.message || "Failed to fetch data");
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [thisPage, selectedDate, searchQuery, pagination.currentPage, pagination.limit]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
  };

  const handlePageChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: page,
      limit: pageSize,
    }));
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user.includes(thisPage)) {
    return (
      <MainLayout>
        <Unauthorized />
      </MainLayout>
    );
  }

  // Update the close handler for the barcode scanner
  const handleBarcodeClose = () => {
    setScanning(false);
    setTimeout(() => {
      setIsBarcodeActive(false);
      setScanning(true);
    }, 0);
  };

  // New component for statistics cards
  const StatCard = ({ title, value, icon, color }) => (
    <motion.div
      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-gray-200 dark:bg-slate-900 dark:border-slate-700 dark:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between ">
        <div>
          <h3 className="text-sm font-medium text-gray-500 ">{title}</h3>
          <p className={`text-2xl font-bold ${color} mt-2`}>{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color.replace("text", "bg").replace("500", "100")} flex items-center justify-center `}>{icon}</div>
      </div>
    </motion.div>
  );

  return (
    <MainLayout getPage={thisPage}>
      <ToastContainer position="top-right" autoClose={1000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />

      {isPhotoMode || isBarcodeActive ? (
        <div className="fixed inset-0 bg-black z-50">
          <div className="w-full h-full flex flex-col">
            {isPhotoMode ? (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 flex justify-between items-center">
                  <h3 className="text-lg font-medium">Foto Paket - {currentResi}</h3>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handlePhotoCancel} className="text-white bg-black/30 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-black/40 transition-all">
                    Close
                  </motion.button>
                </div>
                <div className="flex-1">
                  <PhotoCaptureFragment onPhotoCapture={handlePhotoCapture} onCancel={handlePhotoCancel} />
                </div>
              </>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 flex justify-between items-center">
                  <h3 className="text-lg font-medium">Scanner Resi</h3>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleBarcodeClose} className="text-white bg-black/30 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-black/40 transition-all">
                    Close
                  </motion.button>
                </div>
                <div className="flex-1">
                  <BarcodeScannerFragment dataScan={dataScan} scanning={scanning} scanHandler={scanHandler} />
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 rounded-lg">
          {/* Main Content */}
          <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header with animated gradient background */}
            <motion.div variants={itemVariants} className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-purple-700 rounded-2xl shadow-lg mb-10">
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path fill="white" d="M0,50 Q25,25 50,50 T100,50 T50,90 T0,50" />
                </svg>
              </div>

              <div className="relative p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <FaExchangeAlt className="text-2xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Retur Station</h1>
                    <p className="text-white/80 text-sm md:text-base mt-1">Process returned packages efficiently</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Today's Returns"
                value={data.filter((item) => new Date(item.proses_scan).toDateString() === new Date().toDateString()).length}
                icon={<FaQrcode className="text-2xl" />}
                color="text-gray-900 dark:text-yellow-400"
              />

              <StatCard title="Scan Mode" value={scanMode === "barcode-only" ? "Basic" : "Advanced"} icon={<CiBarcode className="text-2xl" />} color="text-purple-500" />
            </motion.div>

            {/* Scanner Controls */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 mb-8 border border-gray-100 dark:border-slate-700">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-auto">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-yellow-400">Scan Settings</h2>
                  <ScanModeButtons />
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button buttonStyle="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-3 rounded-xl flex items-center gap-3 text-white transition-all duration-300 shadow-lg hover:shadow-xl" onClick={() => setIsBarcodeActive(true)}>
                    <CiBarcode className="text-xl" />
                    Start Scanning
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Activity List */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-5 mb-6">
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <FaCalendarAlt className="text-gray-500 text-xl" />
                  <DatePicker onChange={handleDateChange} value={selectedDate} format="YYYY-MM-DD" className="border-none bg-transparent focus:ring-0 w-32" />
                </div>
                <div className="flex-grow">
                  <SearchFragment onSearch={handleSearch} value={searchQuery} placeholder={"Cari Resi"} icon={<BiSearchAlt className="text-gray-500" />} />
                </div>
              </div>

              <div className="flex items-center gap-5 mb-6">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => setSwitchMode(true)}
                    buttonStyle={`px-6 py-3 rounded-xl flex items-center gap-3 text-white transition-all duration-300 shadow-md
                      ${switchMode ? "bg-gradient-to-r from-purple-500 to-purple-600" : "bg-gray-300 text-gray-700"}`}
                  >
                    Scanku
                  </Button>
                </motion.div>
              </div>

              <h2 className="text-lg font-semibold text-purple-600 mb-4">Retur Activity</h2>

              <AnimatePresence mode="wait">
                <motion.div key={switchMode ? "scanned" : "pending"} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  {(switchMode ? data : dataBeloman).map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg transition-all duration-300
                        hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800 hover:shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-yellow-400">{item.nama_pekerja}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-slate-800 dark:shadow-xl text-purple-700 dark:text-purple-300">{item.status}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Resi: <span className="font-medium">{item.resi_id}</span>
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 md:mt-0 flex items-center gap-2">
                        <span className="hidden md:inline">Scanned:</span>
                        {formatDateTime(item.proses_scan)}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              <div className="mt-6">
                {!switchMode ? (
                  <Pagination
                    current={paginationBeloman ? paginationBeloman.currentPage : 1}
                    pageSize={paginationBeloman ? paginationBeloman.limit : 5}
                    total={paginationBeloman ? paginationBeloman.totalItems : 0}
                    onChange={handlePageChangeBeloman}
                    showSizeChanger
                    showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                    className="flex justify-end"
                    responsive
                    showQuickJumper
                  />
                ) : (
                  <Pagination
                    current={pagination.currentPage}
                    pageSize={pagination.limit}
                    total={pagination.totalItems}
                    onChange={handlePageChange}
                    showSizeChanger
                    showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                    className="flex justify-end"
                    responsive
                    showQuickJumper
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </MainLayout>
  );
};

export default ReturBarangPage;
