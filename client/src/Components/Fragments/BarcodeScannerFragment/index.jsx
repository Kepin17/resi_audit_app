import React, { useState } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import Button from "../../Elements/Button";
import "./scan.css";
import { FaCamera } from "react-icons/fa";

const BarcodeScannerFragment = () => {
  const [data, setData] = useState("Not found!");

  const sendDataHandler = () => {
    console.log(data);
  };

  return (
    <>
      <div className="relative ">
        <div
          className={`scan-line bg-blue-400 absolute top-0 
        transtition-all duration-300 ease-in-out `}
        >
          <div className="line"></div>
        </div>
        <BarcodeScannerComponent
          delay={1000}
          width={500}
          height={500}
          onUpdate={(err, result) => {
            if (result) setData(result.text);
            else setData("Not Found");
          }}
        />
        <div className="p-4 relative">
          <div className="w-full flex flex-col items-center justify-center absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ">
            <Button
              buttonStyle="w-24 h-12 rounded-md flex items-center justify-center
            bg-orange-500 text-white hover:bg-orange-600 text-2xl
            "
              onClick={sendDataHandler}
            >
              <FaCamera />
            </Button>
          </div>
          <p className="mt-5">{data}</p>
        </div>
      </div>
    </>
  );
};

export default BarcodeScannerFragment;
