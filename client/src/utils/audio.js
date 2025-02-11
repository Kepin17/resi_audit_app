export const playSound = (type) => {
  const audio = new Audio(`/sounds/${type}.mp3`);
  audio.play().catch((error) => {
    console.error("Error playing sound:", error);
  });
};

export const playSuccessSound = () => playSound("acc");
export const playErrorSound = () => playSound("error");
