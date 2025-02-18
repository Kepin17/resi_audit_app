import { CiBarcode } from "react-icons/ci";
import Button from "../Elements/Button";
import MainLayout from "../Layouts/MainLayout";
import React, { useEffect, useState } from "react";
import BarcodeScannerFragment from "../Fragments/BarcodeScannerFragment";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import PhotoCaptureFragment from "../Fragments/PhotoCaptureFragment";
import urlApi from "../../utils/url";
import { playSuccessSound, playErrorSound } from "../../utils/audio";
import { FaBoxesPacking, FaCartFlatbed } from "react-icons/fa6";
import Unauthorized from "../Pages/Unauthorized";
import { DatePicker, Pagination } from "antd";
import SearchFragment from "../Fragments/SearchFragment";
import { FaTruck } from "react-icons/fa";

const ScanMainLayout = ({ goTo, dailyEarnings }) => {
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
  const [thisPage, setThisPage] = useState(goTo);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [switchMode, setSwitchMode] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 0,
  });
  const [paginationBeloman, setPaginationBeloman] = useState({
    currentPage: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    const decodeToken = jwtDecode(token);
    setUser(decodeToken.roles);
    setIsLoading(false);
  }, []);

  // Improved scan mode buttons component
  const ScanModeButtons = () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
      <button
        className={`p-4 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-2
          ${scanMode === "barcode-only" ? `${thisPage === "picker" ? "bg-blue-500" : thisPage === "packing" ? "bg-green-500" : "bg-indigo-500"} text-white shadow-lg shadow-blue-200` : "bg-slate-400 hover:bg-slate-500 text-gray-50"}`}
        onClick={() => setScanMode("barcode-only")}
      >
        <CiBarcode className="text-2xl" />
        <span className="font-medium">Barcode Only</span>
      </button>
      <button
        className={`p-4 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-2
          ${scanMode === "barcode-photo" ? ` ${thisPage === "picker" ? "bg-blue-500" : thisPage === "packing" ? "bg-green-500" : "bg-indigo-500"} text-white shadow-lg shadow-blue-200 ` : "bg-slate-400 hover:bg-slate-500 text-gray-50"}`}
        onClick={() => setScanMode("barcode-photo")}
      >
        <CiBarcode className="text-2xl" />
        <span className="font-medium">Barcode + Photo</span>
      </button>
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
      setScanning(true);
      setCurrentResi(null);
      setIsBarcodeActive(true);
      setIsBarcodeActive(false);
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
      const token = localStorage.getItem("token");
      const decodeToken = jwtDecode(token);
      const username = decodeToken.username;

      const allowedRoles = ["admin", "superadmin"];
      if (allowedRoles.includes(decodeToken.role)) {
        window.location.href = "/admin";
      }

      let url = `${urlApi}/api/v1/auditResi/activity/${thisPage}/${username}`;
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
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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

  useEffect(() => {
    const fetchDataBeloman = () => {
      const token = localStorage.getItem("token");
      const decodeToken = jwtDecode(token);

      const allowedRoles = ["admin", "superadmin"];
      if (allowedRoles.includes(decodeToken.role)) {
        window.location.href = "/admin";
      }

      let url = `${urlApi}/api/v1/resi-not-complited/${thisPage}`;

      const queryParams = [];

      if (selectedDate) {
        queryParams.push(`date=${selectedDate.format("YYYY-MM-DD")}`);
      }

      if (searchQuery) {
        queryParams.push(`search=${encodeURIComponent(searchQuery)}`);
      }

      queryParams.push(`page=${paginationBeloman.currentPage}`);
      queryParams.push(`limit=${paginationBeloman.limit}`);

      if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
      }

      axios
        .get(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        .then((res) => {
          if (res.data.success) {
            setDataBeloman(res.data.data);
            setPaginationBeloman((prev) => ({
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

    fetchDataBeloman();
    const interval = setInterval(fetchDataBeloman, 3000);
    return () => clearInterval(interval);
  }, [thisPage, selectedDate, searchQuery, paginationBeloman.currentPage, paginationBeloman.limit]);

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

  const handlePageChangeBeloman = (page, pageSize) => {
    setPaginationBeloman((prev) => ({
      ...prev,
      currentPage: page,
      limit: pageSize,
    }));
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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

  return (
    <MainLayout getPage={thisPage}>
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
                  <button onClick={handleBarcodeClose} className="text-white bg-red-500 px-4 py-2 rounded-lg">
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
          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Stats Cards */}
            <div className={`${thisPage === "picker" ? "bg-blue-500" : thisPage === "packing" ? "bg-green-500" : "bg-indigo-500"} w-[22rem] h-full p-1 my-10 rounded-md flex items-center justify-center border-2 mb-6`}>
              <h1 className="text-4xl flex items-center gap-4 font-bold text-white">
                {thisPage === "picker" ? <FaCartFlatbed /> : thisPage === "packing" ? <FaBoxesPacking /> : <FaTruck />}
                {thisPage === "picker" ? "Pickup" : thisPage === "packing" ? "Packing" : thisPage === "pickout" ? "Delivery" : "Retur"} Station
              </h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-medium text-gray-500">Today's Scans</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">{data.filter((item) => new Date(item.proses_scan).toDateString() === new Date().toDateString()).length}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-medium text-gray-500">Scan Mode</h3>
                <p className={`text-2xl font-bold ${thisPage === "picker" ? "text-blue-500" : thisPage === "packing" ? "text-green-500" : "text-indigo-500"} mt-2`}>{scanMode === "barcode-only" ? "Basic" : "Advanced"}</p>
              </div>

              <div className={`bg-white rounded-xl shadow-sm p-6 ${thisPage !== "packing" ? "hidden" : "block"}`}>
                <h3 className="text-sm font-medium text-gray-500">Daily Earns</h3>
                <p className="text-2xl font-bold text-green-500 mt-2">{dailyEarnings}</p>
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
                  buttonStyle={`${
                    thisPage === "picker"
                      ? "bg-blue-500 hover:bg-blue-600 hover:shadow-blue-300 shadow-blue-200"
                      : thisPage === "packing"
                      ? "bg-green-500 hover:bg-green-600 hover:shadow-green-300 shadow-green-200"
                      : "bg-indigo-500 hover:bg-indigo-600 hover:shadow-indigo-300 shadow-indigo-200"
                  }  px-6 py-3 rounded-xl flex items-center gap-3 text-white transition-all duration-300 shadow-lg hover:shadow-xl `}
                  onClick={() => setIsBarcodeActive(true)}
                >
                  <CiBarcode className="text-xl" />
                  Start Scanning
                </Button>
              </div>
            </div>

            {/* Activity List */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-5  mb-4">
                <DatePicker onChange={handleDateChange} value={selectedDate} format="YYYY-MM-DD" />
                <SearchFragment onSearch={handleSearch} value={searchQuery} placeholder={"Cari Resi"} />
              </div>
              <div className="flex items-center gap-5 mb-4">
                <Button
                  onClick={() => setSwitchMode(true)}
                  buttonStyle={`px-6 py-3 rounded-xl flex items-center gap-3 text-white transition-all duration-300 shadow-lg  hover:shadow-xl ${
                    switchMode
                      ? `${
                          thisPage === "picker"
                            ? "bg-blue-500 hover:bg-blue-600 hover:shadow-blue-300 shadow-blue-200"
                            : thisPage === "packing"
                            ? "bg-green-500 hover:bg-green-600 hover:shadow-green-300 shadow-green-200"
                            : "bg-indigo-500 hover:bg-indigo-600 hover:shadow-indigo-300 shadow-indigo-200"
                        }`
                      : "bg-slate-400 hover:bg-slate-500"
                  }`}
                >
                  Scanku
                </Button>
                <Button
                  onClick={() => setSwitchMode(false)}
                  buttonStyle={`px-6 py-3 rounded-xl flex items-center gap-3 text-white transition-all duration-300 shadow-lg shadow-blue-200  ${
                    !switchMode
                      ? `${
                          thisPage === "picker"
                            ? "bg-blue-500 hover:bg-blue-600 hover:shadow-blue-300 shadow-blue-200"
                            : thisPage === "packing"
                            ? "bg-green-500 hover:bg-green-600 hover:shadow-green-300 shadow-green-200"
                            : "bg-indigo-500 hover:bg-indigo-600 hover:shadow-indigo-300 shadow-indigo-200"
                        }`
                      : "bg-slate-400 hover:bg-slate-500"
                  }`}
                >
                  Belum Selesai
                </Button>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pickup Activity</h2>
              {switchMode ? (
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
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              thisPage === "picker" ? "bg-blue-100 text-blue-700" : thisPage === "packing" ? "bg-green-100 text-green-700" : thisPage === "pickout" ? "bg-indigo-100 text-indigo-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">Resi: {item.resi}</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 md:mt-0">{formatDateTime(item.proses_scan)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {dataBeloman.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg transition-all duration-300
                    hover:bg-gray-50 border border-gray-100"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{item.nama_pekerja}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              thisPage === "picker" ? "bg-blue-100 text-blue-700" : thisPage === "packing" ? "bg-green-100 text-green-700" : thisPage === "pickout" ? "bg-indigo-100 text-indigo-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">Resi: {item.resi}</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 md:mt-0">{formatDateTime(item.proses_scan)}</p>
                    </div>
                  ))}
                </div>
              )}
              {!switchMode ? (
                <Pagination
                  current={paginationBeloman.currentPage}
                  pageSize={paginationBeloman.limit}
                  total={paginationBeloman.totalItems}
                  onChange={handlePageChangeBeloman}
                  showSizeChanger
                  showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                  className="mt-4 flex justify-end"
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
                  className="mt-4 flex justify-end"
                  responsive
                  showQuickJumper
                />
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default ScanMainLayout;
