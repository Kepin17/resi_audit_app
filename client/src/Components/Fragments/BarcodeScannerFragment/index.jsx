import { Form, Input, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { BarcodeOutlined } from "@ant-design/icons";
import axios from "axios";
import urlApi from "../../../utils/url";
import { jwtDecode } from "jwt-decode";

const BarcodeScannerFragment = ({ scanning, scanHandler, dataScan, isError }) => {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [barcode, setBarcode] = useState("");
  const scanTimeoutRef = useRef(null);
  const [toggleType, setToggleType] = useState("");
  const [getRole, setGetRole] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decode = jwtDecode(token);
    setGetRole(decode.roles);
  }, []);

  useEffect(() => {
    axios
      .get(`${urlApi}/api/v1/config`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setToggleType(res.data.auto_scan[0].config_value);
        console.log(res.data.auto_scan[0].config_value);
      })
      .catch((err) => {
        message.error({ content: err.response.data.message, key: "error" });
      });
  });

  useEffect(() => {
    if (inputRef.current && scanning) {
      inputRef.current.focus();
      setBarcode("");
    }
  }, [scanning]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Submit the barcode data
  const submitBarcode = (code) => {
    if (code && scanHandler) {
      scanHandler(null, { text: code.trim() });
      setBarcode("");
    }
  };

  const handleBarcodeInput = (e) => {
    const value = e.target.value;
    setBarcode(value);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    if (value && (e.nativeEvent.inputType === "insertLineBreak" || e.nativeEvent.keyCode === 13)) {
      submitBarcode(value);
      return;
    }

    if (toggleType === "nyala") {
      if (value) {
        scanTimeoutRef.current = setTimeout(() => {
          submitBarcode(value);
        }, 30);
      }
    }
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && barcode) {
      submitBarcode(barcode);
      e.preventDefault();
    }
  };

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      setIsFocused(true);
    }
  };

  return (
    <div className="flex justify-center w-full p-4">
      <div className="w-full max-w-[600px] p-6 md:px-10 bg-white rounded-2xl shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all cursor-pointer border border-gray-200" onClick={focusInput}>
        <Form.Item label={<span className="text-gray-800 font-bold text-sm tracking-wider uppercase block mb-2">SCAN BARCODE</span>}>
          <div className={`flex items-center bg-gray-50 rounded-xl border ${isFocused ? "border-blue-500 shadow-blue-100 shadow-lg" : "border-gray-200"} p-2 transition-all relative overflow-hidden`}>
            <BarcodeOutlined className="text-blue-500 text-xl mr-3" />
            <Input
              id="barcode"
              ref={inputRef}
              value={barcode}
              onChange={handleBarcodeInput}
              onKeyPress={handleKeyPress}
              className="bg-transparent border-none shadow-none text-gray-700 h-[50px] text-lg w-full tracking-wide focus:ring-0"
              placeholder="Ready to scan..."
              tabIndex="0"
              autoFocus
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onPaste={toggleType === "nyala" ? (e) => e.preventDefault() : null}
              autoComplete="off"
            />
          </div>
          <div className="flex items-center mt-3 text-gray-600 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2.5 animate-pulse"></div>
            <span>{scanning ? "Position barcode in front of scanner" : "Processing..."}</span>
          </div>
          {dataScan && (
            <div className={`mt-3 p-2 px-3 rounded-lg ${isError ? "bg-red-50 border-l-4 border-red-500 text-gray-700" : "bg-blue-50 border-l-4 border-blue-500 text-blue-700"} animate-fadeIn`}>
              <p>Last scan: {dataScan}</p>
            </div>
          )}
        </Form.Item>
      </div>
    </div>
  );
};

export default BarcodeScannerFragment;
