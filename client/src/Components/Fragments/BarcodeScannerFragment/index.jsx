import { Form, Input, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { BarcodeOutlined } from "@ant-design/icons";
import "./style.css";
import axios from "axios";
import urlApi from "../../../utils/url";
import { jwtDecode } from "jwt-decode";

const BarcodeScannerFragment = ({ scanning, scanHandler, dataScan }) => {
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
    <div className="barcode-scanner-wrapper">
      <div className="barcode-scanner-container" onClick={focusInput}>
        <Form.Item label={<span className="barcode-label">SCAN BARCODE</span>}>
          <div className={`barcode-input-wrapper ${isFocused ? "active" : ""}`}>
            <BarcodeOutlined className="barcode-icon" />
            <Input
              id="barcode"
              ref={inputRef}
              value={barcode}
              onChange={handleBarcodeInput}
              onKeyPress={handleKeyPress}
              className="barcode-input"
              placeholder="Ready to scan..."
              tabIndex="0"
              autoFocus
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onPaste={toggleType === "nyala" ? (e) => e.preventDefault() : null}
              autoComplete="off"
            />
          </div>
          <div className="barcode-instructions">
            <div className="pulse-dot"></div>
            <span>{scanning ? "Position barcode in front of scanner" : "Processing..."}</span>
          </div>
          {dataScan && (
            <div className="barcode-result">
              <p>Last scan: {dataScan}</p>
            </div>
          )}
        </Form.Item>
      </div>
    </div>
  );
};

export default BarcodeScannerFragment;
