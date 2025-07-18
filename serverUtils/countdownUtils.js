import { broadcast } from "./WsUtils.js";
import { forceStartGame } from "./gameUtils.js";

let hasStartedC = false;
export let waitInterval = null;
export let startInterval = null;


function startGameInten() {
  let timeLeft = 10;
  hasStartedC = "true";
  clearInterval(startInterval); // prevent duplicates

  startInterval = setInterval(() => {
    broadcast("countdown", { phase: "start", time: timeLeft });
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

  if (startInterval !== null || waitInterval !== null) return;
  let timeLeft = 20;

  clearInterval(waitInterval); // prevent duplicates

  waitInterval = setInterval(() => {
    broadcast("countdown", { phase: "wait", time: timeLeft });
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
  }
  if (startInterval) {
    hasStartedC = false;
    clearInterval(startInterval);
    startInterval = null;
  }

  broadcast("stopped");
}

export function startGameC() {
  if (!waitInterval) return
  startGameInten();
}

export function changeHsStr(f) {
  hasStartedC = f;
}

export function getHasStartedC() {
  return hasStartedC;
}