import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bundle = await readFile("index.js", "utf8");

function createHarness() {
  const calls = {
    fetchQueries: [],
    fetchRequests: [],
    confirmations: [],
    logs: [],
    patches: {},
    sent: [],
    storeEmits: [],
    nativeWake: [],
    composerSync: [],
    directMountResult: null,
    toasts: [],
    unpatches: 0
  };
  const pluginStorage = {
    autoTranslate: true,
    channelOverrides: {},
    errorBehavior: "ask",
    targetLanguage: "en"
  };
  const ChatInputGuardWrapper = {
    default() {}
  };

  const ChatInputActions = {
    default() {}
  };

  const Messaging = {
    sendMessage() {}
  };

  let draftText = "";
  let nativeText = "";

  const NativeComposerHandle = {
    getText: () => nativeText,

    setText(text) {
      nativeText = text;

      calls.composerSync.push([
        "setText",
        text
      ]);
    },

    handleTextChanged(text) {
      draftText = text;

      calls.composerSync.push([
        "handleTextChanged",
        text
      ]);
    },
    hideSideActions: () =>
      calls.nativeWake.push("hide"),
    showSideActions: () => {
      calls.nativeWake.push("show");

      const direct =
        calls.patches
          .composerActions
          ?.callback;

      if (
        typeof direct === "function"
      ) {
        calls.directMountResult =
          direct(
            [],
            {
              type: "DiscordChatInputActions",
              props: {}
            }
          );
      }
    },
    focus() {},
    blur() {}
  };

  const ChatInputUtils = {
    getBestActiveInputForChannelId: () =>
      NativeComposerHandle,
    getBestActiveInput: () =>
      NativeComposerHandle
  };

  const stores = {
    ChannelStore: {
      getChannel: () => ({ name: "general" }),
      emitChange: () =>
        calls.storeEmits.push("ChannelStore")
    },
    DraftStore: {
      getDraft: () => draftText,
      emitChange: () =>
        calls.storeEmits.push("DraftStore")
    },
    SelectedChannelStore: {
      getChannelId: () => "channel-1",
      emitChange: () =>
        calls.storeEmits.push("SelectedChannelStore")
    }
  };
  let confirmation = "confirm";
  let fetchMode = "echo";

  function registerPatch(kind, method, target, callback) {
    calls.patches[kind] = { callback, method, target };
    let active = true;
    return () => {
      if (active) calls.unpatches += 1;
      active = false;
    };
  }

  const FormRow = function FormRow() {};
  FormRow.Arrow = function Arrow() {};
  FormRow.Icon = function Icon() {};

  const vendetta = {
    logger: {
      error: (...args) => calls.logs.push(["error", ...args]),
      log: (...args) => calls.logs.push(["log", ...args])
    },
    metro: {
      common: {
        NavigationNative: { useNavigation: () => ({ push() {} }) },
        React: {
          Fragment: Symbol("Fragment"),
          createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
          useEffect() {},
          useState: (value) => [value, () => {}]
        },
        ReactNative: {
          Dimensions: { get: () => ({ height: 800 }) },
          Pressable: function Pressable() {},
          ScrollView: function ScrollView() {},
          Text: function Text() {},
          View: function View() {}
        }
      },
      findByName: (name) => {
        if (
          name === "ChatInputGuardWrapper"
        ) return ChatInputGuardWrapper;

        if (
          name === "ChatInputActions"
        ) return ChatInputActions;

        return undefined;
      },
      findByProps: (...props) => {
        if (
          props.includes(
            "getBestActiveInputForChannelId"
          )
        ) {
          return ChatInputUtils;
        }

        if (props.includes("sendMessage")) {
          return Messaging;
        }

        return undefined;
      },
      findByStoreName: (name) => stores[name]
    },
    patcher: {
      after: (method, target, callback) =>
        registerPatch(
          target === ChatInputActions
            ? "composerActions"
            : "composer",
          method,
          target,
          callback
        ),
      before: () => () => {},
      instead: (method, target, callback) => registerPatch("sending", method, target, callback)
    },
    plugin: { storage: pluginStorage },
    storage: { useProxy() {} },
    ui: {
      alerts: {
        showConfirmationAlert(options) {
          calls.confirmations.push(options);

          if (confirmation === "confirm") options.onConfirm?.();
          else if (confirmation === "secondary") options.onConfirmSecondary?.();
          else options.onCancel?.();
        }
      },
      assets: { getAssetIDByName: (name) => name },
      components: {
        Codeblock: function Codeblock() {},
        Forms: {
          FormRadioRow: function FormRadioRow() {},
          FormRow,
          FormSwitchRow: function FormSwitchRow() {}
        },
        Search: function Search() {}
      },
      toasts: { showToast: (...args) => calls.toasts.push(args) }
    },
    utils: {
      findInReactTree: () => undefined,
      async safeFetch(url) {
        const parsed = new URL(url);

        const query = parsed.searchParams.get("q");
        const source = parsed.searchParams.get("sl");
        const target = parsed.searchParams.get("tl");

        calls.fetchQueries.push(query);

        calls.fetchRequests.push({
          query,
          source,
          target
        });

        if (fetchMode === "error") {
          throw new Error("offline");
        }

        return {
          ok: true,
          async json() {
            return {
              sentences: [
                {
                  trans: query
                }
              ],
              src: source === "auto"
                ? "pl"
                : source
            };
          }
        };
      }
    }
  };

  const plugin = Function("vendetta", `return ${bundle}`)(vendetta).default;

  return {
    calls,

    getDraftText() {
      return draftText;
    },

    getNativeText() {
      return nativeText;
    },

    setComposerState(value) {
      draftText = value;
      nativeText = value;
    },

    plugin,
    storage: pluginStorage,
    resetCalls() {
      calls.fetchQueries.length = 0;
      calls.fetchRequests.length = 0;
      calls.confirmations.length = 0;
      calls.sent.length = 0;
      calls.composerSync.length = 0;
    },
    async send(content) {
      const hook = calls.patches.sending?.callback;
      assert.equal(typeof hook, "function");
      return hook(
        ["channel-1", { content }],
        (...args) => {
          calls.sent.push(args);
          return "sent";
        }
      );
    },
    setConfirmation(value) {
      confirmation = value;
    },
    setFetchMode(value) {
      fetchMode = value;
    }
  };
}

const harness = createHarness();
harness.plugin.onLoad();

await new Promise(
  (resolve) => setTimeout(resolve, 80)
);

assert.ok(
  harness.calls.storeEmits.includes(
    "SelectedChannelStore"
  )
);

assert.ok(
  harness.calls.storeEmits.includes(
    "ChannelStore"
  )
);

assert.ok(
  harness.calls.storeEmits.includes(
    "DraftStore"
  )
);

assert.deepEqual(
  harness.calls.nativeWake,
  ["hide", "show"]
);

assert.equal(
  harness.calls
    .patches
    .composerActions
    .method,
  "default"
);

assert.ok(
  harness.calls.directMountResult
);

assert.equal(harness.storage.sourceLanguage, "auto");
assert.equal(harness.calls.patches.composer.method, "default");
assert.equal(harness.calls.patches.sending.method, "sendMessage");
assert.ok(harness.calls.logs.some((entry) => String(entry[1]).includes("Active: composer button, outgoing translation")));

const protectedMessage = "Zażółć <@123> https://example.com `const x = 1`";
await harness.send(protectedMessage);
assert.equal(harness.calls.sent.length, 1);
assert.equal(harness.calls.sent[0][1].content, protectedMessage);
assert.equal(harness.calls.fetchQueries.length, 1);
assert.equal(harness.calls.fetchRequests.length, 1);
assert.equal(
  harness.calls.fetchRequests[0].source,
  "auto"
);
assert.equal(
  harness.calls.fetchRequests[0].target,
  "en"
);

assert.equal(
  harness.calls.confirmations.length,
  1
);

const autoPreview =
  harness.calls.confirmations[0].content;

assert.equal(
  autoPreview.props.source,
  "auto"
);

assert.equal(
  autoPreview.props.detectedSource,
  "pl"
);

assert.equal(
  autoPreview.props.target,
  "en"
);

const autoPreviewTree =
  autoPreview.type(autoPreview.props);

assert.equal(
  autoPreviewTree
    .props.children[0]
    .props.children[0]
    .props.children[0],
  "Polish · detected"
);

assert.equal(
  autoPreviewTree
    .props.children[1]
    .props.children[0]
    .props.children[0],
  "English translation"
);

harness.resetCalls();
const longMessage = "ą".repeat(1301);
await harness.send(longMessage);
assert.equal(harness.calls.fetchQueries.length, 2);
assert.equal(harness.calls.fetchRequests.length, 2);

assert.ok(
  harness.calls.fetchRequests.every(
    (request) =>
      request.source === "auto" &&
      request.target === "en"
  )
);

assert.equal(
  harness.calls.sent[0][1].content,
  longMessage
);

harness.resetCalls();
harness.storage.sourceLanguage = "de";

await harness.send(
  "Guten Morgen, wie geht es dir?"
);

assert.equal(
  harness.calls.fetchRequests.length,
  1
);

assert.equal(
  harness.calls.fetchRequests[0].source,
  "de"
);

assert.equal(
  harness.calls.fetchRequests[0].target,
  "en"
);

assert.equal(
  harness.calls.confirmations.length,
  1
);

const manualPreview =
  harness.calls.confirmations[0].content;

assert.equal(
  manualPreview.props.source,
  "de"
);

assert.equal(
  manualPreview.props.detectedSource,
  "de"
);

const manualPreviewTree =
  manualPreview.type(manualPreview.props);

assert.equal(
  manualPreviewTree
    .props.children[0]
    .props.children[0]
    .props.children[0],
  "German source"
);

assert.equal(
  manualPreviewTree
    .props.children[1]
    .props.children[0]
    .props.children[0],
  "English translation"
);

harness.storage.sourceLanguage = "auto";

harness.resetCalls();
harness.storage.targetLanguage = "pl";

await harness.send(
  "Good morning, how are you?"
);

assert.equal(
  harness.calls.fetchRequests.length,
  1
);

assert.equal(
  harness.calls.fetchRequests[0].source,
  "auto"
);

assert.equal(
  harness.calls.fetchRequests[0].target,
  "pl"
);

harness.storage.targetLanguage = "en";

harness.resetCalls();
harness.storage.autoTranslate = false;
await harness.send("Bez tłumaczenia");
assert.equal(harness.calls.fetchQueries.length, 0);
assert.equal(harness.calls.sent[0][1].content, "Bez tłumaczenia");

harness.resetCalls();
harness.storage.autoTranslate = true;
harness.setFetchMode("error");
await harness.send("Błąd sieci");
assert.equal(harness.calls.sent[0][1].content, "Błąd sieci");

harness.resetCalls();
harness.setFetchMode("echo");
harness.setConfirmation("cancel");
harness.setComposerState("");

await harness.send(
  "Anuluj wysłanie"
);

await new Promise(
  (resolve) => setTimeout(resolve, 0)
);

assert.equal(
  harness.calls.sent.length,
  0
);

assert.equal(
  harness.getDraftText(),
  "Anuluj wysłanie"
);

assert.equal(
  harness.getNativeText(),
  "Anuluj wysłanie"
);

assert.deepEqual(
  harness.calls.composerSync.slice(-2),
  [
    [
      "handleTextChanged",
      "Anuluj wysłanie"
    ],
    [
      "setText",
      "Anuluj wysłanie"
    ]
  ]
);

harness.plugin.onUnload();
assert.equal(harness.calls.unpatches, 3);

console.log("Runtime module lookup and patch registration: passed");
console.log("Automatic composer warm-up: passed");
console.log("Direct ChatInputActions mount: passed");
console.log("Protected Discord syntax round trip: passed");
console.log("Long-message chunking: passed");
console.log("Automatic source language request: passed");
console.log("Manual source language request: passed");
console.log("Preview source metadata and labels: passed");
console.log("Polish target language request: passed");
console.log("Auto Translate bypass: passed");
console.log("Network error fallback: passed");
console.log("Cancel restores DraftStore and native composer: passed");
console.log("onUnload removed all patches: passed");
