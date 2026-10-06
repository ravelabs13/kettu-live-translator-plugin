import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bundle = await readFile("index.js", "utf8");

function createHarness() {
  const calls = {
    fetchQueries: [],
    logs: [],
    patches: {},
    sent: [],
    toasts: [],
    unpatches: 0
  };
  const pluginStorage = {
    autoTranslate: true,
    channelOverrides: {},
    errorBehavior: "ask",
    targetLanguage: "en"
  };
  const ChatInputGuardWrapper = { default() {} };
  const Messaging = { sendMessage() {} };
  const stores = {
    ChannelStore: { getChannel: () => ({ name: "general" }) },
    DraftStore: { getDraft: () => "" },
    SelectedChannelStore: { getChannelId: () => "channel-1" }
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
      findByName: (name) => name === "ChatInputGuardWrapper" ? ChatInputGuardWrapper : undefined,
      findByProps: (...props) => props.includes("sendMessage") ? Messaging : undefined,
      findByStoreName: (name) => stores[name]
    },
    patcher: {
      after: (method, target, callback) => registerPatch("composer", method, target, callback),
      before: () => () => {},
      instead: (method, target, callback) => registerPatch("sending", method, target, callback)
    },
    plugin: { storage: pluginStorage },
    storage: { useProxy() {} },
    ui: {
      alerts: {
        showConfirmationAlert(options) {
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
        const query = new URL(url).searchParams.get("q");
        calls.fetchQueries.push(query);
        if (fetchMode === "error") throw new Error("offline");
        return {
          ok: true,
          async json() {
            return { sentences: [{ trans: query }] };
          }
        };
      }
    }
  };

  const plugin = Function("vendetta", `return ${bundle}`)(vendetta).default;

  return {
    calls,
    plugin,
    storage: pluginStorage,
    resetCalls() {
      calls.fetchQueries.length = 0;
      calls.sent.length = 0;
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

assert.equal(harness.calls.patches.composer.method, "default");
assert.equal(harness.calls.patches.sending.method, "sendMessage");
assert.ok(harness.calls.logs.some((entry) => String(entry[1]).includes("Active: composer button, outgoing translation")));

const protectedMessage = "Zażółć <@123> https://example.com `const x = 1`";
await harness.send(protectedMessage);
assert.equal(harness.calls.sent.length, 1);
assert.equal(harness.calls.sent[0][1].content, protectedMessage);
assert.equal(harness.calls.fetchQueries.length, 1);

harness.resetCalls();
const longMessage = "ą".repeat(1301);
await harness.send(longMessage);
assert.equal(harness.calls.fetchQueries.length, 2);
assert.equal(harness.calls.sent[0][1].content, longMessage);

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
await harness.send("Anuluj wysłanie");
assert.equal(harness.calls.sent.length, 0);

harness.plugin.onUnload();
assert.equal(harness.calls.unpatches, 2);

console.log("Runtime module lookup and patch registration: passed");
console.log("Protected Discord syntax round trip: passed");
console.log("Long-message chunking: passed");
console.log("Auto Translate bypass: passed");
console.log("Network error fallback: passed");
console.log("Cancel keeps the message unsent: passed");
console.log("onUnload removed both patches: passed");
