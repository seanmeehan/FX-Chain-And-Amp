import SliderParameters from "../audioModulesAndComponents/sliderParameters.js";
import ButtonSwitch from "../audioModulesAndComponents/buttonSwitch.js";
import DistortionFXModule from "../fxModuleObjectConstructors/distortionFXModule.js";

// FX Module Setup
// based on a typical ds-1 circuit
// https://www.electrosmash.com/boss-ds1-analysis
const distortionModule = document.getElementById("distortion-module");

// slider constructor: (id, min, max, step, value, label, moduleContainer)
const distortionValue = new SliderParameters(
  "distortion",
  0,
  35,
  0.01,
  0.5,
  "distortion",
  distortionModule
);
const distortionToneBoost = new SliderParameters(
  "midGain",
  -20,
  26.5,
  0.01,
  0,
  "tone",
  distortionModule
);
const distortionGain = new SliderParameters(
  "outputGain",
  0.01,
  10,
  0.01,
  0.3,
  "level",
  distortionModule
);

// DistortionFXModule constructor: (id, title, colour, inputGain, distortionAmount, lowGain, midGain, highGain, lowFrequencyThreshold, highFrequencyThreshold, outputGain, wetDryMix)
const distortionFX = new DistortionFXModule(
  "distortion-module",
  "distortion",
  "orange",
  1,
  distortionValue.value,
  0.1,
  distortionToneBoost.value,
  0.3,
  3000,
  10000,
  distortionGain.value,
  1
);

distortionValue.sliderElement.addEventListener("input", () => {
  distortionFX.setParameter("distortion", distortionValue.value);
});

distortionToneBoost.sliderElement.addEventListener("input", () => {
  distortionFX.setParameter("midGain", distortionToneBoost.value);
});

distortionGain.sliderElement.addEventListener("input", () => {
  distortionFX.setParameter("outputGain", distortionGain.value);
});

// button constructor: (callback, module)
// const is calling the constructor from the buttonSwitch.js file
const distortionSwitch = new ButtonSwitch((state) => {
  if (!state) {
    // console.log(distortionSwitch.on, "distortionSwitch", distortionFX.title, "off");
    distortionFX.disconnect();
    // fxModules.pop(distortionFX);
  } else {
    // console.log(distortionSwitch.on, "distortionSwitch", distortionFX.title, "on");
  }
}, distortionModule);

export { distortionFX, distortionSwitch };
