let currentAudio = null;

export const playSound = (type) => {
  // Stop previous audio if it exists and is playing
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  const audio = new Audio(`/audios/${type}.mp3`);
  currentAudio = audio;

  audio.play().catch((error) => {
    console.error("Error playing sound:", error);
  });
};

export const stopSound = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
};
export const playSuccessSound = () => {
  playSound("acc");
  setTimeout(() => {
    stopSound();
  }, 2000);
};
export const playErrorSound = () => {
  playSound("error");
  setTimeout(() => {
    stopSound();
  }, 2000);
};
