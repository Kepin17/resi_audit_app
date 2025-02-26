import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import Button from "../Elements/Button";
import { MdFlashOn, MdFlashOff } from "react-icons/md";
import { IoArrowBack } from "react-icons/io5";

const PhotoCaptureFragment = ({ onPhotoCapture, onCancel }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  };

  const handleSubmit = () => {
    onPhotoCapture({ photo: imgSrc });
    setImgSrc(null);
  };

  const retake = () => {
    setImgSrc(null);
  };

  const videoConstraints = {
    width: 1920,
    height: 1080,
    facingMode: "environment",
    screenshotQuality: 1,
  };

  const toggleTorch = () => {
    const track = webcamRef.current.video.srcObject.getVideoTracks()[0];
    track.applyConstraints({
      advanced: [{ torch: !isFlashOn }],
    });
    setIsFlashOn(!isFlashOn);
  };

  return (
    <div className="relative  bg-black overflow-hidden">
      {!imgSrc ? (
        <>
          <div className="absolute top-4 left-4 z-10">
            <button className="p-2 bg-gray-800 bg-opacity-50 text-white rounded-full" onClick={onCancel}>
              <IoArrowBack size={24} />
            </button>
          </div>

          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full object-cover" videoConstraints={videoConstraints} />

          <div className={`absolute ${isPortrait ? "bottom-12 right-0 -translate-x-1/2 flex-row" : "right-10  top-10 -translate-y-1/2 flex-col"} flex gap-6`}>
            <button className="w-12 h-12 bg-gray-800 bg-opacity-50 text-white rounded-full flex items-center justify-center" onClick={toggleTorch}>
              {isFlashOn ? <MdFlashOn size={24} /> : <MdFlashOff size={24} />}
            </button>
          </div>
          <div className={`absolute ${isPortrait ? "bottom-10 left-1/2 -translate-x-1/2 flex-row" : "right-10  top-52 -translate-y-1/2 flex-col"} flex gap-6`}>
            <button className="w-16 h-16 bg-transparent border-4 border-white rounded-full relative" onClick={capture}>
              <div className="absolute inset-2 bg-white rounded-full"></div>
            </button>
          </div>
        </>
      ) : (
        <div className="h-[80vh] flex flex-col justify-between p-4 bg-slate-900 relative overflow-hidden">
          <img src={imgSrc} alt="captured" className="w-full h-auto rounded-lg" />

          <div className={`fixed bottom-0 left-0 right-0 flex ${isPortrait ? "p-4 pb-8 bg-slate-800 bg-opacity-80" : ""} z-50`}>
            <div className={`w-full flex ${isPortrait ? "justify-between gap-4" : "absolute bottom-0 left-1/2 -translate-x-1/2 items-center justify-between gap-4"}`}>
              <Button buttonStyle={`bg-yellow-500 hover:bg-yellow-600 text-white ${isPortrait ? "py-4 text-lg font-medium" : "w-32 h-32"} rounded-lg w-full`} onClick={retake}>
                Retake
              </Button>
              <Button buttonStyle={`bg-green-500 hover:bg-green-600 text-white ${isPortrait ? "py-4 text-lg font-medium" : "w-32 h-32"} rounded-lg w-full`} onClick={handleSubmit}>
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoCaptureFragment;
