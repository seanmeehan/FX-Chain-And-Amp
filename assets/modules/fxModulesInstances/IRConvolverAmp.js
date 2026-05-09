import SliderParameters from "../audioModulesAndComponents/sliderParameters.js";
import ButtonSwitch from "../audioModulesAndComponents/buttonSwitch.js";
import ConvolverAmpModule from "../audioModulesAndComponents/IRConvolverAmpModule.js";

// FX Module Setup
const IRConvolverAmpModuleContainer = document.getElementById("amp-container");
const IRConvolverAmpPowerContainer = document.getElementById("power-container");
// GitHub API path to the amp IRs
const basePath =
  "https://api.github.com/repos/blosmusic/fx-chain/contents/assets/ampIRs";
//   "https://api.github.com/repos/blosmusic/ir-convolver-amp/contents/assets/ampIRs";

// slider constructor: (id, min, max, step, value, label, moduleContainer)
const IRConvolverAmpInputGain = new SliderParameters(
  "input",
  0,
  20,
  0.01,
  5,
  "pre-gain",
  IRConvolverAmpModuleContainer
);

const IRConvolverAmpLowGain = new SliderParameters(
  "lowGain",
  -10,
  10,
  0.01,
  -0.1,
  "low",
  IRConvolverAmpModuleContainer
);

const IRConvolverAmpMidGain = new SliderParameters(
  "midGain",
  -10,
  10,
  0.01,
  -2,
  "mid",
  IRConvolverAmpModuleContainer
);

const IRConvolverAmpHighGain = new SliderParameters(
  "highGain",
  -10,
  10,
  0.01,
  0.5,
  "high",
  IRConvolverAmpModuleContainer
);

const IRConvolverAmpOutputGain = new SliderParameters(
  "postgain",
  0,
  5,
  0.01,
  1.5,
  "post-gain",
  IRConvolverAmpModuleContainer
);

const IRConvolverAmpVolume = new SliderParameters(
  "output",
  -30,
  30,
  0.01,
  -6,
  "volume",
  IRConvolverAmpModuleContainer
);

// IRConvolverAmpModule constructor: (basePath, inputGain, lowGain, midGain, highGain, lowFrequencyThreshold, highFrequencyThreshold, outputGain, volume)
const IRConvolverAmp = new ConvolverAmpModule(
  basePath,
  IRConvolverAmpInputGain.value,
  IRConvolverAmpLowGain.value,
  IRConvolverAmpMidGain.value,
  IRConvolverAmpHighGain.value,
  280,
  3000,
  IRConvolverAmpOutputGain.value,
  IRConvolverAmpVolume.value
);

IRConvolverAmpInputGain.sliderElement.addEventListener("input", () => {
  IRConvolverAmp.setParameter("input", IRConvolverAmpInputGain.value);
});

IRConvolverAmpLowGain.sliderElement.addEventListener("input", () => {
  IRConvolverAmp.setParameter("lowGain", IRConvolverAmpLowGain.value);
});

IRConvolverAmpMidGain.sliderElement.addEventListener("input", () => {
  IRConvolverAmp.setParameter("midGain", IRConvolverAmpMidGain.value);
});

IRConvolverAmpHighGain.sliderElement.addEventListener("input", () => {
  IRConvolverAmp.setParameter("highGain", IRConvolverAmpHighGain.value);
});

IRConvolverAmpOutputGain.sliderElement.addEventListener("input", () => {
  IRConvolverAmp.setParameter("postgain", IRConvolverAmpOutputGain.value);
});

IRConvolverAmpVolume.sliderElement.addEventListener("input", () => {
  IRConvolverAmp.setParameter("volume", IRConvolverAmpVolume.value);
});

// button constructor: (callback, module)
// const is calling the constructor from the buttonSwitch.js file
const IRConvolverAmpPowerSwitch = new ButtonSwitch((state) => {
  if (!state) {
    IRConvolverAmp.disconnect();
  } else {
    //
  }
}, IRConvolverAmpPowerContainer);

export { IRConvolverAmp, IRConvolverAmpPowerSwitch };
