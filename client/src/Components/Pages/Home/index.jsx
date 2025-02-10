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

const HomePage = () => {
  const [isBarcodeActive, setIsBarcodeActive] = useState(false);
  const [data, setData] = useState([]);
  const [dataScan, setDataScan] = useState("");
  const [scanning, setScanning] = useState(true);
  const [currentResi, setCurrentResi] = useState(null);
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [showPhotoConfirm, setShowPhotoConfirm] = useState(false);

  const scanHandler = async (err, result) => {
    if (result) {
      setDataScan(result.text);
      setScanning(false);
      setCurrentResi(result.text);
      const token = localStorage.getItem("token");

      axios
        .post(
          `${urlApi}/api/v1/auditResi/check/${result.text}`,
          {
            id_pekerja: jwtDecode(token).id_pekerja,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((res) => {
          setShowPhotoConfirm(true);
          setIsBarcodeActive(false);
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || "Failed to check resi");
        });
    } else {
      setDataScan("Not Found");
      setScanning(true);
    }
  };

  const handleSubmitWithoutPhoto = () => {
    const token = localStorage.getItem("token");
    const decodeToken = jwtDecode(token);
    const user = decodeToken.id_pekerja;

    const formData = new FormData();
    formData.append("resi_id", currentResi);
    formData.append("id_pekerja", user);

    axios
      .post(`${urlApi}/api/v1/auditResi`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => {
        toast.success("Process completed successfully");
        setShowPhotoConfirm(false);
        setScanning(true);
        setCurrentResi(null);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to process");
      });
  };

  const handlePhotoCapture = ({ photo }) => {
    if (!photo) {
      toast.error("Photo is required for picker role");
      return;
    }

    const token = localStorage.getItem("token");
    const decodeToken = jwtDecode(token);
    const user = decodeToken.id_pekerja;

    // Convert base64 to blob
    const base64Response = fetch(photo);
    base64Response
      .then((res) => res.blob())
      .then((blob) => {
        const formData = new FormData();
        const photoFile = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });

        formData.append("photo", photoFile);
        formData.append("resi_id", currentResi);
        formData.append("id_pekerja", user);

        axios
          .post(`${urlApi}/api/v1/auditResi`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          })
          .then((res) => {
            toast.success("Process completed successfully");
            setIsPhotoMode(false);
            setIsBarcodeActive(true);
            setScanning(true);
            setCurrentResi(null);
            photo = ""; // Reset the photo
          })
          .catch((err) => {
            toast.error(err.response?.data?.message || "Failed to process");
          });
      });
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
        .get(`${urlApi}/api/v1/auditResi/activity/${username}`, {
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
      <ToastContainer />

      {showPhotoConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-medium mb-4">Would you like to add a photo?</h3>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowPhotoConfirm(false);
                  handleSubmitWithoutPhoto();
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                No
              </button>
              <button
                onClick={() => {
                  setShowPhotoConfirm(false);
                  setIsPhotoMode(true);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

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
        <>
          <div className="w-full h-16 flex items-center justify-start px-5 border-b"></div>
          <div className="w-full flex-1 p-5 space-y-5 mt-6">
            <div className="w-full bg-white rounded-lg shadow-md p-4">
              <div className="h-32 flex items-center justify-between">
                <h3 className="text-lg font-medium">Data Hari Ini</h3>
                <Button
                  buttonStyle={`bg-blue-500 hover:bg-blue-600 p-2 rounded-md flex items-center gap-2 text-white transition-all duration-200`}
                  onClick={() => {
                    setIsBarcodeActive(true);
                  }}
                >
                  <CiBarcode />
                  Update Paket
                </Button>
              </div>
            </div>
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
        </>
      )}
    </MainLayout>
  );
};

export default HomePage;
