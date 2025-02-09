import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import Button from "../Elements/Button";

const PhotoCaptureFragment = ({ onPhotoCapture, onCancel }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  };

  const handleSubmit = () => {
    onPhotoCapture({ photo: imgSrc });
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

  return (
    <div className="p-4 space-y-4">
      {!imgSrc ? (
        <>
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full rounded-lg" videoConstraints={videoConstraints} />
          <div className="flex justify-between gap-2 font-bold text-lg">
            <div className="relative w-full flex justify-center -top-[7rem] left-0">
              <button className=" w-20 h-20 bg-transparent border-4 border-white rounded-full relative" onClick={capture}>
                <div className="absolute  inset-2 bg-white rounded-full"></div>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4 absolute inset-0 flex flex-col justify-between items-center p-4 bg-white bg-opacity-90 rounded-lg">
          <img src={imgSrc} alt="captured" className="w-full rounded-lg" />
          <div className="flex items-center justify-between gap-2 font-bold text-lg">
            <Button buttonStyle="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-5 rounded-lg w-full" onClick={retake}>
              Retake
            </Button>
            <Button buttonStyle="bg-green-500 hover:bg-green-600 text-white px-4 py-5 rounded-lg w-full" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoCaptureFragment;
