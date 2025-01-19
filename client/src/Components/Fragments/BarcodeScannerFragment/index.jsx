import React, { useEffect, useState } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import Button from "../../Elements/Button";
import "./scan.css";
import { FaCamera } from "react-icons/fa";

const BarcodeScannerFragment = () => {
  const [data, setData] = useState("");
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (!scanning) {
      window.location.reload();
    }
  });
  return (
    <>
      <div className="relative ">
        {scanning && (
          <div
            className="scan-line bg-blue-400 absolute top-0 
        transtition-all duration-300 ease-in-out "
          >
            <div className="line"></div>
          </div>
        )}
        <BarcodeScannerComponent
          delay={1000}
          width={500}
          height={500}
          onUpdate={(err, result) => {
            if (result) {
              setData(result.text);
              setScanning(false);
            } else {
              setData("Not Found");
              setScanning(true);
            }
          }}
        />
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
