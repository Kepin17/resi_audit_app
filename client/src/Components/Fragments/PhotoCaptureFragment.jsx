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
            <Button buttonStyle="bg-blue-500 hover:bg-blue-600 text-white px-4 py-10 rounded-lg w-full" onClick={capture}>
              Capture
            </Button>
            <Button buttonStyle="bg-red-500 hover:bg-red-600 text-white px-4 py-10 rounded-lg w-full" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <img src={imgSrc} alt="captured" className="w-full rounded-lg" />
          <div className="flex justify-between gap-2 font-bold text-lg">
            <Button buttonStyle="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-10 rounded-lg w-full" onClick={retake}>
              Retake
            </Button>
            <Button buttonStyle="bg-green-500 hover:bg-green-600 text-white px-4 py-10 rounded-lg w-full" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoCaptureFragment;
