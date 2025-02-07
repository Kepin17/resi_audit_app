import React, { useState, useRef } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const FotoScannerFragment = () => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);

  const capture = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    const token = localStorage.getItem("token");
    const decodeToken = jwtDecode(token);
    const user = decodeToken.id_pekerja;
    console.log("User:", user);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/v1/auditResi",
        {
          resi_id: "PLACEHOLDER_FOR_SCANNED_TEXT", // Replace with actual OCR result
          id_pekerja: user,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      console.log("API Response:", response.data);
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full max-w-md" />
      <button onClick={capture} className="bg-blue-500 text-white px-4 py-2 rounded">
        Capture Photo
      </button>
      {capturedImage && <img src={capturedImage} alt="Captured" className="w-full max-w-md mt-4" />}
    </div>
  );
};

export default FotoScannerFragment;
