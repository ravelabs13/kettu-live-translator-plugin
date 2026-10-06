(function(exports,_vendetta,metro,common,plugin,patcher,storage,utils,alerts,assets,components,toasts){'use strict';const PROTECTED_SEGMENT = /```[\s\S]*?```|`[^`\n]+`|https?:\/\/[^\s<]+|<(?:@!?|@&|#)\d+>|<a?:\w+:\d+>|<t:\d+(?::[tTdDfFR])?>/g;

function protectDiscordSyntax(text) {
  const protectedValues = [];
  const safeText = text.replace(PROTECTED_SEGMENT, value => {
    const token = `ZXQKOT${protectedValues.length}QXZ`;
    protectedValues.push(value);
    return token;
  });

  return {
    text: safeText,
    restore(translated) {
      return protectedValues.reduce((result, value, index) => {
        const token = new RegExp(`ZXQKOT\\s*${index}\\s*QXZ`, "gi");
        return result.replace(token, value);
      }, translated);
    }
  };
}

function chunkText(text, maxLength = 1200) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    const window = remaining.slice(0, maxLength + 1);
    const splitAt = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(" "));
    const end = splitAt > maxLength * 0.55 ? splitAt + 1 : maxLength;
    chunks.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function effectiveChannelSettings(storage, channelId) {
  const override = storage.channelOverrides?.[channelId] ?? {};
  return {
    auto: override.auto ?? storage.autoTranslate ?? false,
    target: override.target ?? storage.targetLanguage ?? "en"
  };
}

function shouldTranslateMessage(message, effective, bypassText) {
  const content = message?.content;
  return Boolean(
    effective.auto
    && typeof content === "string"
    && content.trim()
    && content !== bypassText
  );
}const LANGUAGES = {
  "English": "en",
  "German": "de",
  "Spanish": "es",
  "French": "fr",
  "Italian": "it",
  "Portuguese": "pt",
  "Dutch": "nl",
  "Swedish": "sv",
  "Norwegian": "no",
  "Danish": "da",
  "Finnish": "fi",
  "Czech": "cs",
  "Slovak": "sk",
  "Ukrainian": "uk",
  "Russian": "ru",
  "Turkish": "tr",
  "Greek": "el",
  "Romanian": "ro",
  "Hungarian": "hu",
  "Bulgarian": "bg",
  "Croatian": "hr",
  "Serbian": "sr",
  "Japanese": "ja",
  "Korean": "ko",
  "Chinese (Simplified)": "zh-CN",
  "Chinese (Traditional)": "zh-TW",
  "Arabic": "ar",
  "Hebrew": "iw",
  "Hindi": "hi",
  "Indonesian": "id",
  "Vietnamese": "vi",
  "Thai": "th"
};
function languageName(code) {
  return Object.entries(LANGUAGES).find(([, value]) => value === code)?.[0] ?? code;
}async function translateChunk(text, targetLanguage) {
  const query = new URLSearchParams({
    client: "gtx",
    sl: "pl",
    tl: targetLanguage,
    dt: "t",
    dj: "1",
    source: "input",
    q: text
  });
  const response = await utils.safeFetch(
    `https://translate.googleapis.com/translate_a/single?${query}`,
    void 0,
    15e3
  );
  if (!response.ok) throw new Error(`Translation service returned HTTP ${response.status}`);
  const data = await response.json();
  const translated = data.sentences?.map((sentence) => sentence.trans ?? "").join("");
  if (!translated) throw new Error("Translation service returned an empty result");
  return translated;
}
async function translatePolish(text, targetLanguage) {
  const protectedText = protectDiscordSyntax(text);
  const translatedChunks = [];
  for (const chunk of chunkText(protectedText.text)) {
    translatedChunks.push(await translateChunk(chunk, targetLanguage));
  }
  return protectedText.restore(translatedChunks.join(""));
}const settings = plugin.storage;
let ChatInputGuardWrapper;
let Messaging;
const SelectedChannelStore = metro.findByStoreName("SelectedChannelStore");
const ChannelStore = metro.findByStoreName("ChannelStore");
const DraftStore = metro.findByStoreName("DraftStore");
const { FormRow, FormRadioRow, FormSwitchRow } = components.Forms;
const CompatibleCodeblock = components.Codeblock;
const CompatibleSearch = components.Search;
const inputByChannel = /* @__PURE__ */ new Map();
const manualBypass = /* @__PURE__ */ new Map();
const pendingChannels = /* @__PURE__ */ new Set();
let unpatches = [];
let runtimeStatus = "Not started";
function resolveDiscordModules() {
  ChatInputGuardWrapper = metro.findByName("ChatInputGuardWrapper", false);
  Messaging = metro.findByProps("sendMessage", "editMessage") ?? metro.findByProps("sendMessage");
}
function initializeSettings() {
  settings.autoTranslate ?? (settings.autoTranslate = false);
  settings.targetLanguage ?? (settings.targetLanguage = "en");
  settings.errorBehavior ?? (settings.errorBehavior = "ask");
  settings.channelOverrides ?? (settings.channelOverrides = {});
}
function channelId() {
  return SelectedChannelStore?.getChannelId?.();
}
function channelLabel(id) {
  if (!id) return "No channel selected";
  const channel = ChannelStore?.getChannel?.(id);
  return channel?.name ? `#${channel.name}` : id;
}
function restoreDraft(id, original) {
  setTimeout(() => {
    try {
      inputByChannel.get(id)?.handleTextChanged(original);
    } catch (error) {
      _vendetta.logger.error("Failed to restore the original draft", error);
    }
  }, 0);
}
function Preview({ original, translated, target }) {
  return /* @__PURE__ */ common.React.createElement(common.ReactNative.ScrollView, { style: { maxHeight: common.ReactNative.Dimensions.get("window").height * 0.62 } }, /* @__PURE__ */ common.React.createElement(common.ReactNative.Text, { style: { marginBottom: 6, fontWeight: "700" } }, "Polish original"), /* @__PURE__ */ common.React.createElement(CompatibleCodeblock, null, original), /* @__PURE__ */ common.React.createElement(common.ReactNative.Text, { style: { marginTop: 14, marginBottom: 6, fontWeight: "700" } }, languageName(target), " translation"), /* @__PURE__ */ common.React.createElement(CompatibleCodeblock, null, translated));
}
function requestSendChoice(original, translated, target) {
  return new Promise((resolve) => {
    alerts.showConfirmationAlert({
      title: "Review translation",
      content: /* @__PURE__ */ common.React.createElement(Preview, { original, translated, target }),
      confirmText: "Send translation",
      onConfirm: () => resolve("translated"),
      secondaryConfirmText: "Send original",
      onConfirmSecondary: () => resolve("original"),
      cancelText: "Keep draft",
      onCancel: () => resolve("cancel"),
      isDismissable: false
    });
  });
}
function requestManualChoice(original, translated, target) {
  return new Promise((resolve) => {
    alerts.showConfirmationAlert({
      title: "Review translation",
      content: /* @__PURE__ */ common.React.createElement(Preview, { original, translated, target }),
      confirmText: "Use translation",
      onConfirm: () => resolve(true),
      cancelText: "Keep original",
      onCancel: () => resolve(false),
      isDismissable: false
    });
  });
}
function requestErrorChoice(error) {
  const message = error instanceof Error ? error.message : String(error);
  return new Promise((resolve) => {
    alerts.showConfirmationAlert({
      title: "Translation failed",
      content: `The Polish original is safe. ${message}`,
      confirmText: "Send original",
      onConfirm: () => resolve("original"),
      cancelText: "Keep draft",
      onCancel: () => resolve("keep"),
      isDismissable: false
    });
  });
}
async function translateDraft(inputProps) {
  const id = channelId();
  if (!id) return;
  const original = DraftStore?.getDraft?.(id, 0) ?? "";
  if (!original.trim()) {
    toasts.showToast("Type a Polish message first");
    return;
  }
  if (pendingChannels.has(id)) {
    toasts.showToast("Translation is already in progress");
    return;
  }
  const { target } = effectiveChannelSettings(settings, id);
  pendingChannels.add(id);
  toasts.showToast(`Translating to ${languageName(target)}\u2026`);
  try {
    const translated = await translatePolish(original, target);
    if (await requestManualChoice(original, translated, target)) {
      manualBypass.set(id, translated);
      inputProps.handleTextChanged(translated);
      toasts.showToast("Translation inserted. Review it and send when ready.", assets.getAssetIDByName("check"));
    }
  } catch (error) {
    _vendetta.logger.error("Manual translation failed", error);
    toasts.showToast("Translation failed; the original was kept");
    restoreDraft(id, original);
  } finally {
    pendingChannels.delete(id);
  }
}
function toggleAutoForChannel() {
  const id = channelId();
  if (!id) return;
  const current = effectiveChannelSettings(settings, id).auto;
  settings.channelOverrides[id] = {
    ...settings.channelOverrides[id],
    auto: !current
  };
  toasts.showToast(`Auto Translate ${!current ? "ON" : "OFF"} for ${channelLabel(id)}`);
}
function TranslateButton({ inputProps }) {
  storage.useProxy(settings);
  const navigation = common.NavigationNative.useNavigation();
  const id = channelId();
  const [hasText, setHasText] = common.React.useState(
    Boolean(id && DraftStore?.getDraft?.(id, 0)?.trim())
  );
  const effective = id ? effectiveChannelSettings(settings, id) : { auto: settings.autoTranslate, target: settings.targetLanguage };
  common.React.useEffect(() => {
    const unpatch = patcher.before("handleTextChanged", inputProps, ([text]) => {
      setHasText(Boolean(text?.trim()));
      const currentChannelId = channelId();
      if (currentChannelId && manualBypass.get(currentChannelId) !== text) {
        manualBypass.delete(currentChannelId);
      }
    });
    return () => void unpatch();
  }, [inputProps]);
  const openTargetPicker = () => navigation.push("VendettaCustomPage", {
    title: id ? `Target for ${channelLabel(id)}` : "Default target language",
    render: () => /* @__PURE__ */ common.React.createElement(LanguagePicker, { selectedChannelId: id })
  });
  return /* @__PURE__ */ common.React.createElement(
    common.ReactNative.View,
    {
      style: {
        flexDirection: "row",
        position: "absolute",
        left: 0,
        top: -44,
        zIndex: 3
      }
    },
    /* @__PURE__ */ common.React.createElement(
      common.ReactNative.Pressable,
      {
        accessibilityLabel: `Translate Polish to ${languageName(effective.target)}`,
        accessibilityHint: "Tap an empty button to choose a language. Type text and tap to translate. Hold to toggle automatic translation.",
        disabled: pendingChannels.has(id ?? ""),
        onPress: () => hasText ? void translateDraft(inputProps) : openTargetPicker(),
        onLongPress: toggleAutoForChannel,
        style: {
          minWidth: 76,
          height: 40,
          paddingHorizontal: 12,
          marginLeft: 8,
          marginTop: -4,
          borderRadius: 20,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: effective.auto ? "#248046" : "#4e5058",
          opacity: hasText ? 1 : 0.72
        }
      },
      /* @__PURE__ */ common.React.createElement(common.ReactNative.Text, { style: { color: "#ffffff", fontSize: 12, fontWeight: "700" } }, `PL\u2192${effective.target.toUpperCase()}`),
      /* @__PURE__ */ common.React.createElement(common.ReactNative.Text, { style: { color: "#ffffff", fontSize: 8 } }, effective.auto ? "AUTO ON" : hasText ? "TRANSLATE" : "LANGUAGE")
    )
  );
}
function patchComposer() {
  if (typeof ChatInputGuardWrapper?.default !== "function") {
    throw new Error("ChatInputGuardWrapper.default was not found");
  }
  return patcher.after("default", ChatInputGuardWrapper, (_, result) => {
    const inputProps = utils.findInReactTree(
      result?.props?.children,
      (node) => node?.props?.chatInputRef?.current
    )?.props?.chatInputRef?.current;
    if (!inputProps?.handleTextChanged) return;
    const id = channelId();
    if (id) inputByChannel.set(id, inputProps);
    const children = utils.findInReactTree(
      result.props.children,
      (node) => node?.type?.displayName === "View" && Array.isArray(node?.props?.children)
    )?.props?.children;
    if (!children || children.some((child) => child?.key === "polish-outgoing-translator")) return;
    children.unshift(
      common.React.createElement(TranslateButton, {
        key: "polish-outgoing-translator",
        inputProps
      })
    );
  });
}
function patchSending() {
  if (typeof Messaging?.sendMessage !== "function") {
    throw new Error("sendMessage was not found");
  }
  return patcher.instead("sendMessage", Messaging, async (args, originalSend) => {
    const id = args[0];
    const message = args[1];
    const bypassText = manualBypass.get(id);
    const effective = effectiveChannelSettings(settings, id);
    if (bypassText && message?.content === bypassText) {
      manualBypass.delete(id);
      return originalSend(...args);
    }
    if (!shouldTranslateMessage(message, effective, bypassText)) {
      return originalSend(...args);
    }
    if (pendingChannels.has(id)) {
      toasts.showToast("Translation is already in progress");
      restoreDraft(id, message.content);
      return;
    }
    const originalText = message.content;
    pendingChannels.add(id);
    toasts.showToast(`Translating to ${languageName(effective.target)}\u2026`);
    try {
      const translated = await translatePolish(originalText, effective.target);
      const choice = await requestSendChoice(originalText, translated, effective.target);
      if (choice === "translated") {
        const translatedArgs = [...args];
        translatedArgs[1] = { ...message, content: translated };
        return originalSend(...translatedArgs);
      }
      if (choice === "original") return originalSend(...args);
      restoreDraft(id, originalText);
      return;
    } catch (error) {
      _vendetta.logger.error("Automatic translation failed", error);
      if (settings.errorBehavior === "ask") {
        if (await requestErrorChoice(error) === "original") return originalSend(...args);
      } else {
        toasts.showToast("Translation failed; the original was kept");
      }
      restoreDraft(id, originalText);
      return;
    } finally {
      pendingChannels.delete(id);
    }
  });
}
function LanguagePicker({ selectedChannelId }) {
  storage.useProxy(settings);
  const [query, setQuery] = common.React.useState("");
  const current = selectedChannelId ? settings.channelOverrides[selectedChannelId]?.target : settings.targetLanguage;
  const select = (code) => {
    if (selectedChannelId) {
      const next = { ...settings.channelOverrides[selectedChannelId] };
      if (code) next.target = code;
      else delete next.target;
      settings.channelOverrides[selectedChannelId] = next;
    } else if (code) {
      settings.targetLanguage = code;
    }
    toasts.showToast(code ? `Target set to ${languageName(code)}` : "Using the global target language");
  };
  return /* @__PURE__ */ common.React.createElement(common.ReactNative.ScrollView, { style: { flex: 1 } }, /* @__PURE__ */ common.React.createElement(
    CompatibleSearch,
    {
      style: { padding: 15 },
      placeholder: "Search language",
      onChangeText: (text) => setQuery(text)
    }
  ), selectedChannelId && /* @__PURE__ */ common.React.createElement(
    FormRadioRow,
    {
      label: `Use global (${languageName(settings.targetLanguage)})`,
      selected: !current,
      onPress: () => select(void 0)
    }
  ), Object.entries(LANGUAGES).filter(([name, code]) => `${name} ${code}`.toLowerCase().includes(query.toLowerCase())).map(([name, code]) => /* @__PURE__ */ common.React.createElement(
    FormRadioRow,
    {
      key: code,
      label: name,
      subLabel: code,
      selected: current === code,
      onPress: () => select(code)
    }
  )));
}
function autoOverride(id) {
  const value = settings.channelOverrides[id]?.auto;
  return value === void 0 ? "inherit" : value ? "on" : "off";
}
function setAutoOverride(id, value) {
  const next = { ...settings.channelOverrides[id] };
  if (value === "inherit") delete next.auto;
  else next.auto = value === "on";
  settings.channelOverrides[id] = next;
}
function Settings() {
  storage.useProxy(settings);
  const navigation = common.NavigationNative.useNavigation();
  const id = channelId();
  const override = id ? autoOverride(id) : "inherit";
  const channelTarget = id ? settings.channelOverrides[id]?.target : void 0;
  return /* @__PURE__ */ common.React.createElement(common.ReactNative.ScrollView, { style: { flex: 1 } }, /* @__PURE__ */ common.React.createElement(FormRow, { label: "Source language", subLabel: "Polish (pl)" }), /* @__PURE__ */ common.React.createElement(
    FormSwitchRow,
    {
      label: "Auto Translate by default",
      subLabel: "Translate and show a preview whenever you press Send",
      value: settings.autoTranslate,
      onValueChange: (value) => settings.autoTranslate = value
    }
  ), /* @__PURE__ */ common.React.createElement(
    FormRow,
    {
      label: "Default target language",
      subLabel: languageName(settings.targetLanguage),
      trailing: () => /* @__PURE__ */ common.React.createElement(FormRow.Arrow, null),
      onPress: () => navigation.push("VendettaCustomPage", {
        title: "Default target language",
        render: () => /* @__PURE__ */ common.React.createElement(LanguagePicker, null)
      })
    }
  ), /* @__PURE__ */ common.React.createElement(
    FormSwitchRow,
    {
      label: "Ask after translation errors",
      subLabel: "Choose whether to send the original or keep it as a draft",
      value: settings.errorBehavior === "ask",
      onValueChange: (value) => settings.errorBehavior = value ? "ask" : "keep"
    }
  ), /* @__PURE__ */ common.React.createElement(
    FormRow,
    {
      label: "Current channel",
      subLabel: channelLabel(id),
      leading: /* @__PURE__ */ common.React.createElement(FormRow.Icon, { source: assets.getAssetIDByName("ChannelTextIcon") })
    }
  ), id && /* @__PURE__ */ common.React.createElement(common.React.Fragment, null, /* @__PURE__ */ common.React.createElement(
    FormRadioRow,
    {
      label: "Inherit Auto Translate default",
      selected: override === "inherit",
      onPress: () => setAutoOverride(id, "inherit")
    }
  ), /* @__PURE__ */ common.React.createElement(
    FormRadioRow,
    {
      label: "Auto Translate ON",
      selected: override === "on",
      onPress: () => setAutoOverride(id, "on")
    }
  ), /* @__PURE__ */ common.React.createElement(
    FormRadioRow,
    {
      label: "Auto Translate OFF",
      selected: override === "off",
      onPress: () => setAutoOverride(id, "off")
    }
  ), /* @__PURE__ */ common.React.createElement(
    FormRow,
    {
      label: "Target language for this channel",
      subLabel: channelTarget ? languageName(channelTarget) : `Global: ${languageName(settings.targetLanguage)}`,
      trailing: () => /* @__PURE__ */ common.React.createElement(FormRow.Arrow, null),
      onPress: () => navigation.push("VendettaCustomPage", {
        title: `Target for ${channelLabel(id)}`,
        render: () => /* @__PURE__ */ common.React.createElement(LanguagePicker, { selectedChannelId: id })
      })
    }
  )), /* @__PURE__ */ common.React.createElement(common.ReactNative.Text, { style: { margin: 16, opacity: 0.7, lineHeight: 19 } }, "Tap an empty PL\u2192LANG button to choose the target language. Type a message and tap it for manual translation. Hold it to toggle Auto Translate for the current channel. Mentions, links, emoji and code are protected from translation."), /* @__PURE__ */ common.React.createElement(FormRow, { label: "Runtime status", subLabel: runtimeStatus }));
}
var index = {
  onLoad() {
    initializeSettings();
    resolveDiscordModules();
    const active = [];
    const failures = [];
    try {
      unpatches.push(patchComposer());
      active.push("composer button");
    } catch (error) {
      failures.push("composer button");
      _vendetta.logger.error("Composer integration was unavailable", error);
    }
    try {
      unpatches.push(patchSending());
      active.push("outgoing translation");
    } catch (error) {
      failures.push("outgoing translation");
      _vendetta.logger.error("Sending integration was unavailable", error);
    }
    runtimeStatus = active.length ? `Active: ${active.join(", ")}${failures.length ? `. Unavailable: ${failures.join(", ")}` : ""}` : "Enabled, but this Discord build exposed no compatible chat modules";
    toasts.showToast(active.length ? "Polish Outgoing Translator enabled" : "Plugin enabled; open its settings for diagnostics");
    _vendetta.logger.log(`Polish Outgoing Translator loaded. ${runtimeStatus}`);
  },
  onUnload() {
    for (const unpatch of unpatches.splice(0)) unpatch();
    inputByChannel.clear();
    manualBypass.clear();
    pendingChannels.clear();
    _vendetta.logger.log("Polish Outgoing Translator unloaded");
  },
  settings: Settings
};exports.default=index;Object.defineProperty(exports,'__esModule',{value:true});return exports;})({},vendetta,vendetta.metro,vendetta.metro.common,vendetta.plugin,vendetta.patcher,vendetta.storage,vendetta.utils,vendetta.ui.alerts,vendetta.ui.assets,vendetta.ui.components,vendetta.ui.toasts);