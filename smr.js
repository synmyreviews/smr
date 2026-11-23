const urlEnv = "https://api.syncmyreviews.com";

// ---------------------------------------------------------------------------
// Stage 2B — survey embed shell contract (frozen in Stage 1)
// ---------------------------------------------------------------------------
// The survey embed snippet stays TOKEN + TYPE only. Everything about HOW the
// survey appears (inline / slide-in / modal / popup, position, trigger, delay,
// frequency, post-submit behavior) is resolved at load time from, in order of
// precedence: (a) explicit data-smr-* attributes on the host div, else (b) the
// public embed-config endpoint, else (c) inline defaults. ANY failure degrades
// to inline defaults — the loader never throws and never blocks render. Theme is
// NEVER handled here; it is rendered server-side inside the funnel iframe.
const SURVEY_CHANNEL = "smrSurvey"; // postMessage channel (SurveyEmbedProtocol)
const SHELL_Z_INDEX = 2147483000; // single very-high stacking context (shell only)
const AUTO_CLOSE_AFTER_THANKS_MS = 4000;
const EXIT_INTENT_MOBILE_FALLBACK_MS = 15000;
const EMBED_CONFIG_TIMEOUT_MS = 3000;

// Closed allowlists — anything outside these coerces to the inline default.
const DISPLAY_MODES = ["inline", "slidein", "modal", "popup"];
const POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left", "center"];
const TRIGGERS = ["immediate", "delay", "scroll", "exit"];
const FREQUENCIES = ["session", "once", "every_visit"];
const POST_SUBMIT = ["show_cta", "auto_close", "auto_close_after_thanks"];
const ANIMATIONS = ["slide", "fade", "zoom", "none"];

// Hard defaults = today's inline behavior, byte-for-byte.
const EMBED_DEFAULTS = {
  display_mode: "inline",
  position: "bottom-right",
  trigger: "immediate",
  delay_seconds: 0,
  scroll_percent: 50,
  frequency: "session",
  cooldown_days: 0,
  post_submit_behavior: "show_cta",
  animation: "slide",
};

// ---------------------------------------------------------------------------
// Floating review widget: loader contract (Plans/Widgets/02 §2.1 H)
// ---------------------------------------------------------------------------
// The widget snippet stays TOKEN only. The public embed config decides inline,
// floating or none; any failure renders today's inline widget in the host div.
// The floating badge lives in a Shadow DOM on <body>; every value from the
// config is coerced against these allowlists before it reaches the DOM.
const SMR_VERSION = "2026.11";
const SMR_WIDGET_EMBED_PATH = "/api/widget-embed/";
const SMR_WIDGET_EVENTS_PATH = "/api/widget-events/";
const SMR_WIDGET_DISPLAY_MODES = ["inline", "floating", "none"];
const SMR_FLOAT_POSITIONS = ["bottom-left", "bottom-right", "top-left", "top-right", "middle-left", "middle-right"];
const SMR_FLOAT_SHOW_ON = ["all", "desktop", "mobile"];
const SMR_FLOAT_MOBILE_STYLES = ["bar", "bubble"];
const SMR_FLOAT_THEMES = ["light", "dark", "custom"];
const SMR_FLOAT_SOURCES = ["google", "facebook", "manual", "mixed"];
const SMR_FLOAT_EVENTS = ["impression", "open", "auto_open", "dismiss"];
const SMR_FLOAT_REVEAL_TRIGGERS = ["immediate", "delay", "scroll"];
const SMR_FLOAT_AUTO_OPEN_TRIGGERS = ["delay", "scroll", "exit"];
const SMR_FLOAT_Z_INDEX = SHELL_Z_INDEX - 1;
const SMR_FLOAT_MOBILE_QUERY = "(max-width: 575px)";
const SMR_PANEL_TIMEOUT_MS = 10000;
const SMR_MAX_IFRAME_HEIGHT = 100000;
const SMR_EVENT_FLUSH_MS = 10000;
const SMR_EVENT_BATCH_MAX = 8;
const SMR_RESCAN_DEBOUNCE_MS = 250;
const SMR_DRAG_THRESHOLD_PX = 6;
const SMR_SHEET_CLOSE_RATIO = 0.3;
const SMR_SHEET_FLICK_PX_PER_MS = 0.5;
const SMR_SHEET_EXPANDED_VH = 90;
const SMR_SHEET_EXPAND_PX = 48;
const SMR_FLOAT_STORAGE_PREFIX = "smr_fw_";
const SMR_PANEL_SANDBOX = "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";

// [min, max, step]; a frozen copy of WidgetPresentation::RANGES.
const SMR_FLOAT_RANGES = Object.freeze({
  offset_x: [0, 200, 1],
  offset_y: [0, 200, 1],
  mobile_sheet_height: [40, 90, 5],
  "reveal.delay_seconds": [0, 60, 1],
  "reveal.scroll_percent": [10, 100, 5],
  "auto_open.delay_seconds": [1, 120, 1],
  "auto_open.scroll_percent": [10, 100, 5],
  "auto_open.cooldown_days": [1, 365, 1],
  "dismiss.days": [1, 365, 1],
  "experiment.split": [10, 90, 10],
});
// Approximates PHP is_numeric(), so "1e9" clamps instead of parsing as 1.
const SMR_FLOAT_NUMERIC_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
const SMR_FLOAT_HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const SMR_FLOAT_PATH_RE = /^\/[A-Za-z0-9/_\-.~%*]*$/;
const SMR_FLOAT_PATH_MAX = 200;
const SMR_FLOAT_PATH_LIST_MAX = 20;
const SMR_FLOAT_LABEL_MAX = 24;
const SMR_FLOAT_STRING_MAX = Object.freeze({
  show: 40, close: 40, dismiss: 40, expand: 40, move: 40, opened: 40, error: 60, retry: 40, a11y_summary: 120,
});
const SMR_FLOAT_STAR_DEFAULT = "#FFAA00";
const SMR_FLOAT_THEME_COLORS = Object.freeze({
  light: Object.freeze({ surface: "#FFFFFF", text: "#171717", accent: "#1A73E8" }),
  dark: Object.freeze({ surface: "#171717", text: "#FFFFFF", accent: "#8AB4F8" }),
});
const SMR_FLOAT_DEFAULTS = Object.freeze({
  position: "bottom-left",
  offset_x: 16,
  offset_y: 16,
  show_on: "all",
  mobile_style: "bar",
  mobile_sheet_height: 60,
  theme: "light",
  label: "Reviews",
  label_one: "Review",
  strings: Object.freeze({
    show: "Show reviews",
    close: "Close reviews",
    dismiss: "Hide reviews badge",
    expand: "Expand reviews",
    move: "Move badge to the other side",
    opened: "Reviews opened",
    error: "Reviews couldn't load.",
    retry: "Try again",
    a11y_summary: "Rated {rating} out of 5 from {count} {label}.",
  }),
  reveal: Object.freeze({ trigger: "immediate", delay_seconds: 5, scroll_percent: 25 }),
  auto_open: Object.freeze({ enabled: false, trigger: "delay", delay_seconds: 10, scroll_percent: 50, frequency: "once", cooldown_days: 7 }),
  dismiss: Object.freeze({ enabled: true, days: 7 }),
  experiment: Object.freeze({ enabled: false, variant_b_position: "bottom-right", split: 50 }),
});

const SMR_SVG_NS = "http://www.w3.org/2000/svg";
const SMR_FLOAT_STAR_PATH = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
const SMR_FLOAT_ICONS = Object.freeze({
  google: Object.freeze([
    ["M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z", "#4285F4"],
    ["M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z", "#34A853"],
    ["M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z", "#FBBC05"],
    ["M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z", "#EA4335"],
  ]),
  facebook: Object.freeze([
    ["M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z", "#1877F2"],
  ]),
});
// manual, mixed and anything else: a speech bubble in the accent color.
const SMR_FLOAT_ICON_NEUTRAL = Object.freeze([
  ["M4 2h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "currentColor"],
]);
const SMR_FLOAT_STROKE_PATHS = Object.freeze({
  close: "M6 6l12 12M18 6 6 18",
  collapse: "M6 9l6 6 6-6",
  chevron: "M6 15l6-6 6 6",
  expand: "M14 4h6v6M10 20H4v-6M20 4l-6 6M4 20l6-6",
  shrink: "M4 14h6v6M20 10h-6V4M14 10l6-6M10 14l-6 6",
  move: "M7 8l-4 4 4 4M17 8l4 4-4 4M3 12h18",
});

/**
 * Without `options` (every legacy call) this resolves to the iframe. With an
 * options object ({ mode, onHeight, src }) it resolves to { iframe, dispose }:
 * the iframe is sandboxed, `mode: "floating"` asks the widget render for the
 * panel variant, and dispose() removes the height listener.
 */
async function createIframe(token, divIndex, type, env = null, options = null) {
  const iframe = document.createElement("iframe");

  // Set common iframe attributes
  iframe.style.cssText =
    "width: 1px; min-width: 100%; border: none; overflow: hidden; height: 100%;";
  iframe.setAttribute(
    "data-default-styles",
    "width: 1px; min-width: 100%; height: 100%; border: none;"
  );
  iframe.setAttribute("scrolling", "no");
  iframe.title = "Sync My Reviews";
  iframe.id = "iFrame" + divIndex;

  // Listen for postMessage messages for height adjustment. Only a finite,
  // positive, bounded height from this iframe's own window is applied.
  const onMessage = (event) => {
    const data = event.data;
    if (
      iframe.contentWindow !== null &&
      event.source === iframe.contentWindow &&
      data &&
      Number.isFinite(data.iframeHeight) &&
      data.iframeHeight > 0 &&
      data.iframeHeight <= SMR_MAX_IFRAME_HEIGHT
    ) {
      iframe.style.height = data.iframeHeight + "px";
      if (options && typeof options.onHeight === "function") {
        options.onHeight(data.iframeHeight);
      }
    }
  };
  window.addEventListener("message", onMessage);

  // Determine the API endpoint based on type
  const baseUrl = env || urlEnv;
  let endpoint;
  if (type === "badge") {
    endpoint = `/api/get-badge/${token}`;
  } else if (type === "feedback") {
    endpoint = `/api/get-feedback/${token}/${env || "default"}`;
  } else if (type === "survey") {
    endpoint = `/api/get-survey/${token}`;
  } else {
    endpoint = `/api/get-widget/${token}`;
  }

  if (!options) {
    iframe.src = `${baseUrl}${endpoint}`;
    return iframe;
  }

  let src = `${baseUrl}${endpoint}`;
  if (options.mode === "floating" && type === "widget") {
    src += "?mode=floating";
  }
  if (typeof options.src === "string") {
    src = options.src;
  }
  iframe.setAttribute("sandbox", SMR_PANEL_SANDBOX);
  iframe.src = src;

  let disposed = false;
  const dispose = () => {
    if (!disposed) {
      disposed = true;
      window.removeEventListener("message", onMessage);
    }
  };
  return { iframe, dispose };
}

async function fetchDataFromBackend(token, index, type, env = null) {
  const iframe = await createIframe(token, index, type, env);
  // Check for both token types
  const div = document.querySelector(
    `div[data-smr-token="${token}"], div[data-smr-pipeline-token="${token}"]`
  );

  if (div) {
    div.appendChild(iframe);
  }
}

async function fetchAndPopulateData(env = null) {
  // Handle both token types
  const divs = document.querySelectorAll(
    "div[data-smr-token], div[data-smr-pipeline-token]"
  );
  smrNextEmbedIndex = divs.length;
  // Widget configs resolve in parallel; floating candidates mount after all settle.
  const widgetEmbeds = [];
  const floatingCandidates = [];
  // Marked before the first await, so a rescan never picks up a boot widget div.
  const skip = new Set();
  divs.forEach((div) => {
    if (smrEmbedType(div) === "widget") {
      if (div.hasAttribute("data-smr-rendered")) {
        skip.add(div);
      } else {
        div.setAttribute("data-smr-rendered", "pending");
      }
    }
  });

  for (let index = 0; index < divs.length; index++) {
    const div = divs[index];
    if (skip.has(div)) {
      continue;
    }
    const token =
      div.getAttribute("data-smr-token") ||
      div.getAttribute("data-smr-pipeline-token");
    const type = smrEmbedType(div);

    // Optional per-embed API host override (falls back to the argument, then the
    // hardcoded production urlEnv). Lets local dev target a local backend without
    // editing this statically hosted file. Only an http(s) origin is accepted.
    const apiOverride = smrSafeApiBase(div.getAttribute("data-smr-api")) || env;

    if (type === "widget") {
      addRichSchemaToHeader(token, apiOverride);
      widgetEmbeds.push(smrHandleWidgetEmbed(div, token, index, apiOverride, floatingCandidates));
      continue;
    }

    // Survey embeds support configurable shells (Stage 2B). Non-survey types and
    // inline surveys keep the exact legacy path (append iframe to the host div).
    if (type === "survey") {
      await handleSurveyEmbed(div, token, index, apiOverride);
      continue;
    }

    await fetchDataFromBackend(token, index, type, apiOverride);
  }

  if (widgetEmbeds.length > 0) {
    await Promise.allSettled(widgetEmbeds);
    smrMountFloatingCandidates(floatingCandidates);
  }
}

async function addRichSchemaToHeader(token, env = null) {
  const baseUrl = env || urlEnv;

  const schemaEndpoint = `${baseUrl}/api/get-schema/${token}`;
  try {
    const response = await fetch(schemaEndpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const schema = await response.json();

    // Create a new script element for the schema
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema.data);

    // Append the script to the document's head
    document.head.appendChild(script);
  } catch (error) {
    // swallow: embed loader must fail silently on host pages
  }
}

// ===========================================================================
// Survey embed — shell resolution + rendering (Stage 2B)
// ===========================================================================

/**
 * Resolve the embed config, then render. Inline (the default) is byte-for-byte
 * the legacy path; non-inline modes mount a shell. Any error falls back to the
 * legacy inline render so a configured survey can never fail to appear.
 */
async function handleSurveyEmbed(div, token, index, apiOverride) {
  let config = EMBED_DEFAULTS;
  try {
    config = await resolveSurveyConfig(div, token, apiOverride);
  } catch (error) {
    config = { ...EMBED_DEFAULTS };
  }

  if (config.display_mode === "inline") {
    // Legacy path, unchanged: append the iframe straight into the host div.
    await fetchDataFromBackend(token, index, "survey", apiOverride);
    return;
  }

  try {
    await mountSurveyShell(div, token, index, apiOverride, config);
  } catch (error) {
    // Never let a shell failure strand the survey — fall back to inline.
    await fetchDataFromBackend(token, index, "survey", apiOverride);
  }
}

/**
 * Precedence: explicit data-smr-* attributes override everything; otherwise
 * fetch the author-configured embed config; otherwise inline defaults.
 */
async function resolveSurveyConfig(div, token, apiOverride) {
  const attrs = readSurveyAttrs(div);

  // Power-user override: if the author pinned the display mode on the div, use
  // the attributes and skip the network round trip entirely.
  if (attrs.display_mode !== undefined) {
    return coerceConfig({ ...EMBED_DEFAULTS, ...attrs });
  }

  const server = await fetchEmbedConfig(token, apiOverride);
  return coerceConfig({ ...EMBED_DEFAULTS, ...server, ...attrs });
}

/**
 * Read the optional data-smr-* shell attributes. Absent attributes are omitted
 * so the merge order (defaults < server < attrs) stays correct.
 */
function readSurveyAttrs(div) {
  const map = {
    display_mode: "data-smr-display",
    position: "data-smr-position",
    trigger: "data-smr-trigger",
    delay_seconds: "data-smr-delay",
    frequency: "data-smr-frequency",
    cooldown_days: "data-smr-cooldown-days",
    post_submit_behavior: "data-smr-post-submit",
    animation: "data-smr-animation",
  };

  const out = {};
  for (const key in map) {
    const raw = div.getAttribute(map[key]);
    if (raw !== null && raw !== "") {
      out[key] = raw;
    }
  }
  return out;
}

/** Fetch the public embed config; return {} on ANY failure/timeout/parse error. */
async function fetchEmbedConfig(token, apiOverride) {
  const baseUrl = apiOverride || urlEnv;
  const url = `${baseUrl}/api/survey-embed/${encodeURIComponent(token)}`;

  try {
    let signal;
    let timer;
    if (typeof AbortController !== "undefined") {
      const controller = new AbortController();
      signal = controller.signal;
      timer = setTimeout(() => controller.abort(), EMBED_CONFIG_TIMEOUT_MS);
    }

    const response = await fetch(url, signal ? { signal } : undefined);
    if (timer) clearTimeout(timer);

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    return data && typeof data === "object" ? data : {};
  } catch (error) {
    return {};
  }
}

/** Coerce a raw config object to a fully-valid config; unknowns => defaults. */
function coerceConfig(raw) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  return {
    display_mode: coerceEnum(cfg.display_mode, DISPLAY_MODES, EMBED_DEFAULTS.display_mode),
    position: coerceEnum(cfg.position, POSITIONS, EMBED_DEFAULTS.position),
    trigger: coerceEnum(cfg.trigger, TRIGGERS, EMBED_DEFAULTS.trigger),
    delay_seconds: coerceInt(cfg.delay_seconds, 0, 120, EMBED_DEFAULTS.delay_seconds),
    scroll_percent: coerceInt(cfg.scroll_percent, 10, 100, EMBED_DEFAULTS.scroll_percent),
    frequency: coerceEnum(cfg.frequency, FREQUENCIES, EMBED_DEFAULTS.frequency),
    cooldown_days: coerceInt(cfg.cooldown_days, 0, 365, EMBED_DEFAULTS.cooldown_days),
    post_submit_behavior: coerceEnum(
      cfg.post_submit_behavior,
      POST_SUBMIT,
      EMBED_DEFAULTS.post_submit_behavior
    ),
    animation: coerceEnum(cfg.animation, ANIMATIONS, EMBED_DEFAULTS.animation),
  };
}

function coerceEnum(value, allowed, fallback) {
  return typeof value === "string" && allowed.indexOf(value) !== -1 ? value : fallback;
}

function coerceInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * Build a (hidden) shell, mount the funnel iframe inside it, wire triggers,
 * frequency and the auto-close listener. popup aliases slidein for Day 1.
 */
async function mountSurveyShell(div, token, index, apiOverride, config) {
  // Frequency gate — respect per-browser suppression before doing anything.
  if (!shouldShowSurvey(token, config)) {
    return;
  }

  injectShellStyles();

  const effectiveMode = config.display_mode === "popup" ? "slidein" : config.display_mode;
  const shell = buildShell(effectiveMode, config, token);
  const iframe = await createIframe(token, index, "survey", apiOverride);
  shell.mount.appendChild(iframe);
  document.body.appendChild(shell.wrapper);

  setupSurveyMessageListener(iframe, shell, config, token);

  const reveal = () => revealShell(shell, config, token);
  scheduleTrigger(config, reveal);
}

/** Inject the scoped shell stylesheet exactly once. */
function injectShellStyles() {
  if (document.getElementById("smr-survey-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "smr-survey-styles";
  style.textContent = `
.smr-survey-wrapper{position:fixed;z-index:${SHELL_Z_INDEX};box-sizing:border-box;--smr-hide:translateY(16px);}
/* Mounted before its trigger fires: an unrevealed (transparent) shell must not swallow host-page clicks. */
.smr-survey-wrapper:not(.smr-visible){pointer-events:none;}
.smr-survey-wrapper *,.smr-survey-wrapper *::before,.smr-survey-wrapper *::after{box-sizing:border-box;}
/* Entrance animations — the hidden-state transform comes from --smr-hide so the
   visible state is always a plain identity (transform:none). Default = slide. */
.smr-anim-slide{--smr-hide:translateY(16px);}
.smr-anim-fade{--smr-hide:none;}
.smr-anim-zoom{--smr-hide:scale(.92);}
.smr-anim-none{--smr-hide:none;}
.smr-anim-none .smr-survey-card,.smr-anim-none .smr-survey-backdrop{transition-duration:0s;}
.smr-survey-card{width:360px;max-width:92vw;background:#fff;border-radius:10px;
  box-shadow:0 12px 40px rgba(0,0,0,.22);overflow:hidden;opacity:0;transform:var(--smr-hide);
  transition:opacity .3s ease,transform .3s ease;}
.smr-survey-wrapper.smr-visible .smr-survey-card{opacity:1;transform:none;}
.smr-survey-header{display:flex;justify-content:flex-end;align-items:center;padding:6px 8px;
  background:transparent;position:absolute;top:0;right:0;z-index:2;}
.smr-survey-close{appearance:none;border:none;background:rgba(0,0,0,.05);color:#333;
  width:30px;height:30px;line-height:28px;border-radius:50%;font-size:20px;cursor:pointer;
  text-align:center;padding:0;}
.smr-survey-close:hover{background:rgba(0,0,0,.12);}
.smr-survey-close:focus{outline:2px solid #0d6efd;outline-offset:2px;}
.smr-survey-body{min-height:180px;}
.smr-survey-body iframe{display:block;}
/* Slide-in / popup positions */
.smr-pos-bottom-right{bottom:20px;right:20px;}
.smr-pos-bottom-left{bottom:20px;left:20px;}
.smr-pos-top-right{top:20px;right:20px;}
.smr-pos-top-left{top:20px;left:20px;}
.smr-pos-center{top:50%;left:50%;transform:translate(-50%,-50%);}
.smr-pos-center .smr-survey-card{transform:var(--smr-hide);}
.smr-pos-center.smr-visible .smr-survey-card{transform:none;}
/* Modal */
.smr-survey-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);
  display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease;
  padding:20px;}
.smr-survey-wrapper.smr-visible .smr-survey-backdrop{opacity:1;}
.smr-survey-backdrop .smr-survey-card{width:420px;max-width:96vw;max-height:92vh;overflow:auto;}
/* Mobile <576px */
@media (max-width:575px){
  .smr-pos-bottom-right,.smr-pos-bottom-left,.smr-pos-top-right,.smr-pos-top-left,.smr-pos-center{
    top:auto;bottom:0;left:0;right:0;transform:none;}
  .smr-pos-center.smr-visible .smr-survey-card,.smr-pos-bottom-right .smr-survey-card{transform:var(--smr-hide);}
  .smr-survey-wrapper.smr-visible .smr-survey-card{transform:none;}
  .smr-survey-wrapper:not(.smr-survey-modal) .smr-survey-card{width:100%;max-width:100%;
    border-radius:14px 14px 0 0;}
  .smr-survey-backdrop{padding:0;align-items:flex-end;}
  .smr-survey-backdrop .smr-survey-card{width:100%;max-width:100%;max-height:96vh;
    border-radius:14px 14px 0 0;
    padding-bottom:env(safe-area-inset-bottom);}
}
`;
  document.head.appendChild(style);
}

/**
 * Create the shell DOM. Returns { wrapper, mount, close } where `mount` is the
 * element the iframe is appended to and `close` tears the shell down.
 */
function buildShell(mode, config, token) {
  const wrapper = document.createElement("div");
  wrapper.className = "smr-survey-wrapper";
  wrapper.setAttribute("data-smr-survey-shell", mode);
  // Entrance animation — drives the hidden-state transform via a CSS variable.
  wrapper.classList.add("smr-anim-" + (config.animation || "slide"));

  const card = document.createElement("div");
  card.className = "smr-survey-card";

  const body = document.createElement("div");
  body.className = "smr-survey-body";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "smr-survey-close";
  closeBtn.setAttribute("aria-label", "Close survey");
  closeBtn.innerHTML = "&times;";

  const header = document.createElement("div");
  header.className = "smr-survey-header";
  header.appendChild(closeBtn);

  card.appendChild(header);
  card.appendChild(body);

  const state = { teardownFns: [] };
  const close = () => closeShell(wrapper, token, state);
  closeBtn.addEventListener("click", close);

  if (mode === "modal") {
    wrapper.classList.add("smr-survey-modal");
    const backdrop = document.createElement("div");
    backdrop.className = "smr-survey-backdrop";

    const dialog = card;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Survey");

    backdrop.appendChild(dialog);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        close();
      }
    });
    wrapper.appendChild(backdrop);

    return { wrapper, mount: body, close, state, modal: true, dialog, closeBtn };
  }

  // slide-in / popup
  wrapper.classList.add("smr-pos-" + config.position);
  wrapper.appendChild(card);

  return { wrapper, mount: body, close, state, modal: false, dialog: card, closeBtn };
}

/** Reveal the shell, record the "shown" marker, and arm modal a11y behaviors. */
function revealShell(shell, config, token) {
  if (!shell.wrapper.isConnected) {
    return;
  }
  // Next frame so the CSS transition runs.
  requestAnimationFrame(() => shell.wrapper.classList.add("smr-visible"));
  markSurveyShown(token, config);

  if (shell.modal) {
    armModalAccessibility(shell);
  }
}

/** Esc-to-close + a simple focus trap for the modal shell. */
function armModalAccessibility(shell) {
  const onKeydown = (event) => {
    if (event.key === "Escape") {
      shell.close();
      return;
    }
    if (event.key === "Tab") {
      // Only the close button is a reliably focusable in-dialog control (the
      // iframe body is cross-origin), so keep focus pinned to it.
      event.preventDefault();
      shell.closeBtn.focus();
    }
  };

  document.addEventListener("keydown", onKeydown);
  shell.state.teardownFns.push(() => document.removeEventListener("keydown", onKeydown));

  try {
    shell.closeBtn.focus();
  } catch (error) {
    /* focus is best-effort */
  }
}

/** Remove the shell from the DOM, run teardown, and persist the closed marker. */
function closeShell(wrapper, token, state) {
  if (state && Array.isArray(state.teardownFns)) {
    state.teardownFns.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        /* ignore teardown errors */
      }
    });
    state.teardownFns = [];
  }

  wrapper.classList.remove("smr-visible");
  markSurveyClosed(token);

  // Allow the fade-out transition to finish before detaching.
  setTimeout(() => {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }, 320);
}

/** Wire the trigger that decides WHEN the shell is revealed. */
function scheduleTrigger(config, reveal) {
  switch (config.trigger) {
    case "delay":
      setTimeout(reveal, config.delay_seconds * 1000);
      return;

    case "scroll":
      armScrollTrigger(config, reveal);
      return;

    case "exit":
      armExitIntentTrigger(reveal);
      return;

    case "immediate":
    default:
      reveal();
  }
}

function armScrollTrigger(config, reveal) {
  let fired = false;
  const onScroll = () => {
    if (fired) return;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 100;
    if (percent >= config.scroll_percent) {
      fired = true;
      window.removeEventListener("scroll", onScroll);
      reveal();
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function armExitIntentTrigger(reveal) {
  // Exit-intent is unreliable on touch devices → fall back to a timed reveal.
  const isTouch =
    "ontouchstart" in window ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  if (isTouch) {
    setTimeout(reveal, EXIT_INTENT_MOBILE_FALLBACK_MS);
    return;
  }

  let fired = false;
  const onMouseOut = (event) => {
    if (fired) return;
    if (event.clientY <= 0 && !event.relatedTarget && !event.toElement) {
      fired = true;
      document.removeEventListener("mouseout", onMouseOut);
      reveal();
    }
  };
  document.addEventListener("mouseout", onMouseOut);
}

// ---------------------------------------------------------------------------
// Auto-close protocol — listen for funnel { smrSurvey: { event, step } }
// ---------------------------------------------------------------------------
function setupSurveyMessageListener(iframe, shell, config, token) {
  const onMessage = (event) => {
    if (event.source !== iframe.contentWindow || !event.data) {
      return;
    }

    const payload = event.data[SURVEY_CHANNEL];
    if (!payload || typeof payload !== "object") {
      return;
    }

    if (payload.event === "requestClose") {
      shell.close();
      return;
    }

    if (payload.event === "submitted") {
      markSurveySubmitted(token);

      if (config.post_submit_behavior === "auto_close") {
        shell.close();
      } else if (config.post_submit_behavior === "auto_close_after_thanks") {
        if (payload.step === "thanks" || payload.step === "cta") {
          setTimeout(() => shell.close(), AUTO_CLOSE_AFTER_THANKS_MS);
        }
      }
      // show_cta (default): keep the funnel open — today's behavior.
    }
  };

  window.addEventListener("message", onMessage);
  shell.state.teardownFns.push(() => window.removeEventListener("message", onMessage));
}

// ---------------------------------------------------------------------------
// Frequency / suppression — per-browser storage, fail-open on blocked storage
// ---------------------------------------------------------------------------
function surveyStorageKey(token) {
  return "smr_survey_" + token;
}

function readSurveyRecord(token) {
  try {
    const raw = window.localStorage.getItem(surveyStorageKey(token));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeSurveyRecord(token, patch) {
  try {
    const next = { ...readSurveyRecord(token), ...patch };
    window.localStorage.setItem(surveyStorageKey(token), JSON.stringify(next));
  } catch (error) {
    /* blocked storage → degrade silently */
  }
}

function readSessionShown(token) {
  try {
    return window.sessionStorage.getItem(surveyStorageKey(token)) === "1";
  } catch (error) {
    return false;
  }
}

function writeSessionShown(token) {
  try {
    window.sessionStorage.setItem(surveyStorageKey(token), "1");
  } catch (error) {
    /* blocked storage → degrade silently */
  }
}

/** Decide whether this survey may be shown now given its frequency config. */
function shouldShowSurvey(token, config) {
  const record = readSurveyRecord(token);

  // A submitted marker suppresses re-prompting regardless of frequency.
  if (record.submitted) {
    return false;
  }

  switch (config.frequency) {
    case "every_visit":
      return true;

    case "once": {
      const last = record.closed || record.shownAt || 0;
      if (!last) {
        return true;
      }
      if (config.cooldown_days > 0) {
        const elapsedDays = (Date.now() - last) / 86400000;
        return elapsedDays >= config.cooldown_days;
      }
      return false;
    }

    case "session":
    default:
      return !readSessionShown(token);
  }
}

function markSurveyShown(token, config) {
  writeSurveyRecord(token, { shownAt: Date.now() });
  if (config.frequency === "session") {
    writeSessionShown(token);
  }
}

function markSurveyClosed(token) {
  writeSurveyRecord(token, { closed: Date.now() });
}

function markSurveySubmitted(token) {
  writeSurveyRecord(token, { submitted: Date.now() });
}

// ===========================================================================
// Floating review widget: boot, resolution and coercion
// ===========================================================================

// Page-load state shared by every floating shell of this loader copy.
const smrFloatShells = [];
const smrFloatPending = [];
const smrDismissedTokens = new Set();
// null until the first probe; any storage catch sets it to true.
let smrStorageBlocked = null;
// A throwing dataLayer.push stops every push for the rest of the page.
let smrDataLayerBroken = false;
let smrNextEmbedIndex = 0;
let smrLastPath = location.pathname;
let smrAutoBoot = false;
let smrRescanTimer = null;
let smrPreviewCount = 0;

function smrBoot() {
  if (window.SMR) {
    return;
  }
  smrAutoBoot = window.SMR_NO_AUTOBOOT !== true;
  window.SMR = Object.freeze({
    version: SMR_VERSION,
    refresh: smrRefresh,
    openReviews: smrOpenReviews,
    closeReviews: smrCloseReviews,
    mountPreview: smrMountPreview,
  });
  if (!smrAutoBoot) {
    return;
  }
  const run = () => {
    fetchAndPopulateData()
      .finally(() => {
        smrObserveDom();
        smrScheduleRescan();
      })
      .catch(() => {
        // The boot pass already degrades per embed; a stray rejection must not surface on the host page.
      });
  };
  if (document.readyState !== "loading") {
    run();
    return;
  }
  document.addEventListener("DOMContentLoaded", run);
}

function smrEmbedType(div) {
  return div.getAttribute("data-smr-type") || (div.getAttribute("data-smr-pipeline-token") ? "feedback" : "widget");
}

/** An http(s) URL resolved against `base`, or null. */
function smrHttpUrl(raw, base) {
  if (typeof raw !== "string" || raw === "") {
    return null;
  }
  try {
    const url = new URL(raw, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch (error) {
    return null;
  }
}

/** An http(s) origin from a data-smr-api value, or null (=> production urlEnv). */
function smrSafeApiBase(raw) {
  const url = smrHttpUrl(raw);
  return url ? url.origin : null;
}

// ===========================================================================
// Floating review widget: SPA rescan and the window.SMR API
// ===========================================================================

/** Widget divs added after boot; other embed types render once, at boot. No JSON-LD here. */
async function smrScanWidgets() {
  const embeds = [];
  const candidates = [];
  document.querySelectorAll("div[data-smr-token]:not([data-smr-rendered])").forEach((div) => {
    if ((div.getAttribute("data-smr-type") || "widget") !== "widget") {
      return;
    }
    div.setAttribute("data-smr-rendered", "pending");
    const api = smrSafeApiBase(div.getAttribute("data-smr-api"));
    embeds.push(smrHandleWidgetEmbed(div, div.getAttribute("data-smr-token"), smrNextEmbedIndex++, api, candidates));
  });
  if (embeds.length > 0) {
    await Promise.allSettled(embeds);
    smrMountFloatingCandidates(candidates);
  }
}

/** Re-attach removed hosts, apply a route change, then render new widget divs. Callers contain any throw. */
function smrRescan() {
  smrFloatShells.forEach((shell) => {
    if (!shell.host.isConnected) {
      document.body.appendChild(shell.host);
    }
  });
  if (location.pathname !== smrLastPath) {
    smrLastPath = location.pathname;
    smrFloatShells.forEach((shell) => smrSetTargeted(shell, smrIsTargeted(shell.cfg.targeting, location.pathname)));
    for (let i = 0; i < smrFloatPending.length; ) {
      const candidate = smrFloatPending[i];
      if (smrDismissedTokens.has(candidate.token) || smrIsDismissed(candidate.token)) {
        smrFloatPending.splice(i, 1);
        continue;
      }
      const winner = smrIsTargeted(candidate.cfg.targeting, location.pathname) && smrClaimFloatingSlots([candidate])[0];
      if (winner) {
        smrFloatPending.splice(i, 1);
        smrMountFloatingWidget(winner.token, winner.index, winner.api, winner.cfg, winner.div, winner.slots);
      } else {
        i++;
      }
    }
  }
  smrScanWidgets().catch(() => {
    // Each embed already degrades to inline; nothing from a scan may surface on the host page.
  });
}

/** A throttle, not a debounce: continuous churn still rescans every SMR_RESCAN_DEBOUNCE_MS. */
function smrScheduleRescan() {
  if (smrRescanTimer === null) {
    smrRescanTimer = setTimeout(() => {
      smrRescanTimer = null;
      smrRefresh();
    }, SMR_RESCAN_DEBOUNCE_MS);
  }
}

/** history.pushState is not patched: a route change is seen through the DOM mutation it causes, or popstate. */
function smrObserveDom() {
  window.addEventListener("popstate", () => smrScheduleRescan());
  if (typeof MutationObserver !== "function") {
    return;
  }
  const onlyAddsHosts = (record) =>
    record.removedNodes.length === 0 &&
    Array.prototype.every.call(record.addedNodes, (node) => node.nodeType === 1 && node.hasAttribute("data-smr-float-root"));
  new MutationObserver((records) => {
    if (!records.every(onlyAddsHosts)) {
      smrScheduleRescan();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}

function smrRefresh() {
  if (!smrAutoBoot) {
    return;
  }
  try {
    smrRescan();
  } catch (error) {
    // A failed rescan (for example no document.body mid-replacement) waits for the next mutation or refresh.
  }
}

/** The first eligible registered shell in index order; reveals it first when its trigger has not fired. */
function smrOpenReviews() {
  const shell = smrFloatShells
    .slice()
    .sort((a, b) => a.index - b.index)
    .find((candidate) => {
      const state = candidate.state;
      return !state.tornDown && !state.failed && state.targeted && !state.dismissed &&
        candidate.el.wrap.getAttribute("data-active") === "true";
    });
  if (!shell) {
    return false;
  }
  smrRevealNow(shell);
  return shell.state.open || smrOpenPanel(shell, { auto: false });
}

function smrCloseReviews() {
  let closed = false;
  smrFloatShells.forEach((shell) => {
    closed = smrClosePanel(shell) || closed;
  });
  return closed;
}

/**
 * Dashboard preview: the real shell inside `container`, never registered, with no
 * storage, events, targeting or triggers. Returns the disposer.
 */
function smrMountPreview(container, config, options) {
  if (!(container instanceof Element)) {
    throw new TypeError("SMR.mountPreview needs an Element container");
  }
  const { iframeSrc, device = "desktop", variant = "a" } = smrIsPlainObject(options) ? options : {};
  const cfg = smrCoerceFloating(smrIsPlainObject(config) ? config : {});
  const src = smrHttpUrl(iframeSrc, location.href);
  const shell = smrBuildFloatingShell(cfg, {
    preview: true,
    container,
    device: device === "mobile" ? "mobile" : "desktop",
    variant: variant === "b" ? "b" : "a",
    position: variant === "b" && cfg.experiment.enabled ? cfg.experiment.variant_b_position : cfg.position,
    src: src ? src.href : null,
    token: "",
    index: "preview-" + (++smrPreviewCount),
    api: null,
    div: null,
    slots: [],
  });
  try {
    smrArmReveal(shell);
  } catch (error) {
    smrTeardownFloating(shell);
    throw error;
  }
  return () => smrTeardownFloating(shell);
}

/**
 * Inline and failed configs render inline as soon as they resolve; `none`
 * renders nothing; floating configs wait for slot claiming.
 */
async function smrHandleWidgetEmbed(div, token, index, api, floatingCandidates) {
  let cfg;
  try {
    cfg = await smrResolveWidgetConfig(div, token, api);
  } catch (error) {
    cfg = { display_mode: "inline" };
  }

  if (cfg.display_mode === "floating") {
    div.setAttribute("data-smr-rendered", "floating");
    floatingCandidates.push({ div, token, index, api, cfg: cfg.floating });
    return;
  }
  if (cfg.display_mode === "none") {
    div.setAttribute("data-smr-rendered", "none");
    return;
  }
  await smrRenderInlineWidget(div, token, index, api);
}

/** data-smr-display="inline" pins inline with no request; any other value is ignored. */
async function smrResolveWidgetConfig(div, token, api) {
  if (div.getAttribute("data-smr-display") === "inline") {
    return { display_mode: "inline" };
  }
  return smrCoerceWidgetConfig(await smrFetchWidgetEmbedConfig(token, api));
}

/** The public embed config; {} on any failure, timeout or malformed body. */
async function smrFetchWidgetEmbedConfig(token, api) {
  const url = `${api || urlEnv}${SMR_WIDGET_EMBED_PATH}${encodeURIComponent(token)}`;
  let timer = null;
  try {
    const init = { credentials: "omit" };
    if (typeof AbortController !== "undefined") {
      const controller = new AbortController();
      init.signal = controller.signal;
      timer = setTimeout(() => controller.abort(), EMBED_CONFIG_TIMEOUT_MS);
    }
    const response = await fetch(url, init);
    if (!response.ok) {
      return {};
    }
    const data = await response.json();
    return smrIsPlainObject(data) ? data : {};
  } catch (error) {
    return {};
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
}

function smrIsPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Own property only, so inherited or polluted keys are never read. */
function smrOwn(obj, key) {
  return smrIsPlainObject(obj) && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

function smrClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smrToNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (SMR_FLOAT_NUMERIC_RE.test(trimmed)) {
      return Number(trimmed);
    }
  }
  return NaN;
}

/** Mirrors WidgetPresentation::int(): clamp, truncate, snap to the step, clamp. */
function smrCoerceRangeInt(value, key, fallback) {
  const [min, max, step] = SMR_FLOAT_RANGES[key];
  const number = smrToNumber(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  const truncated = Math.trunc(smrClamp(number, min, max));
  const snapped = min + Math.round((truncated - min) / step) * step;
  return smrClamp(snapped, min, max);
}

function smrCoerceRating(value) {
  const number = smrToNumber(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.round(smrClamp(number, 0, 5) * 10) / 10;
}

function smrCoerceCount(value) {
  const number = smrToNumber(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.floor(smrClamp(number, 0, Number.MAX_SAFE_INTEGER));
}

function smrCoerceBool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function smrCoerceHex(value) {
  return typeof value === "string" && SMR_FLOAT_HEX_RE.test(value) ? value : null;
}

/** Collapsed whitespace, trimmed, at most `max` code points; '' => fallback. Rendered with textContent only. */
function smrCoerceText(value, fallback, max) {
  if (typeof value !== "string") {
    return fallback;
  }
  const text = value.replace(/\s+/g, " ").trim();
  if (text === "") {
    return fallback;
  }
  return Array.from(text).slice(0, max).join("").trimEnd();
}

function smrCoercePathList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const out = [];
  for (let i = 0; i < value.length && out.length < SMR_FLOAT_PATH_LIST_MAX; i++) {
    const item = value[i];
    if (
      typeof item === "string" &&
      item.length <= SMR_FLOAT_PATH_MAX &&
      SMR_FLOAT_PATH_RE.test(item) &&
      out.indexOf(item) === -1
    ) {
      out.push(item);
    }
  }
  return out;
}

/** Raw config => { display_mode } or { display_mode: "floating", floating }. Never throws. */
function smrCoerceWidgetConfig(raw) {
  const mode = coerceEnum(smrOwn(raw, "display_mode"), SMR_WIDGET_DISPLAY_MODES, "inline");
  if (mode !== "floating") {
    return { display_mode: mode };
  }
  const floating = smrOwn(raw, "floating");
  if (!smrIsPlainObject(floating)) {
    return { display_mode: "inline" };
  }
  return { display_mode: "floating", floating: smrCoerceFloating(floating) };
}

/** Picks known keys only (no spread), so the result has a fixed shape. */
function smrCoerceFloating(raw) {
  const defaults = SMR_FLOAT_DEFAULTS;

  const rawColors = smrOwn(raw, "colors");
  const custom = {
    surface: smrCoerceHex(smrOwn(rawColors, "surface")),
    text: smrCoerceHex(smrOwn(rawColors, "text")),
    accent: smrCoerceHex(smrOwn(rawColors, "accent")),
  };
  let theme = coerceEnum(smrOwn(raw, "theme"), SMR_FLOAT_THEMES, defaults.theme);
  if (theme === "custom" && (!custom.surface || !custom.text || !custom.accent)) {
    theme = "light";
  }
  const light = SMR_FLOAT_THEME_COLORS.light;
  const colors = {
    surface: custom.surface || light.surface,
    text: custom.text || light.text,
    accent: custom.accent || light.accent,
  };

  const rawStrings = smrOwn(raw, "strings");
  const strings = {};
  Object.keys(defaults.strings).forEach((key) => {
    strings[key] = smrCoerceText(smrOwn(rawStrings, key), defaults.strings[key], SMR_FLOAT_STRING_MAX[key]);
  });

  const rawReveal = smrOwn(raw, "reveal");
  const rawAutoOpen = smrOwn(raw, "auto_open");
  const rawDismiss = smrOwn(raw, "dismiss");
  const rawTargeting = smrOwn(raw, "targeting");
  const rawExperiment = smrOwn(raw, "experiment");
  const rawSummary = smrOwn(raw, "summary");
  const source = smrOwn(rawSummary, "source");

  return {
    position: coerceEnum(smrOwn(raw, "position"), SMR_FLOAT_POSITIONS, defaults.position),
    offset_x: smrCoerceRangeInt(smrOwn(raw, "offset_x"), "offset_x", defaults.offset_x),
    offset_y: smrCoerceRangeInt(smrOwn(raw, "offset_y"), "offset_y", defaults.offset_y),
    show_on: coerceEnum(smrOwn(raw, "show_on"), SMR_FLOAT_SHOW_ON, defaults.show_on),
    mobile_style: coerceEnum(smrOwn(raw, "mobile_style"), SMR_FLOAT_MOBILE_STYLES, defaults.mobile_style),
    mobile_sheet_height: smrCoerceRangeInt(smrOwn(raw, "mobile_sheet_height"), "mobile_sheet_height", defaults.mobile_sheet_height),
    theme,
    colors,
    label: smrCoerceText(smrOwn(raw, "label"), defaults.label, SMR_FLOAT_LABEL_MAX),
    label_one: smrCoerceText(smrOwn(raw, "label_one"), defaults.label_one, SMR_FLOAT_LABEL_MAX),
    strings,
    reveal: {
      trigger: coerceEnum(smrOwn(rawReveal, "trigger"), SMR_FLOAT_REVEAL_TRIGGERS, defaults.reveal.trigger),
      delay_seconds: smrCoerceRangeInt(smrOwn(rawReveal, "delay_seconds"), "reveal.delay_seconds", defaults.reveal.delay_seconds),
      scroll_percent: smrCoerceRangeInt(smrOwn(rawReveal, "scroll_percent"), "reveal.scroll_percent", defaults.reveal.scroll_percent),
    },
    auto_open: {
      enabled: smrCoerceBool(smrOwn(rawAutoOpen, "enabled"), defaults.auto_open.enabled),
      trigger: coerceEnum(smrOwn(rawAutoOpen, "trigger"), SMR_FLOAT_AUTO_OPEN_TRIGGERS, defaults.auto_open.trigger),
      delay_seconds: smrCoerceRangeInt(smrOwn(rawAutoOpen, "delay_seconds"), "auto_open.delay_seconds", defaults.auto_open.delay_seconds),
      scroll_percent: smrCoerceRangeInt(smrOwn(rawAutoOpen, "scroll_percent"), "auto_open.scroll_percent", defaults.auto_open.scroll_percent),
      frequency: coerceEnum(smrOwn(rawAutoOpen, "frequency"), FREQUENCIES, defaults.auto_open.frequency),
      cooldown_days: smrCoerceRangeInt(smrOwn(rawAutoOpen, "cooldown_days"), "auto_open.cooldown_days", defaults.auto_open.cooldown_days),
    },
    dismiss: {
      enabled: smrCoerceBool(smrOwn(rawDismiss, "enabled"), defaults.dismiss.enabled),
      days: smrCoerceRangeInt(smrOwn(rawDismiss, "days"), "dismiss.days", defaults.dismiss.days),
    },
    targeting: {
      include: smrCoercePathList(smrOwn(rawTargeting, "include")),
      exclude: smrCoercePathList(smrOwn(rawTargeting, "exclude")),
    },
    experiment: {
      enabled: smrCoerceBool(smrOwn(rawExperiment, "enabled"), defaults.experiment.enabled),
      variant_b_position: coerceEnum(smrOwn(rawExperiment, "variant_b_position"), SMR_FLOAT_POSITIONS, defaults.experiment.variant_b_position),
      split: smrCoerceRangeInt(smrOwn(rawExperiment, "split"), "experiment.split", defaults.experiment.split),
    },
    visitor_reposition: smrOwn(raw, "visitor_reposition") === true,
    data_layer: smrOwn(raw, "data_layer") === true,
    events: smrOwn(raw, "events") === true,
    star_color: smrCoerceHex(smrOwn(raw, "star_color")) || SMR_FLOAT_STAR_DEFAULT,
    summary: {
      rating: smrCoerceRating(smrOwn(rawSummary, "rating")),
      count: smrCoerceCount(smrOwn(rawSummary, "count")),
      source: coerceEnum(source, SMR_FLOAT_SOURCES, "mixed"),
    },
  };
}

/** Appends today's inline widget iframe to THIS div. */
async function smrRenderInlineWidget(div, token, index, api) {
  div.setAttribute("data-smr-rendered", "inline");
  const iframe = await createIframe(token, index, "widget", api);
  div.appendChild(iframe);
}

/** Slots each floating widget needs: show_on "all" takes both device classes. */
function smrSlotsFor(cfg) {
  if (cfg.show_on === "desktop") {
    return ["desktop"];
  }
  if (cfg.show_on === "mobile") {
    return ["mobile"];
  }
  return ["desktop", "mobile"];
}

/** DOM order, starting from the held slots; the first candidate whose slots are all free wins them. */
function smrClaimFloatingSlots(candidates, held = smrHeldSlots()) {
  const taken = { desktop: Boolean(held.desktop), mobile: Boolean(held.mobile) };
  const winners = [];
  candidates
    .slice()
    .sort((a, b) => a.index - b.index)
    .forEach((candidate) => {
      const slots = smrSlotsFor(candidate.cfg);
      if (slots.some((slot) => taken[slot])) {
        return;
      }
      slots.forEach((slot) => {
        taken[slot] = true;
      });
      winners.push({ ...candidate, slots });
    });
  return winners;
}

/** Dismissed candidates are dropped; untargeted ones wait in smrFloatPending without a shell; the rest claim free slots. */
function smrMountFloatingCandidates(candidates) {
  const live = [];
  candidates.forEach((candidate) => {
    if (smrDismissedTokens.has(candidate.token) || smrIsDismissed(candidate.token)) {
      return;
    }
    if (!smrIsTargeted(candidate.cfg.targeting, location.pathname)) {
      smrFloatPending.push(candidate);
      return;
    }
    live.push(candidate);
  });
  smrFloatPending.sort((a, b) => a.index - b.index);
  smrClaimFloatingSlots(live).forEach((winner) => {
    smrMountFloatingWidget(winner.token, winner.index, winner.api, winner.cfg, winner.div, winner.slots);
  });
}

/** Slots held by registered live shells and by any mounted root (this or another loader copy). */
function smrHeldSlots() {
  const held = { desktop: false, mobile: false };
  const hold = (slot) => {
    if (Object.prototype.hasOwnProperty.call(held, slot)) {
      held[slot] = true;
    }
  };
  smrFloatShells.forEach((shell) => {
    if (!shell.state.tornDown) {
      shell.slots.forEach(hold);
    }
  });
  document.querySelectorAll("[data-smr-float-root]").forEach((root) => {
    (root.getAttribute("data-smr-float-root") || "").split(" ").forEach(hold);
  });
  return held;
}

/** Any exception removes what was mounted and renders the inline widget into the original div. */
function smrMountFloatingWidget(token, index, api, cfg, div, slots) {
  const held = smrHeldSlots();
  if (slots.some((slot) => held[slot])) {
    return null;
  }
  let shell = null;
  try {
    const placement = smrResolvePosition(token, cfg);
    shell = smrBuildFloatingShell(cfg, {
      token,
      index,
      api,
      div,
      slots,
      position: placement.position,
      variant: placement.variant,
    });
    smrArmReveal(shell);
    smrFloatShells.push(shell);
    return shell;
  } catch (error) {
    if (shell) {
      smrTeardownFloating(shell);
    }
    smrRenderInlineWidget(div, token, index, api);
    return null;
  }
}

// ===========================================================================
// Floating review widget: shell
// ===========================================================================

const SMR_FLOAT_CSS = `
:host{all:initial !important;display:block !important;position:fixed !important;top:0 !important;left:0 !important;width:0 !important;height:0 !important;margin:0 !important;padding:0 !important;border:0 !important;overflow:visible !important;z-index:${SMR_FLOAT_Z_INDEX} !important;pointer-events:none !important;visibility:visible !important;opacity:1 !important;transform:none !important;filter:none !important;contain:none !important;}
:host([data-smr-preview]){position:absolute !important;width:100% !important;height:100% !important;}
:host([data-smr-preview]) .smr-fw{--smr-pos:absolute;}
.smr-fw{--smr-pos:fixed;--smr-base:translateY(0);--smr-hide:12px;--smr-drag:0px;--smr-dx:0px;--smr-dy:0px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:14px;font-weight:400;font-style:normal;line-height:1.4;letter-spacing:normal;text-align:left;text-transform:none;color:var(--smr-text);-webkit-font-smoothing:antialiased;}
.smr-fw *,.smr-fw *::before,.smr-fw *::after{box-sizing:border-box;}
.smr-fw button{font:inherit;color:inherit;margin:0;cursor:pointer;-webkit-appearance:none;appearance:none;text-transform:none;}
.smr-fw button:focus{outline:none;}
.smr-fw button:focus-visible{outline:2px solid var(--smr-accent);outline-offset:2px;}
.smr-fw svg{display:block;flex:none;}
.smr-fw-teaser-wrap{position:var(--smr-pos);display:flex;align-items:center;gap:6px;visibility:hidden;pointer-events:auto;}
.smr-fw[data-revealed="true"][data-active="true"][data-open="false"][data-targeted="true"][data-dismissed="false"] .smr-fw-teaser-wrap{visibility:visible;}
.smr-fw-dismiss{position:absolute;top:-8px;display:flex;align-items:center;justify-content:center;width:24px;height:24px;min-width:24px;min-height:24px;padding:0;border:1px solid rgba(127,127,127,.35);border-radius:50%;background:var(--smr-surface);color:var(--smr-text);box-shadow:0 2px 6px rgba(0,0,0,.2);}
.smr-fw-dismiss svg{width:14px;height:14px;}
.smr-fw[data-pos$="-left"] .smr-fw-dismiss{right:-8px;}
.smr-fw[data-pos$="-right"] .smr-fw-dismiss{left:-8px;}
.smr-fw-teaser{display:flex;align-items:center;gap:10px;min-height:64px;max-width:320px;padding:10px 16px;border:1px solid rgba(127,127,127,.25);border-radius:999px;background:var(--smr-surface);color:var(--smr-text);box-shadow:0 6px 24px rgba(0,0,0,.18);transition:box-shadow .2s ease;}
.smr-fw[data-device="desktop"] .smr-fw-teaser{border-radius:10px;}
.smr-fw-teaser:hover{box-shadow:0 8px 28px rgba(0,0,0,.24);}
.smr-fw-icon{width:24px;height:24px;color:var(--smr-accent);}
.smr-fw-meta{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0;}
.smr-fw-score{display:flex;align-items:center;gap:6px;}
.smr-fw-rating{font-size:16px;font-weight:700;line-height:1;}
.smr-fw-count{font-size:13px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;}
.smr-fw-stars{position:relative;display:inline-block;direction:ltr;line-height:0;color:var(--smr-star);}
.smr-fw-stars-row{display:flex;gap:1px;direction:ltr;}
.smr-fw-stars-empty{opacity:.3;}
.smr-fw-stars-fill{position:absolute;top:0;left:0;width:var(--smr-fill);overflow:hidden;}
.smr-fw-star-one{display:none;width:16px;height:16px;color:var(--smr-star);}
.smr-fw-count-short{display:none;font-size:13px;line-height:1;}
.smr-fw-chevron{width:20px;height:20px;color:var(--smr-accent);transition:transform .25s ease;}
.smr-fw[data-device="desktop"][data-pos^="bottom-"] .smr-fw-teaser-wrap{bottom:var(--smr-oy);}
.smr-fw[data-device="desktop"][data-pos^="top-"] .smr-fw-teaser-wrap{top:var(--smr-oy);}
.smr-fw[data-device="desktop"][data-pos^="middle-"] .smr-fw-teaser-wrap{top:50%;transform:translateY(-50%);}
.smr-fw[data-device="desktop"][data-pos$="-left"] .smr-fw-teaser-wrap{left:var(--smr-ox);}
.smr-fw[data-device="desktop"][data-pos$="-right"] .smr-fw-teaser-wrap{right:var(--smr-ox);}
.smr-fw[data-device="desktop"][data-pos^="top-"] .smr-fw-chevron{transform:rotate(180deg);}
.smr-fw[data-device="desktop"][data-pos="middle-left"] .smr-fw-chevron{transform:rotate(90deg);}
.smr-fw[data-device="desktop"][data-pos="middle-right"] .smr-fw-chevron{transform:rotate(-90deg);}
.smr-fw[data-device="desktop"][data-dragging="true"] .smr-fw-teaser-wrap{transform:translate(var(--smr-dx),var(--smr-dy));}
.smr-fw[data-device="desktop"][data-dragging="true"][data-pos^="middle-"] .smr-fw-teaser-wrap{transform:translate(var(--smr-dx),var(--smr-dy)) translateY(-50%);}
.smr-fw[data-dragging="true"] *{transition:none !important;}
.smr-fw-dialog{--smr-shift:var(--smr-hide);position:var(--smr-pos);display:flex;flex-direction:column;width:380px;max-width:calc(100 * var(--smr-vw) - 32px);max-height:min(640px, calc(100 * var(--smr-vh) - 120px));background:var(--smr-surface);color:var(--smr-text);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.25);overflow:hidden;visibility:hidden;opacity:0;pointer-events:auto;transform:var(--smr-base) translateY(var(--smr-shift)) translateY(var(--smr-drag));transition:opacity .25s ease,transform .25s ease,visibility 0s linear .25s;}
.smr-fw[data-open="true"] .smr-fw-dialog{--smr-shift:0px;visibility:visible;opacity:1;transition:opacity .25s ease,transform .25s ease,visibility 0s linear 0s;}
.smr-fw[data-device="desktop"][data-pos^="bottom-"] .smr-fw-dialog{bottom:var(--smr-oy);}
.smr-fw[data-device="desktop"][data-pos^="top-"] .smr-fw-dialog{top:var(--smr-oy);--smr-hide:-12px;}
.smr-fw[data-device="desktop"][data-pos^="middle-"] .smr-fw-dialog{top:50%;--smr-base:translateY(-50%);}
.smr-fw[data-device="desktop"][data-pos$="-left"] .smr-fw-dialog{left:var(--smr-ox);}
.smr-fw[data-device="desktop"][data-pos$="-right"] .smr-fw-dialog{right:var(--smr-ox);}
.smr-fw[data-device="mobile"] .smr-fw-teaser-wrap{bottom:0;left:0;right:0;}
.smr-fw[data-device="mobile"][data-mobile-style="bar"] .smr-fw-teaser{width:100%;max-width:none;min-height:64px;border-width:1px 0 0;border-radius:16px 16px 0 0;padding:10px 16px calc(10px + env(safe-area-inset-bottom));}
.smr-fw[data-device="mobile"][data-mobile-style="bar"] .smr-fw-chevron{margin-left:auto;}
.smr-fw[data-device="mobile"][data-mobile-style="bar"] .smr-fw-dismissible .smr-fw-teaser{padding-right:48px;}
.smr-fw[data-device="mobile"][data-mobile-style="bar"] .smr-fw-dismiss{top:50%;left:auto;right:12px;transform:translateY(-50%);}
.smr-fw[data-device="mobile"][data-mobile-style="bubble"] .smr-fw-teaser-wrap{left:auto;right:auto;bottom:calc(16px + env(safe-area-inset-bottom));}
.smr-fw[data-device="mobile"][data-mobile-style="bubble"][data-pos$="-left"] .smr-fw-teaser-wrap{left:16px;}
.smr-fw[data-device="mobile"][data-mobile-style="bubble"][data-pos$="-right"] .smr-fw-teaser-wrap{right:16px;}
.smr-fw[data-device="mobile"][data-mobile-style="bubble"] .smr-fw-teaser{min-height:44px;padding:8px 14px;gap:6px;}
.smr-fw[data-device="mobile"][data-mobile-style="bubble"] .smr-fw-teaser .smr-fw-icon,.smr-fw[data-device="mobile"][data-mobile-style="bubble"] .smr-fw-teaser .smr-fw-stars,.smr-fw[data-device="mobile"][data-mobile-style="bubble"] .smr-fw-teaser .smr-fw-count,.smr-fw[data-device="mobile"][data-mobile-style="bubble"] .smr-fw-teaser .smr-fw-chevron{display:none;}
.smr-fw[data-device="mobile"][data-mobile-style="bubble"] .smr-fw-teaser .smr-fw-star-one,.smr-fw[data-device="mobile"][data-mobile-style="bubble"] .smr-fw-teaser .smr-fw-count-short{display:block;}
.smr-fw[data-device="mobile"] .smr-fw-dialog{--smr-base:translateY(0);--smr-hide:100%;top:auto;right:0;bottom:0;left:0;width:auto;max-width:none;max-height:calc(var(--smr-sheet-h) * var(--smr-vh));height:auto;border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom);transition:opacity .3s ease-out,transform .3s ease-out,visibility 0s linear .3s;}
.smr-fw[data-device="mobile"][data-open="true"] .smr-fw-dialog{transition:opacity .3s ease-out,transform .3s ease-out,visibility 0s linear 0s;}
.smr-fw-header{position:relative;flex:none;display:flex;align-items:center;gap:10px;padding:12px 12px 12px 16px;border-bottom:1px solid rgba(127,127,127,.2);}
.smr-fw[data-device="mobile"] .smr-fw-header{padding-top:22px;touch-action:none;}
.smr-fw-handle{display:none;position:absolute;top:8px;left:50%;width:36px;height:4px;margin-left:-18px;border-radius:2px;background:var(--smr-accent);}
.smr-fw[data-device="mobile"] .smr-fw-handle{display:block;}
.smr-fw-title{display:flex;align-items:center;gap:8px;flex:1 1 auto;min-width:0;}
.smr-fw-close,.smr-fw-expand,.smr-fw-move{display:flex;align-items:center;justify-content:center;flex:none;width:32px;height:32px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--smr-text);}
.smr-fw-close:hover,.smr-fw-expand:hover,.smr-fw-move:hover{background:rgba(127,127,127,.15);}
.smr-fw-close svg,.smr-fw-expand svg,.smr-fw-move svg{width:20px;height:20px;}
.smr-fw-expand{display:none;}
.smr-fw[data-device="mobile"] .smr-fw-expand{display:flex;}
.smr-fw[data-device="mobile"] .smr-fw-move{display:none;}
.smr-fw-expand .smr-fw-icon-shrink,.smr-fw[data-expanded="true"] .smr-fw-expand .smr-fw-icon-expand{display:none;}
.smr-fw[data-expanded="true"] .smr-fw-expand .smr-fw-icon-shrink{display:block;}
.smr-fw-close .smr-fw-icon-collapse{display:none;}
.smr-fw[data-device="mobile"] .smr-fw-close .smr-fw-icon-close{display:none;}
.smr-fw[data-device="mobile"] .smr-fw-close .smr-fw-icon-collapse{display:block;}
.smr-fw-body{position:relative;flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}
.smr-fw-body:focus{outline:none;}
.smr-fw-body:focus-visible{outline:2px solid var(--smr-accent);outline-offset:-2px;}
.smr-fw-frame{min-height:120px;}
.smr-fw-frame iframe{display:block;}
.smr-fw[data-error="true"] .smr-fw-frame{visibility:hidden;height:0;min-height:0;overflow:hidden;}
.smr-fw-error{display:none;padding:24px 16px;text-align:center;}
.smr-fw[data-error="true"] .smr-fw-error{display:block;}
.smr-fw-error-text{margin:0 0 12px;}
.smr-fw-retry{padding:8px 16px;border:1px solid var(--smr-accent);border-radius:8px;background:transparent;color:var(--smr-text);}
.smr-fw-backdrop{position:var(--smr-pos);top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.35);visibility:hidden;opacity:0;pointer-events:auto;transition:opacity .3s ease,visibility 0s linear .3s;}
.smr-fw[data-device="mobile"][data-open="true"] .smr-fw-backdrop{visibility:visible;opacity:1;transition:opacity .3s ease,visibility 0s linear 0s;}
.smr-fw-live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}
@media (prefers-reduced-motion: reduce){.smr-fw *,.smr-fw *::before,.smr-fw *::after{transition-duration:0s !important;transition-delay:0s !important;animation-duration:0s !important;}}
`;

function smrEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (typeof text === "string") {
    el.textContent = text;
  }
  return el;
}

function smrSvg(className, size) {
  const svg = document.createElementNS(SMR_SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", className);
  return svg;
}

function smrSvgPath(svg, d, fill) {
  const path = document.createElementNS(SMR_SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", fill);
  svg.appendChild(path);
  return path;
}

function smrStrokeIcon(className, d) {
  const svg = smrSvg(className, 20);
  const path = smrSvgPath(svg, d, "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  return svg;
}

function smrStar(className) {
  const svg = smrSvg(className, 16);
  smrSvgPath(svg, SMR_FLOAT_STAR_PATH, "currentColor");
  return svg;
}

/** The source icon from static path data; the lookup runs on the allowlisted value only. */
function smrBuildIcon(source) {
  const paths = Object.prototype.hasOwnProperty.call(SMR_FLOAT_ICONS, source)
    ? SMR_FLOAT_ICONS[source]
    : SMR_FLOAT_ICON_NEUTRAL;
  const svg = smrSvg("smr-fw-icon", 24);
  paths.forEach((entry) => smrSvgPath(svg, entry[0], entry[1]));
  return svg;
}

/** Five stars, partly filled for fractions through --smr-fill. */
function smrBuildStars(rating) {
  const stars = smrEl("span", "smr-fw-stars");
  const empty = smrEl("span", "smr-fw-stars-row smr-fw-stars-empty");
  const fill = smrEl("span", "smr-fw-stars-row smr-fw-stars-fill");
  for (let i = 0; i < 5; i++) {
    empty.appendChild(smrStar("smr-fw-star"));
    fill.appendChild(smrStar("smr-fw-star"));
  }
  stars.appendChild(empty);
  stars.appendChild(fill);
  stars.style.setProperty("--smr-fill", (rating / 5) * 100 + "%");
  return stars;
}

/** Intl.NumberFormat for the page's lang; an invalid tag falls back to the default locale. */
function smrNumberFormat(options) {
  const lang = document.documentElement.getAttribute("lang") || undefined;
  try {
    return new Intl.NumberFormat(lang, options);
  } catch (error) {
    if (error instanceof RangeError) {
      return new Intl.NumberFormat(undefined, options);
    }
    throw error;
  }
}

/** Formatted rating and count, and the label for that count. */
function smrSummaryParts(cfg) {
  const summary = cfg.summary;
  return {
    rating: smrNumberFormat({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(summary.rating),
    count: smrNumberFormat().format(summary.count),
    label: summary.count === 1 ? cfg.label_one : cfg.label,
  };
}

/** strings.a11y_summary with {rating}, {count} and {label} filled; any other {…} stays literal. */
function smrSummaryText(cfg) {
  const parts = smrSummaryParts(cfg);
  return cfg.strings.a11y_summary.replace(/\{(rating|count|label)\}/g, (match, key) => parts[key]);
}

/** Icon, rating, stars and "{count} {label}"; the bubble variant reads the single star and the short count. */
function smrBuildSummary(cfg, className) {
  const parts = smrSummaryParts(cfg);
  const summary = smrEl("span", className);
  summary.appendChild(smrBuildIcon(cfg.summary.source));
  const meta = smrEl("span", "smr-fw-meta");
  const score = smrEl("span", "smr-fw-score");
  score.appendChild(smrEl("span", "smr-fw-rating", parts.rating));
  score.appendChild(smrBuildStars(cfg.summary.rating));
  meta.appendChild(score);
  meta.appendChild(smrEl("span", "smr-fw-count", parts.count + " " + parts.label));
  summary.appendChild(meta);
  return summary;
}

function smrAppendStyleElement(shadowRoot, css) {
  const style = document.createElement("style");
  style.textContent = css;
  shadowRoot.appendChild(style);
  return "style";
}

/** A constructable stylesheet where supported (allowed under CSP style-src 'self'), else a <style> element. */
function smrApplyShellStyles(shadowRoot) {
  if (
    typeof CSSStyleSheet === "function" &&
    typeof CSSStyleSheet.prototype.replaceSync === "function" &&
    "adoptedStyleSheets" in shadowRoot
  ) {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(SMR_FLOAT_CSS);
      shadowRoot.adoptedStyleSheets = [sheet];
      return "adopted";
    } catch (error) {
      return smrAppendStyleElement(shadowRoot, SMR_FLOAT_CSS);
    }
  }
  return smrAppendStyleElement(shadowRoot, SMR_FLOAT_CSS);
}

function smrApplyPlacement(shell, position) {
  const wrap = shell.el.wrap;
  shell.state.position = position;
  wrap.setAttribute("data-pos", position);
  wrap.style.setProperty("--smr-ox", shell.cfg.offset_x + "px");
  wrap.style.setProperty("--smr-oy", shell.cfg.offset_y + "px");
}

/** Custom properties from coerced values only; dark uses fixed colors, custom the owner's. */
function smrApplyTheme(shell, cfg) {
  const colors = cfg.theme === "custom"
    ? cfg.colors
    : SMR_FLOAT_THEME_COLORS[cfg.theme === "dark" ? "dark" : "light"];
  const wrap = shell.el.wrap;
  wrap.setAttribute("data-theme", cfg.theme);
  wrap.style.setProperty("--smr-surface", colors.surface);
  wrap.style.setProperty("--smr-text", colors.text);
  wrap.style.setProperty("--smr-accent", colors.accent);
  wrap.style.setProperty("--smr-star", cfg.star_color);
}

function smrViewportUnit() {
  if (typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("height", "1dvh")) {
    return "1dvh";
  }
  return "1vh";
}

/**
 * Device class on the same dialog and iframe (never moved). An excluded class
 * closes the panel without moving focus and hides the shell; leaving mobile
 * resets the sheet height.
 */
function smrApplyDevice(shell, device) {
  const cfg = shell.cfg;
  const wrap = shell.el.wrap;
  shell.state.device = device;
  wrap.setAttribute("data-device", device);
  const active = cfg.show_on === "all" || cfg.show_on === device;
  wrap.setAttribute("data-active", active ? "true" : "false");
  if (!active) {
    smrClosePanel(shell, { restoreFocus: false });
  }
  if (device !== "mobile") {
    smrSetExpanded(shell, false);
  }
  smrMaybeImpression(shell);
}

/** The preview's vh/vw come from its container, kept current while a ResizeObserver exists. */
function smrSizePreview(shell, container) {
  const wrap = shell.el.wrap;
  const size = () => {
    wrap.style.setProperty("--smr-vh", container.clientHeight ? container.clientHeight / 100 + "px" : "1vh");
    wrap.style.setProperty("--smr-vw", container.clientWidth ? container.clientWidth / 100 + "px" : "1vw");
  };
  size();
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(size);
    observer.observe(container);
    shell.state.teardownFns.push(() => observer.disconnect());
  }
}

function smrWatchDevice(shell) {
  const mql = typeof window.matchMedia === "function" ? window.matchMedia(SMR_FLOAT_MOBILE_QUERY) : null;
  smrApplyDevice(shell, mql && mql.matches ? "mobile" : "desktop");
  if (!mql) {
    return;
  }
  const onChange = (event) => smrApplyDevice(shell, event.matches ? "mobile" : "desktop");
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
    shell.state.teardownFns.push(() => mql.removeEventListener("change", onChange));
  } else if (typeof mql.addListener === "function") {
    mql.addListener(onChange);
    shell.state.teardownFns.push(() => mql.removeListener(onChange));
  }
}

/** Builds the host, shadow root, teaser, dialog and listeners; on any error removes what it added and rethrows. */
function smrBuildFloatingShell(cfg, options) {
  const shell = {
    cfg,
    token: options.token,
    index: options.index,
    api: options.api,
    div: options.div,
    slots: options.slots,
    src: options.src,
    host: null,
    el: {},
    state: {
      open: false,
      openedByVisitor: false,
      revealed: false,
      device: "desktop",
      iframe: null,
      dispose: null,
      creating: false,
      timer: null,
      loaded: false,
      failed: false,
      tornDown: false,
      teardownFns: [],
      preview: Boolean(options.preview),
      variant: options.variant,
      position: options.position,
      targeted: true,
      dismissed: false,
      visitorOpened: false,
      autoOpenArmed: false,
      expanded: false,
      queue: [],
      sent: new Set(),
      flushTimer: null,
      flushTimerUsed: false,
      drag: null,
      suppressClick: false,
    },
  };

  try {
    const host = document.createElement("div");
    host.setAttribute(options.preview ? "data-smr-preview" : "data-smr-float-root", options.slots.join(" "));
    shell.host = host;
    const shadowRoot = host.attachShadow({ mode: "open" });
    smrApplyShellStyles(shadowRoot);

    const dialogId = "smr-fw-dialog-" + shell.index;
    const wrap = smrEl("div", "smr-fw");
    shell.el.wrap = wrap;
    wrap.setAttribute("data-mobile-style", cfg.mobile_style);
    wrap.setAttribute("data-open", "false");
    wrap.setAttribute("data-revealed", "false");
    wrap.setAttribute("data-targeted", "true");
    wrap.setAttribute("data-dismissed", "false");
    wrap.setAttribute("data-error", "false");
    wrap.style.setProperty("--smr-vh", smrViewportUnit());
    wrap.style.setProperty("--smr-vw", "1vw");
    wrap.style.setProperty("--smr-sheet-h", String(cfg.mobile_sheet_height));

    const backdrop = smrEl("div", "smr-fw-backdrop");
    shell.el.backdrop = backdrop;

    const teaserWrap = smrEl("div", cfg.dismiss.enabled ? "smr-fw-teaser-wrap smr-fw-dismissible" : "smr-fw-teaser-wrap");
    const teaser = smrEl("button", "smr-fw-teaser");
    teaser.type = "button";
    teaser.setAttribute("aria-expanded", "false");
    teaser.setAttribute("aria-controls", dialogId);
    teaser.setAttribute("aria-label", smrSummaryText(cfg) + " " + cfg.strings.show);
    const parts = smrSummaryParts(cfg);
    const teaserSummary = smrBuildSummary(cfg, "smr-fw-summary");
    const teaserScore = teaserSummary.querySelector(".smr-fw-score");
    teaserScore.insertBefore(teaserSummary.querySelector(".smr-fw-icon"), teaserScore.firstChild);
    teaserScore.appendChild(smrStar("smr-fw-star-one"));
    teaserSummary.querySelector(".smr-fw-meta").appendChild(smrEl("span", "smr-fw-count-short", parts.count));
    teaser.appendChild(teaserSummary);
    teaser.appendChild(smrStrokeIcon("smr-fw-chevron", SMR_FLOAT_STROKE_PATHS.chevron));
    teaserWrap.appendChild(teaser);
    shell.el.teaser = teaser;
    if (cfg.dismiss.enabled) {
      const dismiss = smrEl("button", "smr-fw-dismiss");
      dismiss.type = "button";
      dismiss.setAttribute("aria-label", cfg.strings.dismiss);
      dismiss.appendChild(smrStrokeIcon("smr-fw-x", SMR_FLOAT_STROKE_PATHS.close));
      teaserWrap.appendChild(dismiss);
      shell.el.dismiss = dismiss;
    }

    const dialog = smrEl("div", "smr-fw-dialog");
    dialog.id = dialogId;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "false");
    dialog.setAttribute("aria-label", cfg.label);
    const header = smrEl("div", "smr-fw-header");
    header.appendChild(smrEl("span", "smr-fw-handle"));
    header.lastChild.setAttribute("aria-hidden", "true");
    header.appendChild(smrBuildSummary(cfg, "smr-fw-title"));
    if (cfg.visitor_reposition && !cfg.experiment.enabled) {
      const move = smrEl("button", "smr-fw-move");
      move.type = "button";
      move.setAttribute("aria-label", cfg.strings.move);
      move.appendChild(smrStrokeIcon("smr-fw-icon-move", SMR_FLOAT_STROKE_PATHS.move));
      header.appendChild(move);
      shell.el.move = move;
    }
    const expand = smrEl("button", "smr-fw-expand");
    expand.type = "button";
    expand.setAttribute("aria-label", cfg.strings.expand);
    expand.setAttribute("aria-expanded", "false");
    expand.appendChild(smrStrokeIcon("smr-fw-icon-expand", SMR_FLOAT_STROKE_PATHS.expand));
    expand.appendChild(smrStrokeIcon("smr-fw-icon-shrink", SMR_FLOAT_STROKE_PATHS.shrink));
    header.appendChild(expand);
    shell.el.expand = expand;
    const close = smrEl("button", "smr-fw-close");
    close.type = "button";
    close.setAttribute("aria-label", cfg.strings.close);
    close.appendChild(smrStrokeIcon("smr-fw-icon-close", SMR_FLOAT_STROKE_PATHS.close));
    close.appendChild(smrStrokeIcon("smr-fw-icon-collapse", SMR_FLOAT_STROKE_PATHS.collapse));
    header.appendChild(close);
    shell.el.close = close;

    const body = smrEl("div", "smr-fw-body");
    // The scroll container itself takes focus, so keyboard users can scroll a long list (WCAG 2.1.1).
    body.tabIndex = 0;
    const frame = smrEl("div", "smr-fw-frame");
    const errorBox = smrEl("div", "smr-fw-error");
    errorBox.appendChild(smrEl("p", "smr-fw-error-text", cfg.strings.error));
    const retry = smrEl("button", "smr-fw-retry", cfg.strings.retry);
    retry.type = "button";
    errorBox.appendChild(retry);
    body.appendChild(frame);
    body.appendChild(errorBox);
    dialog.appendChild(header);
    dialog.appendChild(body);
    shell.el.header = header;
    shell.el.dialog = dialog;
    shell.el.frame = frame;
    shell.el.retry = retry;

    const live = smrEl("div", "smr-fw-live");
    live.setAttribute("aria-live", "polite");
    shell.el.live = live;

    wrap.appendChild(backdrop);
    wrap.appendChild(teaserWrap);
    wrap.appendChild(dialog);
    wrap.appendChild(live);
    shadowRoot.appendChild(wrap);

    smrApplyTheme(shell, cfg);
    smrApplyPlacement(shell, options.position);
    smrWireShell(shell);
    smrAttachSheetGestures(shell);
    smrAttachRepositionDrag(shell);
    if (options.preview) {
      smrApplyDevice(shell, options.device);
      smrSizePreview(shell, options.container);
    } else {
      smrWatchDevice(shell);
    }
    (options.container || document.body).appendChild(host);
    return shell;
  } catch (error) {
    smrTeardownFloating(shell);
    throw error;
  }
}

/** Teaser, close, expand, move, backdrop and retry clicks; Esc; the panel's close message; page hide flushes events. */
function smrWireShell(shell) {
  const state = shell.state;
  shell.el.teaser.addEventListener("click", () => {
    if (state.suppressClick) {
      state.suppressClick = false;
      return;
    }
    smrOpenPanel(shell, { auto: false });
  });
  shell.el.close.addEventListener("click", () => smrClosePanel(shell));
  shell.el.expand.addEventListener("click", () => smrSetExpanded(shell, !state.expanded));
  shell.el.backdrop.addEventListener("click", () => smrClosePanel(shell));
  shell.el.retry.addEventListener("click", () => smrRetryPanel(shell));
  if (shell.el.dismiss) {
    shell.el.dismiss.addEventListener("click", () => smrDismiss(shell));
  }
  if (shell.el.move) {
    shell.el.move.addEventListener("click", () => smrMirrorPosition(shell));
  }

  if (!state.preview) {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        smrFlushEvents(shell);
      }
    };
    const onPageHide = () => smrFlushEvents(shell);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    state.teardownFns.push(() => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    });
  }

  // Capture phase, so a visible survey shell is still detected before the
  // survey's own Esc handler closes it: Esc closes only the top layer.
  const onKeydown = (event) => {
    if (event.key !== "Escape" || !shell.state.open) {
      return;
    }
    if (document.querySelector(".smr-survey-wrapper.smr-visible")) {
      return;
    }
    smrClosePanel(shell);
  };
  document.addEventListener("keydown", onKeydown, true);
  shell.state.teardownFns.push(() => document.removeEventListener("keydown", onKeydown, true));

  const onMessage = (event) => {
    const iframe = shell.state.iframe;
    if (!iframe || iframe.contentWindow === null || event.source !== iframe.contentWindow) {
      return;
    }
    const payload = smrOwn(event.data, "smrWidget");
    if (smrOwn(payload, "event") === "close") {
      smrClosePanel(shell);
    }
  };
  window.addEventListener("message", onMessage);
  shell.state.teardownFns.push(() => window.removeEventListener("message", onMessage));
}

function smrRevealTeaser(shell) {
  shell.state.revealed = true;
  shell.el.wrap.setAttribute("data-revealed", "true");
}

/** auto => no focus move and a live-region announce; otherwise focus moves to close. */
function smrOpenPanel(shell, options) {
  const state = shell.state;
  const auto = Boolean(options && options.auto);
  if (
    state.open ||
    state.failed ||
    !state.targeted ||
    state.dismissed ||
    shell.el.wrap.getAttribute("data-active") !== "true"
  ) {
    return false;
  }
  state.open = true;
  state.openedByVisitor = !auto;
  if (!auto) {
    state.visitorOpened = true;
  }
  shell.el.wrap.setAttribute("data-open", "true");
  shell.el.teaser.setAttribute("aria-expanded", "true");
  smrEnsurePanelIframe(shell);
  smrQueueEvent(shell, auto ? "auto_open" : "open");
  if (auto) {
    shell.el.live.textContent = shell.cfg.strings.opened;
  } else {
    shell.el.close.focus();
  }
  return true;
}

/** Focus returns to the teaser only when the visitor opened the panel. */
function smrClosePanel(shell, options) {
  const state = shell.state;
  if (!state.open) {
    return false;
  }
  const restoreFocus = !(options && options.restoreFocus === false) && state.openedByVisitor;
  state.open = false;
  state.openedByVisitor = false;
  shell.el.wrap.setAttribute("data-open", "false");
  shell.el.teaser.setAttribute("aria-expanded", "false");
  smrSetExpanded(shell, false);
  if (restoreFocus) {
    shell.el.teaser.focus();
  }
  return true;
}

/** Lazy, once: success is the first height message; none within SMR_PANEL_TIMEOUT_MS shows the error and retry. */
function smrEnsurePanelIframe(shell) {
  const state = shell.state;
  if (state.iframe || state.creating || state.tornDown) {
    return;
  }
  if (state.preview && !shell.src) {
    shell.el.wrap.setAttribute("data-error", "true");
    return;
  }
  state.creating = true;
  shell.el.wrap.setAttribute("data-error", "false");
  createIframe(shell.token, shell.index, "widget", shell.api, {
    mode: "floating",
    onHeight: () => smrPanelLoaded(shell),
    src: shell.src,
  })
    .then((created) => {
      state.creating = false;
      if (state.tornDown) {
        created.dispose();
        return;
      }
      state.iframe = created.iframe;
      state.dispose = created.dispose;
      state.loaded = false;
      shell.el.frame.appendChild(created.iframe);
      state.timer = setTimeout(() => smrPanelTimedOut(shell), SMR_PANEL_TIMEOUT_MS);
    })
    .catch(() => smrFailFloating(shell));
}

function smrPanelLoaded(shell) {
  const state = shell.state;
  if (state.timer !== null) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  state.loaded = true;
  shell.el.wrap.setAttribute("data-error", "false");
}

function smrPanelTimedOut(shell) {
  shell.state.timer = null;
  if (!shell.state.loaded) {
    shell.el.wrap.setAttribute("data-error", "true");
  }
}

/** Removes the old iframe and its listener, then creates a new one. */
function smrRetryPanel(shell) {
  const state = shell.state;
  smrDisposePanelIframe(state);
  smrEnsurePanelIframe(shell);
}

function smrDisposePanelIframe(state) {
  if (state.timer !== null) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  if (state.dispose) {
    state.dispose();
    state.dispose = null;
  }
  if (state.iframe && state.iframe.parentNode) {
    state.iframe.parentNode.removeChild(state.iframe);
  }
  state.iframe = null;
  state.loaded = false;
}

/** Removes listeners, timers, the media listener and the host node. Safe on a partly built shell. */
function smrTeardownFloating(shell) {
  const state = shell.state;
  smrFlushEvents(shell);
  state.tornDown = true;
  const registered = smrFloatShells.indexOf(shell);
  if (registered !== -1) {
    smrFloatShells.splice(registered, 1);
  }
  const fns = state.teardownFns;
  state.teardownFns = [];
  fns.forEach((fn) => fn());
  smrDisposePanelIframe(state);
  if (shell.host && shell.host.parentNode) {
    shell.host.parentNode.removeChild(shell.host);
  }
}

/** A floating failure after mount: tear down, then render the inline widget into the original div. */
function smrFailFloating(shell) {
  if (shell.state.failed) {
    return;
  }
  shell.state.failed = true;
  smrTeardownFloating(shell);
  smrRenderInlineWidget(shell.div, shell.token, shell.index, shell.api);
}

// ===========================================================================
// Floating review widget: reveal, auto-open, targeting and dismissal
// ===========================================================================

/** scheduleTrigger() cannot be cancelled, so every floating callback no-ops after teardown. */
function smrGuarded(shell, fn) {
  return (...args) => {
    if (!shell.state.tornDown) {
      fn(...args);
    }
  };
}

function smrPageVisible() {
  return document.visibilityState !== "hidden" && document.prerendering !== true;
}

/** Runs fn now on a visible page, else once on the next visibilitychange to visible. */
function smrWhenVisible(shell, fn) {
  if (smrPageVisible()) {
    fn();
    return;
  }
  const onChange = () => {
    if (!smrPageVisible()) {
      return;
    }
    document.removeEventListener("visibilitychange", onChange);
    fn();
  };
  document.addEventListener("visibilitychange", onChange);
  shell.state.teardownFns.push(() => document.removeEventListener("visibilitychange", onChange));
}

function smrArmReveal(shell) {
  if (shell.state.preview) {
    smrRevealNow(shell);
    return;
  }
  scheduleTrigger(shell.cfg.reveal, smrGuarded(shell, () => smrWhenVisible(shell, () => smrRevealNow(shell))));
}

/** The auto-open clock starts here, when the teaser actually becomes visible. */
function smrRevealNow(shell) {
  if (shell.state.revealed) {
    return;
  }
  smrRevealTeaser(shell);
  smrMaybeImpression(shell);
  smrArmAutoOpen(shell);
}

function smrArmAutoOpen(shell) {
  const state = shell.state;
  if (!shell.cfg.auto_open.enabled || state.preview || state.autoOpenArmed) {
    return;
  }
  state.autoOpenArmed = true;
  scheduleTrigger(shell.cfg.auto_open, smrGuarded(shell, () => smrTryAutoOpen(shell)));
}

/** One shot per page load: a failed check does not re-arm; a hidden tab waits and checks again. */
function smrTryAutoOpen(shell) {
  const state = shell.state;
  if (
    state.device !== "desktop" ||
    !smrShellShowing(shell) ||
    state.open ||
    state.visitorOpened ||
    document.querySelector(".smr-survey-wrapper.smr-visible")
  ) {
    return;
  }
  if (!smrPageVisible()) {
    smrWhenVisible(shell, () => smrTryAutoOpen(shell));
    return;
  }
  if (!smrShouldAutoOpen(shell.token, shell.cfg.auto_open)) {
    return;
  }
  if (smrOpenPanel(shell, { auto: true })) {
    smrMarkAutoOpened(shell.token);
  }
}

function smrShellShowing(shell) {
  const state = shell.state;
  return (
    state.revealed &&
    shell.el.wrap.getAttribute("data-active") === "true" &&
    state.targeted &&
    !state.dismissed &&
    !state.failed
  );
}

function smrMaybeImpression(shell) {
  if (smrShellShowing(shell) && !shell.state.preview) {
    smrQueueEvent(shell, "impression");
  }
}

/**
 * At most one event per name and path per page load; preview shells record nothing.
 * The dataLayer push still happens under webdriver or with events off; the beacon does not.
 */
function smrQueueEvent(shell, name) {
  const state = shell.state;
  const key = name + "|" + location.pathname;
  if (state.preview || state.sent.has(key)) {
    return;
  }
  state.sent.add(key);
  smrPushDataLayer(shell, name, state.variant);
  if (!shell.cfg.events || navigator.webdriver === true) {
    return;
  }
  state.queue.push([name, state.variant, state.device]);
  if (!state.flushTimerUsed) {
    state.flushTimerUsed = true;
    state.flushTimer = setTimeout(() => smrFlushEvents(shell), SMR_EVENT_FLUSH_MS);
  }
}

/** Empties the queue once, so no batch is sent twice. */
function smrFlushEvents(shell) {
  const state = shell.state;
  if (state.flushTimer !== null) {
    clearTimeout(state.flushTimer);
    state.flushTimer = null;
  }
  const entries = state.queue.splice(0);
  for (let i = 0; i < entries.length; i += SMR_EVENT_BATCH_MAX) {
    smrSendEventBatch(shell.api, shell.token, entries.slice(i, i + SMR_EVENT_BATCH_MAX));
  }
}

/** A text/plain body keeps both transports simple requests (no preflight); no custom headers. */
function smrSendEventBatch(api, token, entries) {
  const url = (api || urlEnv) + SMR_WIDGET_EVENTS_PATH + encodeURIComponent(token);
  const body = JSON.stringify({ e: entries });
  try {
    if (
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(url, new Blob([body], { type: "text/plain;charset=UTF-8" }))
    ) {
      return;
    }
  } catch (error) {
    // A throwing sendBeacon falls through to the single fetch below.
  }
  fetch(url, { method: "POST", keepalive: true, credentials: "omit", body }).catch(() => {
    // Engagement is best effort: a lost batch is not retried and must not surface on the host page.
  });
}

/** Only into an existing array; the loader never creates window.dataLayer. */
function smrPushDataLayer(shell, name, variant) {
  if (!shell.cfg.data_layer || smrDataLayerBroken || !Array.isArray(window.dataLayer)) {
    return;
  }
  try {
    window.dataLayer.push({ event: "smr_widget", smr_action: name, smr_variant: variant });
  } catch (error) {
    smrDataLayerBroken = true;
  }
}

/** Untargeted closes without moving focus and keeps the iframe. */
function smrSetTargeted(shell, targeted) {
  shell.state.targeted = targeted;
  shell.el.wrap.setAttribute("data-targeted", targeted ? "true" : "false");
  if (targeted) {
    smrMaybeImpression(shell);
  } else {
    smrClosePanel(shell, { restoreFocus: false });
  }
}

function smrIsTargeted(targeting, pathname) {
  const matches = (pattern) => smrPathMatches(pattern, pathname);
  return (targeting.include.length === 0 || targeting.include.some(matches)) && !targeting.exclude.some(matches);
}

/** Lowercased, one trailing slash stripped; "*" is any run, every other character literal; the raw percent-encoded path. */
function smrPathMatches(pattern, pathname) {
  const normalize = (value) => {
    const lower = value.toLowerCase();
    return lower.length > 1 && lower.charAt(lower.length - 1) === "/" ? lower.slice(0, -1) : lower;
  };
  const source = normalize(pattern)
    .split(/\*+/)
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp("^" + source + "$").test(normalize(pathname));
}

/** Hides the shell for this page (and the device unless preview); shell, slots and iframe stay. */
function smrDismiss(shell) {
  const state = shell.state;
  smrClosePanel(shell, { restoreFocus: false });
  state.dismissed = true;
  shell.el.wrap.setAttribute("data-dismissed", "true");
  smrDismissedTokens.add(shell.token);
  if (!state.preview) {
    smrMarkDismissed(shell.token, shell.cfg.dismiss.days);
    smrQueueEvent(shell, "dismiss");
  }
  shell.el.dismiss.blur();
}

// ===========================================================================
// Floating review widget: device storage (one JSON record per widget)
// ===========================================================================

function smrFloatStorageKey(token) {
  return SMR_FLOAT_STORAGE_PREFIX + token;
}

/** {} when storage is blocked or the record is corrupt; both set smrStorageBlocked so auto-open fails closed. */
function smrReadFloatRecord(token) {
  try {
    const raw = window.localStorage.getItem(smrFloatStorageKey(token));
    const record = raw === null ? {} : JSON.parse(raw);
    if (smrIsPlainObject(record)) {
      return record;
    }
  } catch (error) {
    // Blocked storage or corrupt JSON: flagged below and read as an empty record.
  }
  smrStorageBlocked = true;
  return {};
}

function smrWriteFloatRecord(token, patch) {
  const record = smrReadFloatRecord(token);
  if (!smrStorageAvailable()) {
    return false;
  }
  try {
    window.localStorage.setItem(smrFloatStorageKey(token), JSON.stringify({ ...record, ...patch }));
    return true;
  } catch (error) {
    smrStorageBlocked = true;
    return false;
  }
}

function smrStorageAvailable() {
  if (smrStorageBlocked === null) {
    const probe = SMR_FLOAT_STORAGE_PREFIX + "_probe";
    try {
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      smrStorageBlocked = false;
    } catch (error) {
      smrStorageBlocked = true;
    }
  }
  return !smrStorageBlocked;
}

function smrIsDismissed(token) {
  const until = smrOwn(smrReadFloatRecord(token), "dismissed_until");
  return Number.isFinite(until) && until > Date.now();
}

function smrMarkDismissed(token, days) {
  return smrWriteFloatRecord(token, { dismissed_until: Date.now() + days * 86400000 });
}

function smrShouldAutoOpen(token, autoOpen) {
  if (!smrStorageAvailable()) {
    return false;
  }
  if (autoOpen.frequency === "every_visit") {
    return true;
  }
  if (autoOpen.frequency === "session") {
    try {
      return window.sessionStorage.getItem(smrFloatStorageKey(token)) !== "1";
    } catch (error) {
      smrStorageBlocked = true;
      return false;
    }
  }
  const last = smrOwn(smrReadFloatRecord(token), "auto_opened_at");
  if (!smrStorageAvailable()) {
    return false;
  }
  return !Number.isFinite(last) || Date.now() - last >= autoOpen.cooldown_days * 86400000;
}

function smrMarkAutoOpened(token) {
  smrWriteFloatRecord(token, { auto_opened_at: Date.now() });
  try {
    window.sessionStorage.setItem(smrFloatStorageKey(token), "1");
  } catch (error) {
    smrStorageBlocked = true;
  }
}

/** "" when no test runs; "a" when storage is blocked or the first write fails; stored once per device. */
function smrBucket(token, experiment) {
  if (!experiment.enabled) {
    return "";
  }
  if (!smrStorageAvailable()) {
    return "a";
  }
  const stored = smrOwn(smrReadFloatRecord(token), "bucket");
  if (stored === "a" || stored === "b") {
    return stored;
  }
  const bucket = Math.random() * 100 < experiment.split ? "a" : "b";
  return smrWriteFloatRecord(token, { bucket }) ? bucket : "a";
}

/** Bucket "b" uses variant_b_position; a visitor's stored override applies only without a running test. */
function smrResolvePosition(token, cfg) {
  const variant = smrBucket(token, cfg.experiment);
  if (variant === "b") {
    return { variant, position: cfg.experiment.variant_b_position };
  }
  if (cfg.visitor_reposition && !cfg.experiment.enabled) {
    return { variant, position: smrReadPositionOverride(token) || cfg.position };
  }
  return { variant, position: cfg.position };
}

function smrReadPositionOverride(token) {
  const position = smrOwn(smrReadFloatRecord(token), "position");
  return SMR_FLOAT_POSITIONS.indexOf(position) !== -1 ? position : null;
}

function smrWritePositionOverride(token, position) {
  return smrWriteFloatRecord(token, { position });
}

// ===========================================================================
// Floating review widget: sheet gestures, expand and visitor reposition
// ===========================================================================

function smrSetExpanded(shell, expanded) {
  const wrap = shell.el.wrap;
  shell.state.expanded = expanded;
  wrap.setAttribute("data-expanded", expanded ? "true" : "false");
  wrap.style.setProperty("--smr-sheet-h", String(expanded ? SMR_SHEET_EXPANDED_VH : shell.cfg.mobile_sheet_height));
  shell.el.expand.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function smrCapturePointer(el, pointerId) {
  if (typeof el.setPointerCapture !== "function") {
    return;
  }
  try {
    el.setPointerCapture(pointerId);
  } catch (error) {
    // An inactive pointer cannot be captured; the drag still tracks moves on the element itself.
  }
}

function smrStartsDrag(event) {
  return event.isPrimary && (event.pointerType !== "mouse" || event.button === 0);
}

/** Ends the drag owned by this pointer and clears the drag offsets; null for any other pointer. */
function smrEndDrag(shell, event) {
  const state = shell.state;
  const drag = state.drag;
  if (!drag || event.pointerId !== drag.id) {
    return null;
  }
  const wrap = shell.el.wrap;
  state.drag = null;
  wrap.setAttribute("data-dragging", "false");
  wrap.style.setProperty("--smr-drag", "0px");
  wrap.style.setProperty("--smr-dx", "0px");
  wrap.style.setProperty("--smr-dy", "0px");
  return drag;
}

/**
 * Mobile sheet: a down-drag follows the pointer; an up-drag waits for release.
 * Collapsed: close past 30% of the height or on a down flick; expand on 48 px up or an up flick.
 * Expanded: back to the configured height on 48 px down or a down flick; never closes.
 */
function smrAttachSheetGestures(shell) {
  const state = shell.state;
  const header = shell.el.header;
  header.addEventListener("pointerdown", (event) => {
    if (state.device !== "mobile" || !state.open || state.drag || !smrStartsDrag(event) || event.target.closest("button")) {
      return;
    }
    smrCapturePointer(header, event.pointerId);
    state.drag = {
      id: event.pointerId,
      y: event.clientY,
      t: event.timeStamp,
      h: shell.el.dialog.getBoundingClientRect().height,
      expanded: state.expanded,
    };
    shell.el.wrap.setAttribute("data-dragging", "true");
  });
  header.addEventListener("pointermove", (event) => {
    const drag = state.drag;
    if (drag && event.pointerId === drag.id) {
      shell.el.wrap.style.setProperty("--smr-drag", Math.max(event.clientY - drag.y, 0) + "px");
    }
  });
  header.addEventListener("pointerup", (event) => {
    const drag = smrEndDrag(shell, event);
    if (!drag) {
      return;
    }
    const dy = event.clientY - drag.y;
    const velocity = dy / Math.max(1, event.timeStamp - drag.t);
    if (drag.expanded) {
      if (dy >= SMR_SHEET_EXPAND_PX || velocity > SMR_SHEET_FLICK_PX_PER_MS) {
        smrSetExpanded(shell, false);
      }
    } else if (dy > SMR_SHEET_CLOSE_RATIO * drag.h || velocity > SMR_SHEET_FLICK_PX_PER_MS) {
      smrClosePanel(shell);
    } else if (-dy >= SMR_SHEET_EXPAND_PX || velocity < -SMR_SHEET_FLICK_PX_PER_MS) {
      smrSetExpanded(shell, true);
    }
  });
  const restore = (event) => {
    const drag = smrEndDrag(shell, event);
    if (drag) {
      smrSetExpanded(shell, drag.expanded);
    }
  };
  header.addEventListener("pointercancel", restore);
  header.addEventListener("lostpointercapture", restore);
}

/**
 * Desktop teaser drag, only without a running position test and never in the preview.
 * Over SMR_DRAG_THRESHOLD_PX it drags; release snaps to the nearest of the six positions
 * (thirds of the height, halves of the width), stores it and swallows the click that follows.
 */
function smrAttachRepositionDrag(shell) {
  const cfg = shell.cfg;
  const state = shell.state;
  if (!cfg.visitor_reposition || cfg.experiment.enabled || state.preview) {
    return;
  }
  const teaser = shell.el.teaser;
  const wrap = shell.el.wrap;
  teaser.addEventListener("pointerdown", (event) => {
    state.suppressClick = false;
    if (state.device !== "desktop" || state.drag || !smrStartsDrag(event)) {
      return;
    }
    smrCapturePointer(teaser, event.pointerId);
    state.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moving: false };
  });
  teaser.addEventListener("pointermove", (event) => {
    const drag = state.drag;
    if (!drag || event.pointerId !== drag.id) {
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moving && Math.hypot(dx, dy) <= SMR_DRAG_THRESHOLD_PX) {
      return;
    }
    drag.moving = true;
    wrap.setAttribute("data-dragging", "true");
    wrap.style.setProperty("--smr-dx", dx + "px");
    wrap.style.setProperty("--smr-dy", dy + "px");
  });
  teaser.addEventListener("pointerup", (event) => {
    const drag = smrEndDrag(shell, event);
    if (!drag || !drag.moving) {
      return;
    }
    state.suppressClick = true;
    const third = window.innerHeight / 3;
    const row = event.clientY < third ? "top" : event.clientY < third * 2 ? "middle" : "bottom";
    const position = row + (event.clientX < window.innerWidth / 2 ? "-left" : "-right");
    smrApplyPlacement(shell, position);
    smrWritePositionOverride(shell.token, position);
  });
  const cancel = (event) => smrEndDrag(shell, event);
  teaser.addEventListener("pointercancel", cancel);
  teaser.addEventListener("lostpointercapture", cancel);
}

/** The keyboard and single-tap alternative to dragging: mirrors left and right; the preview keeps it in memory. */
function smrMirrorPosition(shell) {
  const position = shell.state.position.replace(/-(left|right)$/, (match, side) => (side === "left" ? "-right" : "-left"));
  smrApplyPlacement(shell, position);
  if (!shell.state.preview) {
    smrWritePositionOverride(shell.token, position);
  }
}

smrBoot();
