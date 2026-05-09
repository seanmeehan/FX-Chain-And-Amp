import SliderParameters from "../audioModulesAndComponents/sliderParameters.js";
import ButtonSwitch from "../audioModulesAndComponents/buttonSwitch.js";
import ChebyshevDistortionFXModule from "../fxModuleObjectConstructors/chebydistortionFXModule.js";

// FX Module Setup
const chebyshevDistortionModule = document.getElementById(
  "chebydistortion-module"
);

// slider constructor: (id, min, max, step, value, label, moduleContainer)
const chebyshevDistortionValue = new SliderParameters(
  "order",
  2,
  50,
  1,
  5,
  "order",
  chebyshevDistortionModule
);

const chebyshevDistortionToneBoost = new SliderParameters(
  "midGain",
  0,
  30,
  0.01,
  0,
  "tone",
  chebyshevDistortionModule
);

const chebyshevDistortionGain = new SliderParameters(
  "outputGain",
  0.01,
  10,
  0.01,
  0.3,
  "level",
  chebyshevDistortionModule
);

// ChebyshevDistortionFXModule constructor: id, title, colour, inputGain, order, lowGain, midGain, highGain, lowFrequencyThreshold, highFrequencyThreshold, outputGain, wetDryMix
const chebyshevDistortionFX = new ChebyshevDistortionFXModule(
  "chebydistortion-module",
  "cheby",
  "slategray",
  1,
  chebyshevDistortionValue.value,
  0.1,
  chebyshevDistortionToneBoost.value,
  0.3,
  50,
  3500,
  chebyshevDistortionGain.value,
  1
);

chebyshevDistortionValue.sliderElement.addEventListener("input", () => {
  chebyshevDistortionFX.setParameter("order", chebyshevDistortionValue.value);
});

chebyshevDistortionToneBoost.sliderElement.addEventListener("input", () => {
  chebyshevDistortionFX.setParameter(
    "midGain",
    chebyshevDistortionToneBoost.value
  );
});

chebyshevDistortionGain.sliderElement.addEventListener("input", () => {
  chebyshevDistortionFX.setParameter(
    "outputGain",
    chebyshevDistortionGain.value
  );
});

// button constructor: (callback, module)
// const is calling the constructor from the buttonSwitch.js file
const chebyshevDistortionSwitch = new ButtonSwitch((state) => {
  if (!state) {
    chebyshevDistortionFX.disconnect();
  } else {
    //
  }
}, chebyshevDistortionModule);

export { chebyshevDistortionFX, chebyshevDistortionSwitch };
