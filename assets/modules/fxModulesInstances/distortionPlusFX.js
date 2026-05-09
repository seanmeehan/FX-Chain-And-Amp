import SliderParameters from "../audioModulesAndComponents/sliderParameters.js";
import ButtonSwitch from "../audioModulesAndComponents/buttonSwitch.js";
import DistortionFXModule from "../fxModuleObjectConstructors/distortionFXModule.js";

// FX Module Setup 2
// based on a mxr distortion+ circuit
// https://www.electrosmash.com/mxr-distortion-plus-analysis
const distortionModule2 = document.getElementById("distortion-module-2");

// slider constructor: (id, min, max, step, value, label, moduleContainer)
const distortionValue2 = new SliderParameters(
  "distortion",
  0,
  46.5,
  0.01,
  3,
  "distortion",
  distortionModule2
);

const distortionGain2 = new SliderParameters(
  "outputGain",
  0,
  20,
  0.01,
  0.3,
  "output",
  distortionModule2
);

// DistortionFXModule constructor: (id, title, colour, inputGain, distortionAmount, lowGain, midGain, highGain, lowFrequencyThreshold, highFrequencyThreshold, outputGain, wetDryMix)
const distortionFX2 = new DistortionFXModule(
  "distortion-module-2",
  "distortion +",
  "yellow",
  0.5,
  distortionValue2.value,
  0.1,
  4,
  3,
  300,
  10000,
  distortionGain2.value,
  1
);

distortionValue2.sliderElement.addEventListener("input", () => {
  distortionFX2.setParameter("distortion", distortionValue2.value);
});

distortionGain2.sliderElement.addEventListener("input", () => {
  distortionFX2.setParameter("outputGain", distortionGain2.value);
});

const distortionSwitch2 = new ButtonSwitch((state) => {
  if (!state) {
    // console.log(distortionSwitch2.on, "distortionSwitch2", distortionFX2.title, "off");
    distortionFX2.disconnect();
    // fxModules.pop(distortionFX2);
  } else {
    // console.log(distortionSwitch2.on, "distortionSwitch2", distortionFX2.title, "on");
  }
}, distortionModule2);

export { distortionFX2, distortionSwitch2 };