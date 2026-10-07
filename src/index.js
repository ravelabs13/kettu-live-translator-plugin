const pluginModule = (function(exports,_vendetta,metro,common,plugin,patcher,storage,utils,alerts,assets,components,toasts){'use strict';const PROTECTED_SEGMENT = /```[\s\S]*?```|`[^`\n]+`|https?:\/\/[^\s<]+|<(?:@!?|@&|#)\d+>|<a?:\w+:\d+>|<t:\d+(?::[tTdDfFR])?>/g;

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
}
async function translateChunk(text, targetLanguage, sourceLanguage = "auto") {
  const query = new URLSearchParams({
    client: "gtx",
    sl: sourceLanguage,
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

  if (!response.ok) {
    throw new Error(`Translation service returned HTTP ${response.status}`);
  }

  const data = await response.json();

  const translated =
    data.sentences
      ?.map((sentence) => sentence.trans ?? "")
      .join("") ?? "";

  if (!translated) {
    throw new Error("Translation service returned an empty result");
  }

  const detectedSource =
    sourceLanguage === "auto" &&
    typeof data.src === "string" &&
    data.src
      ? data.src
      : sourceLanguage === "auto"
        ? null
        : sourceLanguage;

  return {
    translated,
    detectedSource
  };
}

async function translateText(
  text,
  targetLanguage,
  sourceLanguage = "auto"
) {
  const protectedText = protectDiscordSyntax(text);
  const translatedChunks = [];

  let detectedSource =
    sourceLanguage === "auto"
      ? null
      : sourceLanguage;

  for (const chunk of chunkText(protectedText.text)) {
    const result = await translateChunk(
      chunk,
      targetLanguage,
      sourceLanguage
    );

    translatedChunks.push(result.translated);

    if (!detectedSource && result.detectedSource) {
      detectedSource = result.detectedSource;
    }
  }

  return {
    text: protectedText.restore(
      translatedChunks.join("")
    ),
    detectedSource
  };
}const settings = plugin.storage;
let ChatInputGuardWrapper;
let ChatInput;
let DraftManager;
let Messaging;
let SelectedChannelStore;
let ChannelStore;
let DraftStore;
const { FormRow, FormRadioRow, FormSwitchRow } = components.Forms ?? {};
const CompatibleSearch = components.Search;
const inputByChannel = /* @__PURE__ */ new Map();
const inputRefByChannel = /* @__PURE__ */ new Map();
const manualBypass = /* @__PURE__ */ new Map();
const pendingChannels = /* @__PURE__ */ new Set();
let unpatches = [];
let runtimeStatus = "Not started";
let d1LastComposerSignature = "";

function d1(event, details = {}) {
  try {
    _vendetta.logger.log(`[POT:D1] ${event} ${JSON.stringify(details)}`);
  } catch (error) {
    try {
      _vendetta.logger.error(`[POT:D1] logging failed: ${String(error)}`);
    } catch {}
  }
}

function d1Length(value) {
  return typeof value === "string" ? value.length : -1;
}

function d1Sample(value) {
  return typeof value === "string" ? value.slice(0, 80) : "";
}
function resolveDiscordModules() {
  try {
    ChatInputGuardWrapper = metro.findByName("ChatInputGuardWrapper", false);
  } catch (error) {
    _vendetta.logger.error("Chat input module lookup failed", error);
  }
  try {
    ChatInput = metro.findByName("ChatInput", false);
  } catch (error) {
    _vendetta.logger.error("ChatInput module lookup failed", error);
  }
  try {
    DraftManager = metro.findByProps("clearDraft", "saveDraft");
  } catch (error) {
    _vendetta.logger.error("DraftManager lookup failed", error);
  }
  try {
    Messaging = metro.findByProps("sendMessage", "editMessage") ?? metro.findByProps("sendMessage");
  } catch (error) {
    _vendetta.logger.error("Messaging module lookup failed", error);
  }
  for (const [name, assign] of [
    ["SelectedChannelStore", (value) => SelectedChannelStore = value],
    ["ChannelStore", (value) => ChannelStore = value],
    ["DraftStore", (value) => DraftStore = value]
  ]) {
    try {
      assign(metro.findByStoreName(name));
    } catch (error) {
      _vendetta.logger.error(`${name} lookup failed`, error);
    }
  }
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
function setComposerText(id, text, inputProps) {
  const inputRef = inputRefByChannel.get(id);
  const liveInput = inputRef?.current;
  const snapshotInput = inputProps ?? inputByChannel.get(id);
  const draftBefore = DraftStore?.getDraft?.(id, 0) ?? "";

  d1("setComposerText:before", {
    id,
    textLength: d1Length(text),
    draftBeforeLength: d1Length(draftBefore),
    chatInputPropsObject: Boolean(ChatInput?.props && typeof ChatInput.props === "object"),
    refFound: Boolean(inputRef),
    liveCurrentFound: Boolean(liveInput),
    snapshotHandleTextChanged: typeof snapshotInput?.handleTextChanged,
    snapshotSetText: typeof snapshotInput?.setText,
    liveHandleTextChanged: typeof liveInput?.handleTextChanged,
    liveSetText: typeof liveInput?.setText,
    liveEqualsSnapshot: liveInput ? liveInput === snapshotInput : null,
    draftStoreSetDraft: typeof DraftStore?.setDraft,
    draftManagerSaveDraft: typeof DraftManager?.saveDraft
  });

  try {
    if (ChatInput?.props && typeof ChatInput.props === "object") {
      ChatInput.props.text = text;

      const draftAfter = DraftStore?.getDraft?.(id, 0) ?? "";

      d1("setComposerText:ChatInput.props", {
        assignmentMatches: ChatInput.props.text === text,
        draftAfterLength: d1Length(draftAfter),
        draftMatchesRequested: draftAfter === text
      });

      setTimeout(() => {
        const delayedDraft = DraftStore?.getDraft?.(id, 0) ?? "";

        d1("setComposerText:afterTick", {
          draftLength: d1Length(delayedDraft),
          draftMatchesRequested: delayedDraft === text
        });
      }, 50);

      return true;
    }
  } catch (error) {
    _vendetta.logger.error("ChatInput text update failed", error);
  }

  if (typeof liveInput?.setText === "function") {
    try {
      d1("setComposerText:liveSetText:before", {
        id,
        requestedLength: d1Length(text),
        draftBeforeLength: d1Length(DraftStore?.getDraft?.(id, 0) ?? ""),
        refStillCurrent: inputRef?.current === liveInput
      });

      liveInput.setText(text);

      const draftAfterSetText = DraftStore?.getDraft?.(id, 0) ?? "";

      d1("setComposerText:liveSetText:after", {
        id,
        draftAfterLength: d1Length(draftAfterSetText),
        draftMatchesRequested: draftAfterSetText === text,
        refStillCurrent: inputRef?.current === liveInput
      });

      setTimeout(() => {
        const currentInput = inputRef?.current;
        const draftAfterTick = DraftStore?.getDraft?.(id, 0) ?? "";

        d1("setComposerText:liveSetText:afterTick0", {
          id,
          draftLength: d1Length(draftAfterTick),
          draftMatchesRequested: draftAfterTick === text,
          refStillCurrent: currentInput === liveInput,
          currentSetText: typeof currentInput?.setText,
          currentHandleTextChanged: typeof currentInput?.handleTextChanged
        });
      }, 0);

      setTimeout(() => {
        const currentInput = inputRef?.current;
        const draftAfterDelay = DraftStore?.getDraft?.(id, 0) ?? "";

        d1("setComposerText:liveSetText:after50ms", {
          id,
          draftLength: d1Length(draftAfterDelay),
          draftMatchesRequested: draftAfterDelay === text,
          refStillCurrent: currentInput === liveInput,
          currentSetText: typeof currentInput?.setText,
          currentHandleTextChanged: typeof currentInput?.handleTextChanged
        });
      }, 50);

      return true;
    } catch (error) {
      d1("setComposerText:liveSetText:error", {
        id,
        message: error instanceof Error ? error.message : String(error)
      });

      _vendetta.logger.error("Live composer setText failed", error);
    }
  }

  const fallback = snapshotInput;

  if (typeof fallback?.handleTextChanged === "function") {
    try {
      d1("setComposerText:fallback:before", {
        method: "handleTextChanged"
      });

      fallback.handleTextChanged(text);

      const draftAfter = DraftStore?.getDraft?.(id, 0) ?? "";

      d1("setComposerText:fallback:after", {
        draftAfterLength: d1Length(draftAfter),
        draftMatchesRequested: draftAfter === text
      });

      return true;
    } catch (error) {
      _vendetta.logger.error("Legacy composer text update failed", error);
    }
  }

  d1("setComposerText:noCompatibleMethod", { id });
  return false;
}

function restoreDraft(id, original) {
  setTimeout(() => {
    if (!setComposerText(id, original)) {
      _vendetta.logger.error(
        "Failed to restore the original draft: no compatible composer text API"
      );
    }
  }, 0);
}
function Preview({ original, translated, target }) {
  d1("Preview:render", {
    originalLength: d1Length(original),
    translatedLength: d1Length(translated),
    target,
    originalSample: d1Sample(original),
    translatedSample: d1Sample(translated)
  });

  const renderPreviewBlock = (label, value, marginTop = 0) =>
    /* @__PURE__ */ common.React.createElement(
      common.ReactNative.View,
      {
        style: {
          marginTop
        }
      },
      /* @__PURE__ */ common.React.createElement(
        common.ReactNative.Text,
        {
          style: {
            color: "#b5bac1",
            fontSize: 12,
            fontWeight: "700",
            marginBottom: 7,
            textTransform: "uppercase"
          }
        },
        label
      ),
      /* @__PURE__ */ common.React.createElement(
        common.ReactNative.View,
        {
          style: {
            backgroundColor: "#111214",
            borderColor: "#3f4147",
            borderRadius: 8,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 11
          }
        },
        /* @__PURE__ */ common.React.createElement(
          common.ReactNative.Text,
          {
            selectable: true,
            style: {
              color: "#f2f3f5",
              fontSize: 16,
              lineHeight: 22
            }
          },
          value
        )
      )
    );

  return /* @__PURE__ */ common.React.createElement(
    common.ReactNative.ScrollView,
    {
      style: {
        maxHeight: common.ReactNative.Dimensions.get("window").height * 0.62
      },
      contentContainerStyle: {
        paddingBottom: 4,
        paddingTop: 4
      },
      keyboardShouldPersistTaps: "handled"
    },
    renderPreviewBlock("Polish original", original),
    renderPreviewBlock(
      `${languageName(target)} translation`,
      translated,
      16
    )
  );
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
  d1("manualChoice:open", {
    originalLength: d1Length(original),
    translatedLength: d1Length(translated),
    target,
    originalSample: d1Sample(original),
    translatedSample: d1Sample(translated)
  });

  return new Promise((resolve) => {
    alerts.showConfirmationAlert({
      title: "Review translation",
      content: /* @__PURE__ */ common.React.createElement(Preview, { original, translated, target }),
      confirmText: "Use translation",
      onConfirm: () => {
        d1("manualChoice:onConfirm", {
          translatedLength: d1Length(translated)
        });
        resolve(true);
      },
      cancelText: "Keep original",
      onCancel: () => {
        d1("manualChoice:onCancel", {});
        resolve(false);
      },
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
    const translation = await translateText(
      original,
      target,
      "auto"
    );

    const translated = translation.text;

    d1("translateDraft:translated", {
      id,
      originalLength: d1Length(original),
      translatedLength: d1Length(translated),
      detectedSource: translation.detectedSource,
      translatedSample: d1Sample(translated)
    });

    if (await requestManualChoice(original, translated, target)) {
      const inputRef = inputRefByChannel.get(id);
      const liveInput = inputRef?.current;

      d1("translateDraft:confirmed", {
        id,
        refFound: Boolean(inputRef),
        liveCurrentFound: Boolean(liveInput),
        snapshotHandleTextChanged: typeof inputProps?.handleTextChanged,
        snapshotSetText: typeof inputProps?.setText,
        liveHandleTextChanged: typeof liveInput?.handleTextChanged,
        liveSetText: typeof liveInput?.setText,
        liveEqualsSnapshot: liveInput ? liveInput === inputProps : null
      });

      manualBypass.set(id, translated);

      const updated = setComposerText(id, translated, inputProps);

      d1("translateDraft:setResult", {
        id,
        updated
      });

      if (!updated) {
        manualBypass.delete(id);
        throw new Error("No compatible composer text API was found");
      }

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
    const inputNode = utils.findInReactTree(
      result?.props?.children,
      (node) => node?.props?.chatInputRef
    );

    const inputRef = inputNode?.props?.chatInputRef;
    const inputProps = inputRef?.current;
    const id = channelId();

    if (id && inputRef) inputRefByChannel.set(id, inputRef);
    if (id && inputProps) inputByChannel.set(id, inputProps);

    const targetNode = utils.findInReactTree(
      result?.props?.children,
      (node) => node?.type?.displayName === "View" && Array.isArray(node?.props?.children)
    );

    const children = targetNode?.props?.children;

    const composerState = {
      id: id ?? null,
      refFound: Boolean(inputRef),
      currentFound: Boolean(inputProps),
      handleTextChanged: typeof inputProps?.handleTextChanged,
      setText: typeof inputProps?.setText,
      rootChildrenArray: Array.isArray(result?.props?.children),
      targetViewFound: Boolean(targetNode),
      targetChildCount: Array.isArray(children) ? children.length : -1,
      translatorAlreadyInjected: Boolean(
        Array.isArray(children) &&
        children.some((child) => child?.key === "polish-outgoing-translator")
      )
    };

    const composerSignature = JSON.stringify(composerState);

    if (composerSignature !== d1LastComposerSignature) {
      d1LastComposerSignature = composerSignature;
      d1("patchComposer:state", composerState);
    }

    if (!inputProps?.handleTextChanged) return;

    if (
      !children ||
      children.some((child) => child?.key === "polish-outgoing-translator")
    ) return;

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
      const translation = await translateText(
        originalText,
        effective.target,
        "auto"
      );

      const translated = translation.text;

      d1("patchSending:translated", {
        id,
        detectedSource: translation.detectedSource,
        target: effective.target
      });

      const choice = await requestSendChoice(
        originalText,
        translated,
        effective.target
      );
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
    try {
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
      try {
        toasts.showToast(active.length ? "Polish Outgoing Translator enabled" : "Plugin enabled; open its settings for diagnostics");
      } catch {
      }
      try {
        _vendetta.logger.log(`Polish Outgoing Translator loaded. ${runtimeStatus}`);
      } catch {
      }
    } catch (error) {
      runtimeStatus = `Enabled with initialization error: ${error instanceof Error ? error.message : String(error)}`;
      try {
        _vendetta.logger.error("Plugin initialization failed without disabling the plugin", error);
      } catch {
      }
    }
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

export default pluginModule.default;
