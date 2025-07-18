import { broadcast } from "./WsUtils.js";
import { forceStartGame } from "./gameUtils.js";

export let waitInterval = null;
export let startInterval = null;


function startGameInten() {
  let timeLeft = 10;

  clearInterval(startInterval); // prevent duplicates

  startInterval = setInterval(() => {
    broadcast("countdown", { phase: "start", time: timeLeft });
    console.log(`Game start countdown: ${timeLeft}`);

    timeLeft--;

    if (timeLeft < 0) {
      clearInterval(startInterval);
      startInterval = null;

      console.log("Starting game...");
      forceStartGame();
    }
  }, 1000);
}

export function startWait() {

  if (startInterval !== null) return;
  let timeLeft = 20;

  clearInterval(waitInterval); // prevent duplicates

  waitInterval = setInterval(() => {
    broadcast("countdown", { phase: "wait", time: timeLeft });
    console.log(`Wait countdown: ${timeLeft}`);

    timeLeft--;

    if (timeLeft < 0) {
      clearInterval(waitInterval);
      waitInterval = null;

      startGameInten();
    }
  }, 1000);
}

export function cancelAllCountdowns() {
  if (waitInterval) {
    clearInterval(waitInterval);
    waitInterval = null;
    console.log("cleared wait interval");
  }
  if (startInterval) {
    clearInterval(startInterval);
    startInterval = null;
    console.log("cleared start interval");
  }

  broadcast("stopped");
}

export function startGameC() {
  if (!waitInterval) return
  startGameInten();
}