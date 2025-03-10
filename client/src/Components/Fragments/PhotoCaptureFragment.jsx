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
    <div className="relative h-screen bg-white overflow-hidden">
      {!imgSrc ? (
        <>
          <div className="absolute top-4 left-4 z-10">
            <button className="p-2 bg-gray-800 bg-opacity-50 text-white rounded-full" onClick={onCancel}>
              <IoArrowBack size={24} />
            </button>
          </div>

          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className={`w-full h-full object-cover ${isPortrait ? "aspect-[9/16]" : "aspect-[16/9]"}`} videoConstraints={videoConstraints} />

          <div className={`absolute ${isPortrait ? "bottom-24 right-6" : "right-10 top-1/2 -translate-y-1/2"} flex ${isPortrait ? "flex-row" : "flex-col"} gap-6`}>
            <button className="w-14 h-14 bg-gray-800 bg-opacity-50 text-white rounded-full flex items-center justify-center" onClick={toggleTorch}>
              {isFlashOn ? <MdFlashOn size={28} /> : <MdFlashOff size={28} />}
            </button>
          </div>
          <div className={`absolute ${isPortrait ? "bottom-20 left-1/2 -translate-x-1/2" : "right-10 top-1/2 -translate-y-1/2"} flex ${isPortrait ? "flex-row" : "flex-col"} gap-6`}>
            <button className="w-20 h-20 bg-transparent border-4 border-white rounded-full relative" onClick={capture}>
              <div className="absolute inset-3 bg-white rounded-full"></div>
            </button>
          </div>
        </>
      ) : (
        <div className="h-screen flex flex-col justify-between bg-slate-900 relative overflow-hidden">
          <div className="flex-1 overflow-hidden p-4">
            <img src={imgSrc} alt="captured" className="w-full h-full object-contain rounded-lg" />
          </div>

          <div className={`fixed bottom-0 left-0 right-0 ${isPortrait ? "p-6 bg-gradient-to-t from-slate-900 to-transparent" : "p-4"}`}>
            <div className={`max-w-md mx-auto flex gap-3 ${isPortrait ? "flex-row" : "justify-center"}`}>
              <Button buttonStyle={`flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl ${isPortrait ? "py-4 text-base font-medium" : "px-6 py-3"} transition-all duration-200 shadow-lg`} onClick={retake}>
                Retake
              </Button>
              <Button buttonStyle={`flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl ${isPortrait ? "py-4 text-base font-medium" : "px-6 py-3"} transition-all duration-200 shadow-lg`} onClick={handleSubmit}>
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
