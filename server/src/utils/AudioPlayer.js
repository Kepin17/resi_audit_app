const { exec } = require("child_process");
const path = require("path");

class AudioPlayer {
  constructor() {
    this.audioPath = path.join(__dirname, "../assets/audio");
  }

  play(filename) {
    const audioFile = path.join(this.audioPath, filename);

    // Using different commands based on the operating system
    const command = process.platform === "win32" ? `powershell -c (New-Object Media.SoundPlayer '${audioFile}').PlaySync()` : `play '${audioFile}'`;

    exec(command, (error) => {
      if (error) {
        console.error("Error playing audio:", error);
      }
    });
  }

  playSuccess() {
    this.play("acc.mp3");
  }

  playError() {
    this.play("error.mp3");
  }
}

module.exports = new AudioPlayer();
