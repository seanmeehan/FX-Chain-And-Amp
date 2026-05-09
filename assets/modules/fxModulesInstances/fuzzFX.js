import SliderParameters from "../audioModulesAndComponents/sliderParameters.js";
import ButtonSwitch from "../audioModulesAndComponents/buttonSwitch.js";
import CompleteDistortionFXModule from "../fxModuleObjectConstructors/completeDistortionFXModule.js";

// FX Module Setup
const fuzzModule = document.getElementById("fuzz-module");

// slider constructor: (id, min, max, step, value, label, moduleContainer)
const distortionValue = new SliderParameters(
  "distortion",
  0.5,
  30,
  0.01,
  1.5,
  "distortion",
  fuzzModule
);

const toneBoost = new SliderParameters(
  "midGain",
  -20,
  26.5,
  0.01,
  0,
  "tone",
  fuzzModule
);

const bitsValue = new SliderParameters("bits", 2, 8, 1, 3, "bits", fuzzModule);

// FX Module Object
// CompleteDistortionFXModule constructor: (id, title, colour, inputGain, distortionAmount, bits, lowGain, midGain, highGain, lowFrequencyThreshold, highFrequencyThreshold, outputGain, wetDryMix)
const fuzzFX = new CompleteDistortionFXModule(
  "fuzz-module",
  "fuzz",
  "darkgreen",
  1,
  distortionValue.value,
  bitsValue.value,
  0.1,
  toneBoost.value,
  0.3,
  1000,
  3000,
  0.3,
  1
);

distortionValue.sliderElement.addEventListener("input", () => {
  fuzzFX.setParameter("distortion", distortionValue.value);
});

toneBoost.sliderElement.addEventListener("input", () => {
  fuzzFX.setParameter("midGain", toneBoost.value);
});

bitsValue.sliderElement.addEventListener("input", () => {
  fuzzFX.setParameter("bits", bitsValue.value);
});

// button constructor: (callback, module)
// const is calling the constructor from the buttonSwitch.js file
const fuzzSwitch = new ButtonSwitch((state) => {
  if (!state) {
    fuzzFX.disconnect();
  } else {
    //
  }
}, fuzzModule);

export { fuzzFX, fuzzSwitch };
