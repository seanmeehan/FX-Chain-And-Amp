const STORAGE_KEY_API = "anthropic_api_key";
const STORAGE_KEY_MODEL = "anthropic_model";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const VALID_MODULE_IDS = new Set([
  "volume-module", "pitchshifter-module", "compressor-module", "autowah-module",
  "trebleboost-module", "distortion-module", "distortion-module-2", "bitcrusher-module",
  "chebydistortion-module", "fuzz-module", "chorus-module", "phaser-module",
  "tremolo-module", "vibrato-module", "delay-module", "pingpong-delay-module",
  "reverb-module", "jcreverb-module",
]);

const SYSTEM_PROMPT = `You are a guitar tone expert. Given a guitarist's name, you output a JSON preset for a browser-based guitar effects app.

AVAILABLE MODULES (use only these IDs, in any order):
- volume-module: [volume (-50→0, default 0)]
- pitchshifter-module: [pitch (-12→12 semitones, default 0)]
- compressor-module: [input (0→20, default 5), threshold (-70→-10 dB, default -24)]
- autowah-module: [baseFrequency (5→30, default 10), gain (0.01→10, default 2), sensitivity (-100→-10, default -20)]
- trebleboost-module: [overdrive (0→41, default 0.5), tone (-15→15, default 0), level (0.01→10, default 0.3)]
- distortion-module: [distortion (0→35, default 0.5), tone (-20→26.5, default 0), level (0.01→10, default 0.3)]
- distortion-module-2: [distortion (0→46.5, default 3), output (0→20, default 0.3)]
- bitcrusher-module: [gain (0.01→20, default 3), bits (1→8, default 4), tone (-10→10, default 0)]
- chebydistortion-module: [order (2→50, default 5), tone (0→30, default 0), level (0.01→10, default 0.3)]
- fuzz-module: [distortion (0.5→30, default 1.5), tone (-20→26.5, default 0), bits (2→8, default 3)]
- chorus-module: [rate (0.1→10, default 5), delay (0.1→1, default 0.5), depth (0→1, default 0.5)]
- phaser-module: [depth (3→10, default 6), rate (0.1→10, default 3)]
- tremolo-module: [rate (0.1→10, default 5), depth (0→1, default 0.5)]
- vibrato-module: [depth (0→1, default 0.5), rate (0.1→10, default 5)]
- delay-module: [delayTime (0.1→1s, default 0.5), feedback (0→1, default 0.5), mix (0→1, default 0.5)]
- pingpong-delay-module: [delayTime (0.1→1s, default 0.5), feedback (0→1, default 0.5), mix (0→1, default 0.5)]
- reverb-module: [decay (0.1→10s, default 5), preDelay (0.1→1s, default 0.5), mix (0→1, default 0.5)]
- jcreverb-module: [roomSize (0.1→1, default 0.5), mix (0→1, default 0.5)]

AVAILABLE AMPS (choose one, or set ampOn: false for no amp):
- Allure_59_Tweed_P10N — vintage Fender Tweed (warm, clean, bluesy)
- Allure_64_A30_G12 — Vox AC30 (chime, jangle, Beatles/British Invasion)
- Allure_64_USDeluxe_P12N — Fender Deluxe (clean American twang)
- Allure_67_Brit_Greenback — Marshall (classic rock crunch, British)
- Allure_70s_WhoWatt_100 — Hiwatt (loud, punchy, clean headroom)
- Allure_90s_Cali_V30 — Mesa Boogie (high-gain, modern metal/rock)

OUTPUT FORMAT — respond with ONLY a raw JSON object, no markdown, no explanation:
{
  "pedals": [
    { "id": "module-id", "on": true, "sliders": [value1, value2, ...] }
  ],
  "ampOn": true,
  "ampType": "Allure_67_Brit_Greenback"
}

RULES:
- sliders array must have exactly the right number of values for each module (matching the parameter count above)
- All slider values must be within the specified min→max range
- Include 2–6 pedals that authentically represent the guitarist's signature tone
- Pick the amp model that best matches the guitarist's real rig
- on: true for pedals that should be active, false for ones that are present but bypassed

EXAMPLES:

Rory Gallagher:
{"pedals":[{"id":"compressor-module","on":true,"sliders":[5,-25]},{"id":"trebleboost-module","on":true,"sliders":[10,6,1]},{"id":"delay-module","on":true,"sliders":[0.15,0.2,0.25]},{"id":"jcreverb-module","on":true,"sliders":[0.4,0.2]}],"ampOn":true,"ampType":"Allure_64_A30_G12"}

Blos (Pop-Punk):
{"pedals":[{"id":"compressor-module","on":true,"sliders":[8,-30]},{"id":"distortion-module","on":true,"sliders":[20,-3,1]},{"id":"jcreverb-module","on":true,"sliders":[0.5,0.15]}],"ampOn":true,"ampType":"Allure_67_Brit_Greenback"}`;

export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY_API) || "";
}

export function setApiKey(key) {
  localStorage.setItem(STORAGE_KEY_API, key.trim());
}

export function getModel() {
  return localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
}

export function setModel(model) {
  localStorage.setItem(STORAGE_KEY_MODEL, model);
}

export async function generateToneForGuitarist(name) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Generate a guitar tone preset for: ${name}` }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";

  // Strip markdown fences if Claude wraps in ```json ... ```
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  let preset;
  try {
    preset = JSON.parse(cleaned);
  } catch {
    throw new Error("Claude returned invalid JSON");
  }

  if (!Array.isArray(preset.pedals)) throw new Error("Invalid preset: missing pedals array");

  // Filter out any hallucinated module IDs so they don't crash applyPreset
  preset.pedals = preset.pedals.filter((p) => VALID_MODULE_IDS.has(p.id));

  return preset;
}
