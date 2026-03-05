# VS Code Token Meter Extension

## Overview
VS Code extension that counts tokens in the current file or selected text using tiktoken. Displays count in the status bar.

## Build & Dev
- `npm install` - install dependencies
- `npm run build` - compile TypeScript
- `npm run watch` - watch mode for development
- F5 in VS Code - launch Extension Development Host
- `vsce package` - build .vsix

## Architecture
- `src/extension.ts` - single-file extension with all logic
- Uses `tiktoken` npm package for tokenization
- Status bar item (right-aligned) shows token count
- Debounces updates at 300ms
- `encoding_for_model()` with fallback to `cl100k_base`

## Settings
- `tokenMeter.model` - tiktoken model name (default: gpt-4o)
- `tokenMeter.filePatterns` - glob patterns for files to count (default: common text/code extensions)
