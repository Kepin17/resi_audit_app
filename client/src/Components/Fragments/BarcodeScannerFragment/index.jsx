import React, { useEffect, useState } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import "./scan.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";

const BarcodeScannerFragment = () => {
  const [data, setData] = useState("");
  const [scanning, setScanning] = useState(true);

  const scanHandler = (err, result) => {
    if (result) {
      setData(result.text);
      setScanning(false);
      const token = localStorage.getItem("token");
      const decodeToken = jwtDecode(token);
      const user = decodeToken.id_pekerja;
      axios
        .post(
          "http://localhost:8080/api/v1/auditResi",
          {
            resi_id: result.text,
            id_pekerja: user,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        )
        .then((res) => {
          toast.success(res.data.message, {
            position: "top-center",
            autoClose: 2000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
          });
        })
        .catch((err) => {
          toast.error(err.response.data.message, {
            position: "top-center",
            autoClose: 2000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
          });
        });
    } else {
      setData("Not Found");
      setScanning(true);
    }
  };
  return (
    <>
      <ToastContainer />
      <div className="relative ">
        {scanning && (
          <div
            className="scan-line bg-blue-400 absolute top-0 
        transtition-all duration-300 ease-in-out "
          >
            <div className="line"></div>
          </div>
        )}
        <BarcodeScannerComponent delay={1000} width={500} height={500} onUpdate={scanHandler} />
        <div className="p-4 relative">
          <div className="w-full flex flex-col items-center justify-center absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 "></div>
          <div className={`mt-5 ${data === "Not Found" ? "text-red-500" : "text-green-700"}`}>
            <p>{data}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default BarcodeScannerFragment;
