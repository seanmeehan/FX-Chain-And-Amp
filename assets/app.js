// Import Modules
import Meter from "./modules/audioModulesAndComponents/meterModule.js";
import { fxModules, fxButtons } from "./modules.js";

// Audio Context Setup
Tone.context.lookAhead = 0;
Tone.context.updateInterval = 0.01;
Tone.context.bufferSize = 128;

// Audio Source Setup
const monoSignal = new Tone.Mono();
const destination = Tone.getDestination();
const audioSourceGain = new Tone.Gain();

// Meter Setup
const inputMeter = new Meter(-100, 0, "input-meter", "input-db-value");
const outputMeter = new Meter(-100, 0, "output-meter", "output-db-value");

// Amp is the last entry in fxModules/fxButtons (see modules.js)
const ampModule = fxModules[fxModules.length - 1];
const ampButton = fxButtons[fxButtons.length - 1];

// Build id -> { module, button } lookup for the reorderable pedals
const fxById = {};
for (let i = 0; i < fxModules.length - 1; i++) {
  fxById[fxModules[i].id] = { module: fxModules[i], button: fxButtons[i] };
}

function rebuildChain() {
  inputMeter.output.disconnect();
  fxModules.forEach((m) => m.output.disconnect());

  let last = inputMeter;
  document.querySelectorAll(".module-container .fx-module").forEach((el) => {
    const entry = fxById[el.id];
    if (entry && entry.button.on) {
      last.output.connect(entry.module.input);
      last = entry.module;
    }
  });
  if (ampButton.on) {
    last.output.connect(ampModule.input);
    last = ampModule;
  }
  last.output.connect(outputMeter.input);
}

fxButtons.forEach((button) => {
  button.button.addEventListener("click", rebuildChain);
});

// Drag-and-drop reordering
const moduleContainer = document.querySelector(".module-container");
const pedalPool = document.getElementById("pedal-pool");
const addPedalTile = document.getElementById("add-pedal");
const pedalPicker = document.getElementById("pedal-picker");
const pedalPickerList = document.getElementById("pedal-picker-list");
const pedalPickerClose = document.getElementById("pedal-picker-close");

if (moduleContainer && window.Sortable) {
  Sortable.create(moduleContainer, {
    animation: 150,
    ghostClass: "fx-module-dragging",
    filter: ".fx-module-add",
    onEnd: rebuildChain,
  });
}

// Move every real FX tile into the hidden pool, leaving only the "+" on the board.
// Add a remove button to each tile so users can take it off the board later.
moduleContainer.querySelectorAll(".fx-module:not(.fx-module-add)").forEach((tile) => {
  const removeBtn = document.createElement("button");
  removeBtn.className = "fx-module-remove";
  removeBtn.textContent = "×";
  removeBtn.title = "Remove from board";
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const entry = fxById[tile.id];
    if (entry && entry.button.on) {
      entry.button.button.click(); // toggle off via existing handler (also calls rebuildChain)
    }
    pedalPool.appendChild(tile);
    rebuildChain();
  });
  tile.appendChild(removeBtn);
  pedalPool.appendChild(tile);
});

function openPicker() {
  pedalPickerList.innerHTML = "";
  const pooled = pedalPool.querySelectorAll(".fx-module");
  if (pooled.length === 0) {
    const empty = document.createElement("div");
    empty.style.color = "#888";
    empty.textContent = "All pedals are on the board.";
    pedalPickerList.appendChild(empty);
  } else {
    pooled.forEach((tile) => {
      const titleEl = tile.querySelector("h2");
      const label = titleEl ? titleEl.textContent : tile.id;
      const btn = document.createElement("button");
      btn.className = "pedal-picker-item";
      btn.textContent = label;
      btn.addEventListener("click", () => {
        moduleContainer.insertBefore(tile, addPedalTile);
        closePicker();
        rebuildChain();
      });
      pedalPickerList.appendChild(btn);
    });
  }
  pedalPicker.style.display = "block";
}

function closePicker() {
  pedalPicker.style.display = "none";
}

addPedalTile.addEventListener("click", openPicker);
pedalPickerClose.addEventListener("click", closePicker);
pedalPicker.addEventListener("click", (e) => {
  if (e.target === pedalPicker) closePicker();
});

// Initial chain (empty board, just clean passthrough)
rebuildChain();

// Main function
async function main() {
  // Start the audio context
  await Tone.start();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });
    console.log("Mic stream opened, tracks:", stream.getAudioTracks().map(t => t.label));
    const sourceNode = Tone.context.createMediaStreamSource(stream);
    Tone.connect(sourceNode, audioSourceGain);
    audioSourceGain.connect(monoSignal);
    monoSignal.connect(inputMeter.input);
    inputMeter.output.connect(outputMeter.input);
    outputMeter.output.connect(destination);
  } catch (error) {
    console.error("Failed to open audio source:", error);
  }
}

main();

// Recording
const recorder = new Tone.Recorder();
outputMeter.output.connect(recorder);

const recordButton = document.getElementById("record-button");
const recordStatus = document.getElementById("record-status");
const recordingsList = document.getElementById("recordings-list");
let isRecording = false;
let recordStartTime = 0;
let timerId = null;

recordButton.addEventListener("click", async () => {
  if (!isRecording) {
    await recorder.start();
    isRecording = true;
    recordStartTime = Date.now();
    recordButton.textContent = "■ Stop";
    recordButton.style.background = "#7f8c8d";
    timerId = setInterval(() => {
      const secs = Math.floor((Date.now() - recordStartTime) / 1000);
      recordStatus.textContent = `Recording ${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
    }, 250);
  } else {
    const blob = await recorder.stop();
    isRecording = false;
    clearInterval(timerId);
    recordButton.textContent = "● Record";
    recordButton.style.background = "#c0392b";
    recordStatus.textContent = "Idle";

    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const link = document.createElement("a");
    link.href = url;
    link.download = `fx-recording-${stamp}.webm`;
    link.textContent = `⬇ ${stamp.slice(11, 19)}`;
    link.style.cssText = "padding:4px 8px;background:#2ecc71;color:white;border-radius:4px;text-decoration:none;font-family:monospace;";
    recordingsList.appendChild(link);
  }
});
