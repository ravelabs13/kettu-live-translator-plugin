# Changelog

All notable public changes to Kettu Translate are documented here.

## 1.3.1 — 2026-10-07

### Kettu Translate

- Rebranded the plugin as **Kettu Translate**
- Repositioned the project as a universal real-time conversation translator
- Added automatic source-language detection
- Added manual source-language selection
- Added dynamic `SOURCE→TARGET` button labels
- Added detected-language information to translation Preview
- Added Polish as a normal selectable target language
- Added global and per-channel target settings
- Added per-channel Auto Translate overrides
- Added automatic composer mounting at Discord startup
- Added direct `ChatInputActions` integration
- Preserved a legacy composer fallback
- Hardened DraftStore/native composer synchronization
- Preserved Discord mentions, URLs, emoji, timestamps and code during translation
- Added long-message chunking
- Added translation error handling
- Removed development diagnostics from the production bundle
- Replaced the old Polish-only identity and metadata
- Device-tested on iOS with Kettu

## Project history

The project originally started as a Polish outgoing-message translator.

It evolved into a universal multilingual conversation tool with automatic source-language detection and configurable target languages.

The public release package contains the production runtime, documentation, licenses and a separate source archive.

The editable source, tests and build files are included in that archive.
