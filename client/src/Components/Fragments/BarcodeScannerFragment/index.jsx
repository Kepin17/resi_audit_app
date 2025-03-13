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
    <div className="flex justify-center w-full p-2 sm:p-3 md:p-4 lg:p-6">
      <div onClick={focusInput} className=" w-full max-w-[95%] sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%]">
        <Form.Item label={<span className="text-gray-800 font-bold text-xs sm:text-sm tracking-wider uppercase block mb-2">SCAN BARCODE</span>}>
          <div className={`flex items-center bg-gray-50 rounded-xl border ${isFocused ? "border-blue-500 shadow-blue-100 shadow-lg" : "border-gray-200"} p-2 sm:p-3 transition-all relative overflow-hidden`}>
            <BarcodeOutlined className="text-blue-500 text-lg sm:text-xl mr-2 sm:mr-3" />
            <Input
              id="barcode"
              ref={inputRef}
              value={barcode}
              onChange={handleBarcodeInput}
              onKeyPress={handleKeyPress}
              className="bg-transparent border-none shadow-none text-gray-700 h-[40px] sm:h-[50px] text-base sm:text-lg w-full tracking-wide focus:ring-0"
              placeholder="Ready to scan..."
              tabIndex="0"
              autoFocus
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onPaste={toggleType === "nyala" ? (e) => e.preventDefault() : null}
              autoComplete="off"
            />
          </div>
          <div className="flex items-center mt-2 sm:mt-3 text-gray-600 text-xs sm:text-sm">
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-blue-500 rounded-full mr-2 sm:mr-2.5 animate-pulse"></div>
            <span>{scanning ? "Position barcode in front of scanner" : "Processing..."}</span>
          </div>
          {dataScan && (
            <div className={`mt-2 sm:mt-3 p-1.5 sm:p-2 px-2 sm:px-3 rounded-lg ${isError ? "bg-red-50 border-l-4 border-red-500 text-gray-700" : "bg-blue-50 border-l-4 border-blue-500 text-blue-700"} animate-fadeIn`}>
              <p className="text-xs sm:text-sm">Last scan: {dataScan}</p>
            </div>
          )}
        </Form.Item>
      </div>
    </div>
  );
};

export default BarcodeScannerFragment;
