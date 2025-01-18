import { CiBarcode } from "react-icons/ci";
import Button from "../../Elements/Button";
import MainLayout from "../../Layouts/MainLayout";
import React, { useState } from "react";
import BarcodeScannerFragment from "../../Fragments/BarcodeScannerFragment";

const HomePage = () => {
  const [isBarcodeActive, setIsBarcodeActive] = useState(false);
  return (
    <MainLayout>
      <div className="w-full h-16 flex items-center justify-start px-5 border-b">
        <div className="flex items-center space-x-4">
          <Button onClick={() => setIsBarcodeActive(!isBarcodeActive)}>
            <CiBarcode />
            Update Paket
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
          <div className="today-data-wrapper">{/* Content for today's data */}</div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;
