import SliderParameters from "../audioModulesAndComponents/sliderParameters.js";
import ButtonSwitch from "../audioModulesAndComponents/buttonSwitch.js";
import DistortionFXModule from "../fxModuleObjectConstructors/distortionFXModule.js";

// FX Module Setup
// based on a typical tube screamer circuit
// https://www.electrosmash.com/tube-screamer-analysis
const trebleboostModule = document.getElementById("trebleboost-module");
// slider constructor: (id, min, max, step, value, label, moduleContainer)
const trebleboostValue = new SliderParameters(
  "distortion",
  0,
  41,
  0.01,
  0.5,
  "overdrive",
  trebleboostModule
);
const trebleboostTreble = new SliderParameters(
  "highGain",
  -15,
  15,
  0.01,
  0,
  "tone",
  trebleboostModule
);
const trebleboostGain = new SliderParameters(
  "outputGain",
  0.01,
  10,
  0.01,
  0.3,
  "level",
  trebleboostModule
);

// DistortionFXModule constructor: (id, title, colour, inputGain, distortionAmount, lowGain, midGain, highGain, lowFrequencyThreshold, highFrequencyThreshold, outputGain, wetDryMix)
const trebleboostFX = new DistortionFXModule(
  "trebleboost-module",
  "treble boost",
  "green",
  0.5,
  trebleboostValue.value,
  0,
  0.5,
  trebleboostTreble.value,
  720,
  10000,
  trebleboostGain.value,
  1
);

trebleboostValue.sliderElement.addEventListener("input", () => {
  trebleboostFX.setParameter("distortion", trebleboostValue.value);
});

trebleboostTreble.sliderElement.addEventListener("input", () => {
  trebleboostFX.setParameter("highGain", trebleboostTreble.value);
});

trebleboostGain.sliderElement.addEventListener("input", () => {
  trebleboostFX.setParameter("outputGain", trebleboostGain.value);
});

// button constructor: (callback, module)
// const is calling the constructor from the buttonSwitch.js file
const trebleboostSwitch = new ButtonSwitch((state) => {
  if (!state) {
    // console.log(trebleboostSwitch.on, "trebleboostSwitch", trebleboostFX.title, "off");
    trebleboostFX.disconnect();
  } else {
    // console.log(trebleboostSwitch.on, "trebleboostSwitch", trebleboostFX.title, "on");
  }
}, trebleboostModule);

export { trebleboostFX, trebleboostSwitch };