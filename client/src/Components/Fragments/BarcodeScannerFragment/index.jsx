import React from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import "./scan.css";

const BarcodeScannerFragment = ({ scanning, dataScan, scanHandler }) => {
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
        <BarcodeScannerComponent delay={1000} width={"100%"} height={"100%"} onUpdate={scanHandler} />
        <div className="p-4 relative">
          <div className="w-full flex flex-col items-center justify-center absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 "></div>
          <div className={`mt-5 ${dataScan === "Not Found" ? "text-red-500" : "text-green-700"}`}>
            <p>{dataScan}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default BarcodeScannerFragment;
