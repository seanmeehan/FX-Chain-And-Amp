// Import Modules
import Meter from "./modules/audioModulesAndComponents/meterModule.js";
import { fxModules, fxButtons } from "./modules.js";
import { generateToneForGuitarist, getApiKey, setApiKey, getModel, setModel } from "./aiToneGenerator.js";

// Audio Context Setup
Tone.context.lookAhead = 0;
Tone.context.updateInterval = 0.01;
Tone.context.bufferSize = 128;

// Audio Source Setup
const monoSignal = new Tone.Mono();
const destination = Tone.getDestination();
const audioSourceGain = new Tone.Gain();
// Master volume in dB (user controllable) feeds into a brick-wall limiter
// before the destination. Starts at -40 dB - barely audible - so a fresh
// page load can never be loud, even with feedback. User slides up to play.
const masterVolume = new Tone.Volume(-40);
const masterLimiter = new Tone.Limiter(-3);
masterVolume.connect(masterLimiter);
masterLimiter.connect(destination);

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

const PEDAL_CATEGORIES = [
  ["Dynamics, Pitch & Filters", ["volume-module", "pitchshifter-module", "compressor-module", "autowah-module"]],
  ["Gain & Distortion", ["trebleboost-module", "distortion-module", "distortion-module-2", "bitcrusher-module", "chebydistortion-module", "fuzz-module"]],
  ["Modulation", ["chorus-module", "phaser-module", "tremolo-module", "vibrato-module"]],
  ["Delay & Reverb", ["delay-module", "pingpong-delay-module", "reverb-module", "jcreverb-module"]],
];

function openPicker() {
  pedalPickerList.innerHTML = "";
  const pooled = new Set([...pedalPool.querySelectorAll(".fx-module")].map((t) => t.id));
  if (pooled.size === 0) {
    const empty = document.createElement("div");
    empty.style.color = "#888";
    empty.textContent = "All pedals are on the board.";
    pedalPickerList.appendChild(empty);
  } else {
    PEDAL_CATEGORIES.forEach(([label, ids]) => {
      const inThisCategory = ids.filter((id) => pooled.has(id));
      if (inThisCategory.length === 0) return;
      const header = document.createElement("div");
      header.className = "pedal-picker-category";
      header.textContent = label;
      pedalPickerList.appendChild(header);
      inThisCategory.forEach((id) => {
        const tile = document.getElementById(id);
        const titleEl = tile.querySelector("h2");
        const itemLabel = titleEl ? titleEl.textContent : id;
        const btn = document.createElement("button");
        btn.className = "pedal-picker-item";
        btn.textContent = itemLabel;
        btn.addEventListener("click", () => {
          moduleContainer.insertBefore(tile, addPedalTile);
          closePicker();
          rebuildChain();
        });
        pedalPickerList.appendChild(btn);
      });
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

// === Presets =================================================================
const PRESET_STORAGE_KEY = "fxchain_presets_v1";

// Built-in presets - loaded from assets/presets/builtin.json on startup so new
// presets can be added by editing data only (no code changes). The fetch URL
// is the only thing to swap when this moves behind a real API later.
const BUILTIN_PRESETS_URL = "./assets/presets/builtin.json";
let BUILTIN_PRESETS = {};

async function loadBuiltinPresets() {
  try {
    const res = await fetch(BUILTIN_PRESETS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();
    BUILTIN_PRESETS = {};
    list.forEach((p) => {
      const { name, ...preset } = p;
      if (name) BUILTIN_PRESETS[name] = preset;
    });
  } catch (e) {
    console.warn("Could not load built-in presets:", e);
  }
  refreshPresetSelect();
}

function getPedalState(tile) {
  const sliders = [...tile.querySelectorAll(".slider-section .slider")].map((s) => parseFloat(s.value));
  const entry = fxById[tile.id];
  return { id: tile.id, on: entry ? entry.button.on : false, sliders };
}

function getCurrentPreset() {
  const pedals = [];
  document.querySelectorAll(".module-container .fx-module:not(.fx-module-add)").forEach((tile) => {
    pedals.push(getPedalState(tile));
  });
  // Capture amp IR by display name (e.g. "Allure_64_A30_G12") so presets stay
  // portable even if the underlying download URL changes.
  const ampSelect = document.getElementById("amp-type");
  const selected = ampSelect.options[ampSelect.selectedIndex];
  const ampType = selected && selected.value ? selected.textContent : "";
  return { pedals, ampOn: ampButton.on, ampType };
}

function applyAmpType(ampTypeName, attemptsLeft = 20) {
  if (!ampTypeName) return;
  const ampSelect = document.getElementById("amp-type");
  const match = [...ampSelect.options].find((o) => o.textContent === ampTypeName && o.value);
  if (match) {
    ampSelect.value = match.value;
    ampSelect.dispatchEvent(new Event("change"));
  } else if (attemptsLeft > 0) {
    // IR list loads async from GitHub API; retry briefly if not yet populated
    setTimeout(() => applyAmpType(ampTypeName, attemptsLeft - 1), 200);
  } else {
    console.warn(`Amp IR "${ampTypeName}" not found in dropdown`);
  }
}

function applyPreset(preset) {
  if (!preset || !Array.isArray(preset.pedals)) return;
  // Move all current pedals back to pool
  document.querySelectorAll(".module-container .fx-module:not(.fx-module-add)").forEach((tile) => {
    const entry = fxById[tile.id];
    if (entry && entry.button.on) entry.button.button.click();
    pedalPool.appendChild(tile);
  });
  // Add pedals from preset in order
  preset.pedals.forEach((p) => {
    const tile = document.getElementById(p.id);
    if (!tile) return;
    moduleContainer.insertBefore(tile, addPedalTile);
    const sliders = tile.querySelectorAll(".slider-section .slider");
    (p.sliders || []).forEach((v, i) => {
      if (sliders[i]) {
        sliders[i].value = v;
        sliders[i].dispatchEvent(new Event("input"));
      }
    });
    const entry = fxById[p.id];
    if (entry && entry.button.on !== !!p.on) entry.button.button.click();
  });
  if (ampButton.on !== !!preset.ampOn) ampButton.button.click();
  if (preset.ampType) applyAmpType(preset.ampType);
  rebuildChain();
}

function loadPresetsMap() {
  try {
    return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePresetsMap(map) {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(map));
}

function refreshPresetSelect() {
  const select = document.getElementById("load-preset");
  const presets = loadPresetsMap();
  const builtinNames = Object.keys(BUILTIN_PRESETS);
  const userNames = Object.keys(presets).sort();
  const builtinOpts = builtinNames.map((n) => `<option value="builtin:${encodeURIComponent(n)}">${n}</option>`).join("");
  const userOpts = userNames.map((n) => `<option value="${encodeURIComponent(n)}">${n}</option>`).join("");
  select.innerHTML = '<option value="">Load preset…</option>' + builtinOpts + userOpts;
}

document.getElementById("save-preset").addEventListener("click", () => {
  const name = prompt("Name this preset:");
  if (!name) return;
  const presets = loadPresetsMap();
  presets[name] = getCurrentPreset();
  savePresetsMap(presets);
  refreshPresetSelect();
  document.getElementById("load-preset").value = encodeURIComponent(name);
});

document.getElementById("load-preset").addEventListener("change", (e) => {
  const val = e.target.value;
  if (!val) return;
  if (val.startsWith("builtin:")) {
    const name = decodeURIComponent(val.slice("builtin:".length));
    if (BUILTIN_PRESETS[name]) applyPreset(BUILTIN_PRESETS[name]);
    return;
  }
  const name = decodeURIComponent(val);
  const presets = loadPresetsMap();
  if (presets[name]) applyPreset(presets[name]);
});

document.getElementById("delete-preset").addEventListener("click", () => {
  const select = document.getElementById("load-preset");
  const val = select.value;
  if (!val || val.startsWith("builtin:")) return alert("Pick a saved preset to delete (built-ins can't be deleted).");
  const name = decodeURIComponent(val);
  if (!confirm(`Delete preset "${name}"?`)) return;
  const presets = loadPresetsMap();
  delete presets[name];
  savePresetsMap(presets);
  refreshPresetSelect();
});

document.getElementById("share-preset").addEventListener("click", async () => {
  const json = JSON.stringify(getCurrentPreset());
  const encoded = btoa(unescape(encodeURIComponent(json)));
  const url = `${location.origin}${location.pathname}#preset=${encoded}`;
  try {
    await navigator.clipboard.writeText(url);
    alert("Share link copied to clipboard!");
  } catch {
    prompt("Copy this URL:", url);
  }
});

// Export the current preset as a JSON entry ready to paste into
// assets/presets/builtin.json — so AI-generated or manually-tuned tones can be
// promoted to shipped built-ins for everyone (like ★ Rory Gallagher / ★ Blos).
function formatBuiltinJson(name, preset) {
  const pedalsStr = preset.pedals
    .map((p) => `      { "id": ${JSON.stringify(p.id)}, "on": ${!!p.on}, "sliders": [${p.sliders.join(", ")}] }`)
    .join(",\n");
  return `  {
    "name": ${JSON.stringify(name)},
    "pedals": [
${pedalsStr}
    ],
    "ampOn": ${!!preset.ampOn},
    "ampType": ${JSON.stringify(preset.ampType || "")}
  }`;
}

document.getElementById("export-builtin").addEventListener("click", async () => {
  const rawName = prompt("Name this preset (a ★ prefix is added automatically if missing):");
  if (!rawName) return;
  const name = rawName.trim().startsWith("★") ? rawName.trim() : `★ ${rawName.trim()}`;
  const snippet = formatBuiltinJson(name, getCurrentPreset());
  try {
    await navigator.clipboard.writeText(snippet);
    alert(`Copied! Add this entry to the array in assets/presets/builtin.json (don't forget a comma after the previous entry):\n\n${snippet}`);
  } catch {
    prompt("Add this entry to the array in assets/presets/builtin.json:", snippet);
  }
});

// Auto-apply preset from URL hash if present
function applyHashPreset() {
  const m = location.hash.match(/preset=([^&]+)/);
  if (!m) return;
  try {
    const json = decodeURIComponent(escape(atob(m[1])));
    applyPreset(JSON.parse(json));
  } catch (e) {
    console.warn("Failed to load preset from URL:", e);
  }
}

refreshPresetSelect();
loadBuiltinPresets();
applyHashPreset();

// === Tap Tempo ===============================================================
const tapButton = document.getElementById("tap-tempo");
const tapDisplay = document.getElementById("tap-tempo-display");
let tapTimes = [];

function setDelayTime(seconds) {
  // Clamp to delay slider ranges (delay 0.1-1, pingpong 0.1-1 typical)
  const clamped = Math.max(0.05, Math.min(1.5, seconds));
  ["delay-module", "pingpong-delay-module"].forEach((id) => {
    const tile = document.getElementById(id);
    if (!tile) return;
    const firstSlider = tile.querySelector(".slider-section .slider");
    if (!firstSlider) return;
    const max = parseFloat(firstSlider.max);
    firstSlider.value = Math.min(clamped, max);
    firstSlider.dispatchEvent(new Event("input"));
  });
}

tapButton.addEventListener("click", () => {
  const now = Date.now();
  // Reset if last tap was more than 2 seconds ago
  if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > 2000) tapTimes = [];
  tapTimes.push(now);
  if (tapTimes.length > 8) tapTimes.shift();
  if (tapTimes.length < 2) {
    tapDisplay.textContent = "tap again…";
    return;
  }
  // Average interval
  let total = 0;
  for (let i = 1; i < tapTimes.length; i++) total += tapTimes[i] - tapTimes[i - 1];
  const avgMs = total / (tapTimes.length - 1);
  const seconds = avgMs / 1000;
  const bpm = Math.round(60000 / avgMs);
  tapDisplay.textContent = `${bpm} BPM (${seconds.toFixed(2)}s)`;
  setDelayTime(seconds);
});

// === Tuner ===================================================================
// Pitch detection via autocorrelation on the raw mic input (pre-FX).
const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const tunerAnalyserSize = 2048;
const tunerAnalyser = Tone.context.createAnalyser();
tunerAnalyser.fftSize = tunerAnalyserSize;
const tunerBuf = new Float32Array(tunerAnalyserSize);
// Boost the signal feeding the tuner so quiet mic sources still register.
// Doesn't affect what you hear — this branch is analysis-only.
const tunerBoost = new Tone.Gain(8);
audioSourceGain.connect(tunerBoost);
Tone.connect(tunerBoost, tunerAnalyser);

const tunerNoteEl = document.getElementById("tuner-note");
const tunerCentsEl = document.getElementById("tuner-cents");
const tunerNeedleEl = document.getElementById("tuner-needle");

function autoCorrelate(buf, sampleRate) {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.003) return -1; // too quiet

  // Trim silence at the edges. Threshold scales with the actual signal level
  // so a quiet-but-clean signal isn't trimmed away entirely.
  const trimThres = Math.max(0.05, rms * 0.5);
  let r1 = 0;
  let r2 = SIZE - 1;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < trimThres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < trimThres) { r2 = SIZE - i; break; }
  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) c[i] += buf[j] * buf[j + i];
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  if (T0 <= 0) return -1;

  const x1 = c[T0 - 1] || 0;
  const x2 = c[T0];
  const x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

function noteFromPitch(frequency) {
  return Math.round(12 * (Math.log(frequency / 440) / Math.log(2))) + 69;
}

function freqFromNote(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function centsOff(frequency, note) {
  return Math.floor((1200 * Math.log(frequency / freqFromNote(note))) / Math.log(2));
}

function updateTuner() {
  tunerAnalyser.getFloatTimeDomainData(tunerBuf);
  const freq = autoCorrelate(tunerBuf, Tone.context.sampleRate);

  if (freq === -1) {
    tunerNoteEl.textContent = "--";
    tunerCentsEl.textContent = "— Hz";
    tunerNeedleEl.style.left = "50%";
    tunerNeedleEl.style.background = "#888";
  } else {
    const note = noteFromPitch(freq);
    const cents = centsOff(freq, note);
    const noteName = NOTE_STRINGS[note % 12];
    const octave = Math.floor(note / 12) - 1;
    tunerNoteEl.textContent = `${noteName}${octave}`;
    tunerCentsEl.textContent = `${freq.toFixed(1)} Hz · ${cents > 0 ? "+" : ""}${cents}¢`;
    // Map -50..+50 cents to 0..100% on the meter
    const pct = Math.max(0, Math.min(100, 50 + cents));
    tunerNeedleEl.style.left = `${pct}%`;
    const absCents = Math.abs(cents);
    tunerNeedleEl.style.background = absCents < 5 ? "#2ecc71" : absCents < 15 ? "#f1c40f" : "#e74c3c";
  }
  requestAnimationFrame(updateTuner);
}
requestAnimationFrame(updateTuner);

// === On-screen keyboard / synth =============================================
// PluckSynth (Karplus-Strong physical model) wrapped in a PolySynth for chords.
// Produces a plucked-string tone that sounds like an electric guitar once it
// hits the FX chain (especially distortion + amp IR).
const synth = new Tone.PolySynth(Tone.PluckSynth, {
  attackNoise: 1,
  dampening: 4000,
  resonance: 0.95,
  volume: -6,
});
synth.connect(audioSourceGain);

const keyboardEl = document.getElementById("keyboard");
const keyboardToggle = document.getElementById("keyboard-toggle");
const octaveLabel = document.getElementById("keyboard-octave-label");
let keyboardOctave = 4;
let keyboardVisible = false;

// Two-octave layout starting at keyboardOctave. 14 white keys, 10 black keys.
const WHITE_PATTERN = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_PATTERN = [
  { name: "C#", afterWhiteIndex: 0 },
  { name: "D#", afterWhiteIndex: 1 },
  { name: "F#", afterWhiteIndex: 3 },
  { name: "G#", afterWhiteIndex: 4 },
  { name: "A#", afterWhiteIndex: 5 },
];
const KEY_LABEL_WHITE = ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "↵", "↑", "↑"];
const KEY_LABEL_BLACK_FIRST_OCT = ["W", "E", "T", "Y", "U"];
const KEY_LABEL_BLACK_SECOND_OCT = ["O", "P", "]", "", ""]; // limited

function buildKeyboard() {
  keyboardEl.innerHTML = "";
  const containerWidth = keyboardEl.clientWidth || 740;
  const numWhitesPerOct = 7;
  const totalWhites = numWhitesPerOct * 2;
  const whiteW = containerWidth / totalWhites;
  const blackW = whiteW * 0.6;

  for (let oct = 0; oct < 2; oct++) {
    WHITE_PATTERN.forEach((noteName, i) => {
      const idx = oct * numWhitesPerOct + i;
      const note = `${noteName}${keyboardOctave + oct}`;
      const key = document.createElement("div");
      key.className = "kbd-key kbd-white";
      key.dataset.note = note;
      key.style.left = `${idx * whiteW}px`;
      key.style.width = `${whiteW}px`;
      key.textContent = oct === 0 ? KEY_LABEL_WHITE[i] : "";
      attachKeyHandlers(key, note);
      keyboardEl.appendChild(key);
    });
    BLACK_PATTERN.forEach((b, i) => {
      const whiteIdx = oct * numWhitesPerOct + b.afterWhiteIndex;
      const note = `${b.name}${keyboardOctave + oct}`;
      const key = document.createElement("div");
      key.className = "kbd-key kbd-black";
      key.dataset.note = note;
      key.style.left = `${(whiteIdx + 1) * whiteW - blackW / 2}px`;
      key.style.width = `${blackW}px`;
      key.textContent = oct === 0 ? KEY_LABEL_BLACK_FIRST_OCT[i] || "" : "";
      attachKeyHandlers(key, note);
      keyboardEl.appendChild(key);
    });
  }
  octaveLabel.textContent = `C${keyboardOctave}–C${keyboardOctave + 2}`;
}

function attachKeyHandlers(el, note) {
  const start = (e) => { e.preventDefault(); attackNote(note); };
  const end = (e) => { e.preventDefault(); releaseNote(note); };
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", end);
  el.addEventListener("mouseleave", (e) => { if (heldNotes.has(note)) end(e); });
  el.addEventListener("touchstart", start, { passive: false });
  el.addEventListener("touchend", end, { passive: false });
}

const heldKeys = new Set();
const heldNotes = new Set();

function attackNote(note) {
  if (heldNotes.has(note)) return;
  heldNotes.add(note);
  synth.triggerAttack(note);
  document.querySelectorAll(`.kbd-key[data-note="${note}"]`).forEach((k) => k.classList.add("active"));
}

function releaseNote(note) {
  if (!heldNotes.has(note)) return;
  heldNotes.delete(note);
  synth.triggerRelease(note);
  document.querySelectorAll(`.kbd-key[data-note="${note}"]`).forEach((k) => k.classList.remove("active"));
}

// QWERTY mapping: lowercase keys → semitone offset from C of keyboardOctave
const KEY_TO_SEMITONE = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12,
  o: 13, l: 14, p: 15, ";": 16, "'": 17,
};

function semitoneToNote(semi) {
  const noteIndex = ((semi % 12) + 12) % 12;
  const oct = keyboardOctave + Math.floor(semi / 12);
  return `${NOTE_STRINGS[noteIndex]}${oct}`;
}

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === "z") { changeOctave(-1); return; }
  if (k === "x") { changeOctave(1); return; }
  if (KEY_TO_SEMITONE[k] !== undefined && !heldKeys.has(k)) {
    heldKeys.add(k);
    attackNote(semitoneToNote(KEY_TO_SEMITONE[k]));
  }
});

document.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (KEY_TO_SEMITONE[k] !== undefined && heldKeys.has(k)) {
    heldKeys.delete(k);
    releaseNote(semitoneToNote(KEY_TO_SEMITONE[k]));
  }
});

function changeOctave(delta) {
  keyboardOctave = Math.max(1, Math.min(7, keyboardOctave + delta));
  // Release all currently held notes (their note names are now stale)
  [...heldNotes].forEach((n) => releaseNote(n));
  heldKeys.clear();
  if (keyboardVisible) buildKeyboard();
  octaveLabel.textContent = `C${keyboardOctave}–C${keyboardOctave + 2}`;
}

document.getElementById("keyboard-octave-down").addEventListener("click", () => changeOctave(-1));
document.getElementById("keyboard-octave-up").addEventListener("click", () => changeOctave(1));

function setKeyboardVisible(visible) {
  keyboardVisible = visible;
  keyboardEl.style.display = visible ? "block" : "none";
  keyboardToggle.style.background = visible ? "#16a085" : "#27ae60";
  if (visible) buildKeyboard();
}

keyboardToggle.addEventListener("click", () => {
  setKeyboardVisible(!keyboardVisible);
});

window.addEventListener("resize", () => { if (keyboardVisible) buildKeyboard(); });


// Main function
let currentStream = null;
let currentSourceNode = null;

async function setInputDevice(deviceId) {
  // Tear down any existing mic stream
  if (currentSourceNode) {
    try { currentSourceNode.disconnect(); } catch {}
    currentSourceNode = null;
  }
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }

  // Keyboard mode: no mic, show the piano automatically
  if (deviceId === "__keyboard__") {
    setKeyboardVisible(true);
    return;
  }

  // Otherwise: mic mode, hide the keyboard
  setKeyboardVisible(false);
  try {
    const constraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    };
    if (deviceId) constraints.audio.deviceId = { exact: deviceId };
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("Mic stream opened:", currentStream.getAudioTracks().map((t) => t.label));
    currentSourceNode = Tone.context.createMediaStreamSource(currentStream);
    Tone.connect(currentSourceNode, audioSourceGain);
    // Permission was just granted - refresh the dropdown so device labels populate
    populateInputDevices();
  } catch (error) {
    console.error("Failed to open audio source:", error);
  }
}

async function populateInputDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === "audioinput");
    const select = document.getElementById("input-device");
    const currentLabel = currentStream && currentStream.getAudioTracks()[0] ? currentStream.getAudioTracks()[0].label : "";
    select.innerHTML = '<option value="">(default mic)</option>' + inputs.map((d) => `<option value="${d.deviceId}">${d.label || "Unknown device"}</option>`).join("") + '<option value="__keyboard__">🎹 Keyboard / Synth (no mic)</option>';
    // Highlight current device
    const match = inputs.find((d) => d.label === currentLabel);
    if (match) select.value = match.deviceId;
  } catch (e) {
    console.warn("Could not enumerate devices:", e);
  }
}

document.getElementById("input-device").addEventListener("change", async (e) => {
  await setInputDevice(e.target.value || null);
});

const masterVolumeSlider = document.getElementById("master-volume");
const masterVolumeDisplay = document.getElementById("master-volume-display");
masterVolumeSlider.addEventListener("input", () => {
  const v = parseFloat(masterVolumeSlider.value);
  masterVolume.volume.value = v;
  masterVolumeDisplay.textContent = `${v.toFixed(0)} dB`;
});

navigator.mediaDevices.addEventListener("devicechange", populateInputDevices);

// Wire up audio chain immediately — no user gesture needed for connects.
// Tone.start() (which resumes the AudioContext) is called on first interaction.
audioSourceGain.connect(monoSignal);
monoSignal.connect(inputMeter.input);
inputMeter.output.connect(outputMeter.input);
outputMeter.output.connect(masterVolume);

document.addEventListener("click", async () => {
  await Tone.start();
  await setInputDevice("__keyboard__");
  await populateInputDevices();
  document.getElementById("input-device").value = "__keyboard__";
}, { once: true });

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

// === AI Tone Generator =======================================================
const aiGenerateBtn = document.getElementById("ai-generate-btn");
const aiGuitaristInput = document.getElementById("ai-guitarist-input");
const aiStatus = document.getElementById("ai-status");
const aiSettingsDialog = document.getElementById("ai-settings-dialog");

function setAiStatus(msg, isError = false) {
  aiStatus.textContent = msg;
  aiStatus.style.color = isError ? "#e74c3c" : "#888";
}

aiGuitaristInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") aiGenerateBtn.click();
});

aiGenerateBtn.addEventListener("click", async () => {
  const name = aiGuitaristInput.value.trim();
  if (!name) return;

  aiGenerateBtn.disabled = true;
  setAiStatus("Generating…");

  try {
    const preset = await generateToneForGuitarist(name);
    applyPreset(preset);
    setAiStatus(`✓ ${name} tone loaded`);
  } catch (err) {
    if (err.message === "NO_API_KEY") {
      aiSettingsDialog.showModal();
      setAiStatus("Enter your API key first", true);
    } else {
      setAiStatus(`Error: ${err.message}`, true);
    }
  } finally {
    aiGenerateBtn.disabled = false;
  }
});
