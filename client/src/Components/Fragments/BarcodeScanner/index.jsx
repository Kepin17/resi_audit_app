import React, { useState } from "react";

import BarcodeScannerComponent from "react-qr-barcode-scanner";
import Button from "../../Elements/Button";

const BarcodeScanner = () => {
  const [data, setData] = useState("Not Found");

  const sendDataHandler = () => {
    console.log(data);
  };

  return (
    <>
      <BarcodeScannerComponent
        width={500}
        height={500}
        onUpdate={(err, result) => {
          if (result) setData(result.text);
          else setData("Not Found");
        }}
      />
      <Button onClick={sendDataHandler}>Send Data</Button>
    </>
  );
};

export default BarcodeScanner;
