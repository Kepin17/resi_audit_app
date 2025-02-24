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
    <div className="relative h-screen bg-black">
      {!imgSrc ? (
        <>
          <div className="absolute top-4 left-4 z-10">
            <button className="p-2 bg-gray-800 bg-opacity-50 text-white rounded-full" onClick={onCancel}>
              <IoArrowBack size={24} />
            </button>
          </div>

          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="h-screen w-full object-cover" videoConstraints={videoConstraints} />

          <div className={`absolute ${isPortrait ? "bottom-28 left-1/2 -translate-x-1/2 flex-row" : "right-10  top-40 -translate-y-1/2 flex-col"} flex gap-6`}>
            <button className="w-12 h-12 bg-gray-800 bg-opacity-50 text-white rounded-full flex items-center justify-center" onClick={toggleTorch}>
              {isFlashOn ? <MdFlashOn size={24} /> : <MdFlashOff size={24} />}
            </button>

            <button className="w-16 h-16 bg-transparent border-4 border-white rounded-full relative" onClick={capture}>
              <div className="absolute inset-2 bg-white rounded-full"></div>
            </button>
          </div>
        </>
      ) : (
        <div className="h-screen flex flex-col justify-between p-4 bg-white">
          <img src={imgSrc} alt="captured" className="w-full h-auto rounded-lg" />
          <div className="flex items-center justify-between gap-4 mt-4">
            <Button buttonStyle="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg w-full" onClick={retake}>
              Retake
            </Button>
            <Button buttonStyle="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg w-full" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoCaptureFragment;
