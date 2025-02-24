import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";
import { MdFlashOn, MdFlashOff } from "react-icons/md";
import { BsQrCodeScan } from "react-icons/bs";
import { FaBarcode } from "react-icons/fa";

const BarcodeScannerFragment = ({ scanHandler, scanning, dataScan }) => {
  const videoRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const codeReaderRef = useRef(null);
  const [flashlight, setFlashlight] = useState(false);
  const streamRef = useRef(null);
  const [showResult, setShowResult] = useState(false);
  const [barcodeFormat, setBarcodeFormat] = useState("QR_CODE");
  const scanningRef = useRef(scanning);
  const lastResultRef = useRef("");
  const scanTimeoutRef = useRef(null);

  const formats = {
    QR_CODE: {
      name: "QR Code",
      icon: <BsQrCodeScan size={20} />,
      format: BarcodeFormat.QR_CODE,
    },
    CODE_128: {
      name: "Code 128",
      icon: <FaBarcode size={20} />,
      format: BarcodeFormat.CODE_128,
    },
    EAN_13: {
      name: "EAN-13",
      icon: <FaBarcode size={20} />,
      format: BarcodeFormat.EAN_13,
    },
    ALL: {
      name: "All Formats",
      icon: <FaBarcode size={20} />,
      format: null,
    },
  };

  const videoConstraints = {
    width: 1920,
    height: 1080,
    frameRate: { ideal: 30 },
    aspectRatio: { ideal: 16 / 9 },
    facingMode: "environment",
  };

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();

    const initializeCamera = async () => {
      try {
        const devices = await codeReaderRef.current.listVideoInputDevices();
        setCameras(devices);
        if (devices.length > 0) {
          const backCameraIndex = devices.findIndex(
            (device) =>
              device.label.toLowerCase().includes("back") || device.label.toLowerCase().includes("rear") || (device.getCapabilities && device.getCapabilities().facingMode && device.getCapabilities().facingMode.includes("environment"))
          );

          const initialIndex = backCameraIndex >= 0 ? backCameraIndex : 0;
          setCurrentCameraIndex(initialIndex);
          startScanning(devices[initialIndex].deviceId);
        }
      } catch (err) {
        console.error("Failed to initialize camera:", err);
        scanHandler(err, null);
      }
    };

    initializeCamera();

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const toggleFlashlight = async () => {
    try {
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        const capabilities = track.getCapabilities();

        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !flashlight }],
          });
          setFlashlight(!flashlight);
        }
      }
    } catch (err) {
      console.error("Flashlight not supported:", err);
    }
  };

  const startScanning = async (deviceId) => {
    if (codeReaderRef.current) {
      try {
        // Stop existing streams
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        // Create new reader with format hints and improved settings
        codeReaderRef.current = new BrowserMultiFormatReader();

        // Optimize hints for better performance
        const hints = new Map();
        if (barcodeFormat !== "ALL") {
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [formats[barcodeFormat].format]);
        }
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");
        hints.set(DecodeHintType.ASSUME_GS1, false);
        hints.set(DecodeHintType.PURE_BARCODE, true);
        codeReaderRef.current.hints = hints;

        // Get stream with constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...videoConstraints,
            deviceId: { exact: deviceId },
            advanced: [{ torch: flashlight }, { autoExposureMode: true }, { focusMode: "continuous" }, { whiteBalanceMode: "continuous" }],
          },
        });
        streamRef.current = stream;

        // Set video source
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
        }

        let lastScanTime = 0;
        const SCAN_INTERVAL = 200; // Minimum time between scans in ms

        // Start decoding
        await codeReaderRef.current.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, err) => {
            const now = Date.now();
            if (result && scanning && now - lastScanTime > SCAN_INTERVAL) {
              lastScanTime = now;
              const newResult = result.getText();

              // Prevent duplicate scans within 2 seconds
              if (newResult !== lastResultRef.current) {
                lastResultRef.current = newResult;
                setShowResult(true);
                scanHandler(null, result);

                // Clear existing timeout
                if (scanTimeoutRef.current) {
                  clearTimeout(scanTimeoutRef.current);
                }

                // Set new timeout
                scanTimeoutRef.current = setTimeout(() => {
                  setShowResult(false);
                  lastResultRef.current = "";
                }, 2000);
              }
            }

            if (err && err.name !== "NotFoundException") {
              scanHandler(err, null);
            }
          },
          {
            fastBlur: true,
            tryHarder: true,
            readerId: deviceId,
          }
        );
      } catch (error) {
        console.error("Error starting camera:", error);
        scanHandler(error, null);
      }
    }
  };

  const switchCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const newIndex = (currentCameraIndex + 1) % cameras.length;
      setCurrentCameraIndex(newIndex);

      await new Promise((resolve) => setTimeout(resolve, 100));
      await startScanning(cameras[newIndex].deviceId);
    } catch (error) {
      console.error("Error switching camera:", error);
    }
  };

  const switchFormat = async () => {
    const formatKeys = Object.keys(formats);
    const currentIndex = formatKeys.indexOf(barcodeFormat);
    const nextIndex = (currentIndex + 1) % formatKeys.length;
    setBarcodeFormat(formatKeys[nextIndex]);

    if (streamRef.current) {
      const currentDeviceId = cameras[currentCameraIndex].deviceId;
      await startScanning(currentDeviceId);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  return (
    <div className="flex flex-col items-center w-full h-screen bg-black">
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: "none" }} // Prevent auto-rotation
          playsInline // Prevent rotation on iOS
        />

        {/* Format indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <button onClick={switchFormat} className="flex items-center gap-2 text-white/90 text-sm font-medium">
            {formats[barcodeFormat].icon}
            <span>{formats[barcodeFormat].name}</span>
          </button>
        </div>

        {/* Scanning overlay with dynamic border color */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full flex items-center justify-center">
            <div className={`w-64 h-64 border-2 ${barcodeFormat === "QR_CODE" ? "border-blue-500/50" : "border-green-500/50"} rounded-lg flex items-center justify-center`}>{formats[barcodeFormat].icon}</div>
          </div>
        </div>

        {/* Camera controls */}
        <div className="absolute bottom-20 right-4 flex flex-col gap-4">
          <button onClick={toggleFlashlight} className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all" title="Toggle Flashlight">
            {flashlight ? <MdFlashOn size={24} /> : <MdFlashOff size={24} />}
          </button>
        </div>

        {/* Scan result popup */}
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 transition-all duration-300 ${showResult ? "opacity-100 transform scale-100" : "opacity-0 transform scale-95"}`}>
          <div className="bg-black/80 backdrop-blur-sm px-6 py-4 rounded-xl border border-white/20">
            <h3 className="text-white text-lg font-medium mb-2">Scanned Result</h3>
            <p className="text-white/90 font-mono bg-white/10 px-4 py-2 rounded">{dataScan || "No result"}</p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute bottom-4 left-0 right-0 text-center flex flex-col items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${scanning ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <p className="text-white/80 text-sm">{scanning ? `Scanning ${formats[barcodeFormat].name}` : "Scanner paused"}</p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerFragment;
