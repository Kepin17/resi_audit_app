let currentAudio = null;
let isLoading = false;

const loadAudio = (type) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`/audios/${type}.mp3`);
    audio.preload = "auto";

    audio.addEventListener(
      "canplaythrough",
      () => {
        resolve(audio);
      },
      { once: true }
    );

    audio.addEventListener(
      "error",
      (e) => {
        reject(new Error(`Failed to load audio: ${e.message}`));
      },
      { once: true }
    );

    audio.load();
  });
};

export const playSound = async (type) => {
  if (isLoading) return;

  try {
    isLoading = true;

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = await loadAudio(type);
    currentAudio = audio;
    await audio.play();
  } catch (error) {
    console.error("Error playing sound:", error);
  } finally {
    isLoading = false;
  }
};

export const stopSound = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
};

export const playSuccessSound = async () => {
  await playSound("acc");
  setTimeout(() => {
    stopSound();
  }, 1000);
};

export const playErrorSound = async () => {
  await playSound("error");
  setTimeout(() => {
    stopSound();
  }, 1000);
};
