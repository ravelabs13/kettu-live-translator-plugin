# Kettu Translate

**Universal real-time conversation translator for Kettu.**

Kettu Translate helps you communicate with people who speak different languages directly from the Discord message composer.

Write naturally in your own language, translate the message, review the result and continue the conversation without leaving Discord.

> **Built for conversations, not posts.**
>
> Kettu Translate translates your outgoing messages while you are chatting.
> It does **not** automatically translate the Discord message feed or other users' posts.

## What it does

Kettu Translate adds a compact `SOURCE→TARGET` control directly above the Discord composer.

With the default configuration you will see:

`AUTO→EN`

`AUTO` means the source language is detected automatically.

You can also choose a fixed source language manually.

## Main features

- Real-time outgoing conversation translation
- Automatic source-language detection
- Manual source-language selection
- 33 selectable languages
- Global target language
- Per-channel target-language overrides
- Manual translation before sending
- Automatic translation when pressing Send
- Translation preview before the message is sent
- Option to send the translation or keep/send the original
- Per-channel Auto Translate ON/OFF
- Protection for Discord mentions, links, emoji, timestamps and code
- Long-message chunking
- Composer synchronization so translated text remains consistent with the Discord draft
- Automatic translator-button mounting when Discord starts

## How manual translation works

1. Type a message normally.
2. Tap the `SOURCE→TARGET` button.
3. Kettu Translate detects or uses the configured source language.
4. The translation is shown in **Review translation**.
5. Choose the translated version.
6. The translated text is inserted into the Discord composer.
7. Review it and press Send normally.

The plugin does not send the manually translated message automatically.

You remain in control of the final message.

## Auto Translate

Kettu Translate can also translate automatically when you press Discord's Send button.

When Auto Translate is enabled:

1. Write your message.
2. Press Send.
3. Translation runs before the message is sent.
4. **Review translation** appears.
5. Choose the translated message, the original message, or cancel.

Auto Translate can be configured globally and overridden for individual channels.

You can also long-press the translator button to toggle Auto Translate for the current channel.

## Language detection

The default source language is:

`Auto-detect`

When automatic detection is enabled, the button uses:

`AUTO→TARGET`

For example:

`AUTO→EN`

After translation, the Preview can show the detected language, for example:

`POLISH · DETECTED`

If automatic detection is unreliable for a particular conversation, open Kettu Translate settings and choose a fixed source language.

## Supported languages

Kettu Translate currently exposes the following languages:

Polish, English, German, Spanish, French, Italian, Portuguese, Dutch, Swedish, Norwegian, Danish, Finnish, Czech, Slovak, Ukrainian, Russian, Turkish, Greek, Romanian, Hungarian, Bulgarian, Croatian, Serbian, Japanese, Korean, Chinese (Simplified), Chinese (Traditional), Arabic, Hebrew, Hindi, Indonesian, Vietnamese and Thai.

## Discord syntax protection

Kettu Translate protects common Discord-specific content from normal translation processing, including:

- mentions
- role/channel references
- URLs
- custom emoji
- Discord timestamps
- inline code
- fenced code blocks

This helps keep Discord-specific syntax usable after translation.

## Installation

### Recommended environment

Kettu Translate was developed and device-tested with the **official Kettu project on iOS**.

Official project:

- GitHub mirror: https://github.com/C0C0B01/Kettu
- Canonical Kettu repository: https://codeberg.org/cocobo1/Kettu

Compatibility with unofficial forks, old Bunny/Vendetta builds or modified Kettu versions is not guaranteed.

### Install the plugin

1. Install and configure Kettu.
2. Open Discord.
3. Open **Settings → Kettu → Plugins**.
4. Tap `+`.
5. Paste the Kettu Translate plugin URL:

`https://raw.githubusercontent.com/ravelabs13/kettu-live-translator-plugin/main/`

6. Install and enable the plugin.
7. Fully restart Discord.
8. Open a text channel.

The `AUTO→EN` button should appear automatically above the message composer.

## Settings

Kettu Translate provides:

**Source language**

Choose `Auto-detect` or select a fixed source language.

**Auto Translate by default**

Automatically translate outgoing messages when Send is pressed.

**Default target language**

Select the default language you want to translate your messages into.

**Ask after translation errors**

Choose whether Kettu Translate asks what to do when translation fails or simply keeps the original text as a draft.

**Current channel**

View and configure channel-specific behavior.

**Auto Translate override**

A channel can inherit the global setting or force Auto Translate ON/OFF.

**Target language for this channel**

A channel can use its own target language instead of the global default.

## Privacy / network usage

Translation requires an internet connection.

The text that needs translation is sent to the Google Translate web translation endpoint used by the plugin.

Discord-specific protected segments such as mentions, links and code are replaced with temporary placeholders before translation and restored afterwards.

Kettu Translate does not provide its own translation server.

## What Kettu Translate does NOT do

Kettu Translate is not an incoming-message translator.

It does not automatically translate:

- the Discord message feed
- posts written by other users
- server history
- channel content already displayed on screen

Its purpose is to help **you write and send messages during multilingual conversations**.

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Polish documentation

Polska wersja dokumentacji:

[README_PL.md](README_PL.md)

## Author

**RaveLabs**

## Disclaimer

Kettu Translate is an independent plugin.

It is not affiliated with Discord, Google or the Kettu project.

## License

RaveLabs' own Kettu Translate code is licensed under [MPL-2.0](LICENSE). Copyright © 2026 RaveLabs.

The editable source corresponding to this minified `index.js` is included in the [v1.3.1 source package](Kettu-Translate-v1.3.1-source.zip). RaveLabs' source files in that package are offered under MPL-2.0 with the full terms in this release's `LICENSE`.

The `index.js` bundle also includes `@swc/helpers` under Apache-2.0. See [third-party notices](THIRD_PARTY_NOTICES.md) and the [full Apache-2.0 license](LICENSES/Apache-2.0.txt).
