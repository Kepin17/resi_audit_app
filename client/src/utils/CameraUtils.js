/**
 * Camera and device detection utilities
 */

/**
 * Checks if the device is iOS
 * @returns {boolean}
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

/**
 * Checks if the device is Android
 * @returns {boolean}
 */
export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Checks if the device is a mobile device
 * @returns {boolean}
 */
export const isMobile = () => {
  return isIOS() || isAndroid();
};

/**
 * Gets the best camera for scanning based on device capabilities
 * @param {MediaDeviceInfo[]} cameras - List of available cameras
 * @returns {MediaDeviceInfo} The best camera for scanning
 */
export const getBestCamera = (cameras) => {
  if (!cameras || cameras.length === 0) return null;
  
  // Look for back camera
  const backCamera = cameras.find(
    camera => 
      camera.label.toLowerCase().includes('back') || 
      camera.label.toLowerCase().includes('rear')
  );
  
  if (backCamera) return backCamera;
  
  // If no explicit back camera, try to guess based on capabilities
  // (This is a best-effort approach as not all browsers expose capabilities)
  try {
    for (const camera of cameras) {
      if (camera.getCapabilities && 
          camera.getCapabilities().facingMode && 
          camera.getCapabilities().facingMode.includes('environment')) {
        return camera;
      }
    }
  } catch (e) {
    console.log('Could not determine camera capabilities:', e);
  }
  
  // Fall back to the first camera
  return cameras[0];
};

/**
 * Attempts to fix common camera issues
 * @param {MediaStream} stream - The camera stream to fix
 */
export const fixCameraIssues = async (stream) => {
  if (!stream) return;
  
  try {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    // Apply fixes for iOS devices
    if (isIOS()) {
      // Focus issues on iOS
      await videoTrack.applyConstraints({
        advanced: [
          { autoFocus: "continuous" }
        ]
      });
    }
    
    // Apply fixes for Android devices
    if (isAndroid()) {
      // Sharpness and focus can help with scanning
      await videoTrack.applyConstraints({
        advanced: [
          { autoFocus: "continuous" },
          { focusMode: "continuous" },
          { focusDistance: 0.5 },
          { whiteBalanceMode: "continuous" }
        ]
      });
    }
  } catch (err) {
    console.warn('Could not apply camera fixes:', err);
  }
};

/**
 * Checks if the browser supports the required features for scanning
 * @returns {Object} Object containing support status for various features
 */
export const checkBrowserSupport = () => {
  return {
    mediaDevices: !!navigator.mediaDevices,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    enumerateDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
    constraints: !!(window.MediaStreamConstraints),
    imageCapture: !!window.ImageCapture
  };
};

/**
 * Get optimal camera constraints based on device
 * @returns {Object} Constraints object for getUserMedia
 */
export const getOptimalConstraints = () => {
  const base = {
    width: { min: 1280, ideal: 1920, max: 2560 },
    height: { min: 720, ideal: 1080, max: 1440 },
    aspectRatio: { ideal: 16/9 },
    facingMode: { ideal: "environment" },
  };
  
  // Add device-specific adjustments
  if (isIOS()) {
    return {
      ...base,
      frameRate: { max: 30, ideal: 24 }, // iOS sometimes struggles with high framerates
    };
  }
  
  if (isAndroid()) {
    return {
      ...base,
      frameRate: { min: 15, ideal: 30 }, // Higher framerates on Android for better scanning
    };
  }
  
  // Default for other devices
  return {
    ...base,
    frameRate: { ideal: 30 },
  };
};
