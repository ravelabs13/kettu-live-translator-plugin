# Kettu Translate — Troubleshooting

## The translator button does not appear

Expected behavior after a normal Discord restart:

`AUTO→EN`

should appear automatically above the composer.

Try:

1. Confirm that Kettu Translate is enabled.
2. Fully close Discord.
3. Start Discord again.
4. Open a normal text channel.
5. Wait a few seconds.

Kettu Translate was tested with the official Kettu project on iOS.

Older Kettu builds, Bunny/Vendetta forks or modified clients may expose different internal Discord components.

On some incompatible builds, opening the composer side actions with the `+` button may trigger the legacy fallback mount.

## The button says LANGUAGE

This is normal when the composer is empty.

Tap the button to choose the target language.

After entering text, the lower label changes to:

`TRANSLATE`

## What does AUTO mean?

`AUTO` means automatic source-language detection.

Example:

`AUTO→EN`

means:

detect the language automatically and translate it to English.

You can choose a fixed source language in Kettu Translate settings.

## Translation inserts text but does not send it

This is intentional in manual mode.

Manual translation inserts the translated message into Discord's composer so you can review it before sending.

Press Send normally when you are satisfied with the result.

## Auto Translate translates when I press Send

That is the purpose of Auto Translate.

Long-press the translator button to toggle Auto Translate for the current channel.

You can also change it in the plugin settings.

## The wrong target language is being used

Check both:

- Default target language
- Target language for this channel

A channel-specific target overrides the global target.

Select **Use global** in the channel target picker to remove the override.

## The source language is detected incorrectly

Open:

Kettu Translate → Source language

and select the language manually instead of Auto-detect.

## Translation fails

Possible causes include:

- no internet connection
- temporary translation-service failure
- network filtering
- unsupported/incompatible Kettu build

If **Ask after translation errors** is enabled, Kettu Translate can offer the original message instead.

Otherwise the original text is kept in the composer.

## Mentions, links or code

Kettu Translate protects common Discord syntax before translation.

Protected content includes mentions, URLs, custom emoji, timestamps and code.

If you find a Discord syntax case that is not preserved correctly, report the exact original text and translated result.

## The plugin does not translate messages from other users

This is expected.

Kettu Translate is an **outgoing real-time conversation translator**.

It helps you write messages in multilingual conversations.

It is not a translator for the Discord feed, posts or incoming messages.

## Plugin works on one Kettu build but not another

Kettu Translate depends on internal Discord/Kettu composer modules.

Discord and client modifications can change these components.

The supported/reference environment is the official Kettu project:

GitHub mirror:

https://github.com/C0C0B01/Kettu

Canonical repository:

https://codeberg.org/cocobo1/Kettu

Compatibility with forks is not guaranteed.

## After updating the plugin

If an update appears not to take effect:

1. disable and re-enable Kettu Translate
2. fully restart Discord
3. if necessary, remove the plugin and install the current URL again

## Debug information

If reporting a problem, include:

- iOS version
- Discord version
- Kettu/KettuTweak version or build
- Kettu Translate version
- whether the translator button appears
- whether `AUTO→EN` appears after restart
- whether manual translation works
- whether Auto Translate works
- relevant Kettu debug-log errors

Do not include private messages, tokens or account credentials.
