import * as vscode from 'vscode';
import { encoding_for_model, get_encoding, type TiktokenModel, type Tiktoken } from 'tiktoken';

let statusBarItem: vscode.StatusBarItem;
let encoder: Tiktoken | undefined;
let currentModel: string = '';
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export function activate(context: vscode.ExtensionContext) {
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = 'tokenMeter.selectModel';
	context.subscriptions.push(statusBarItem);

	const selectModelCommand = vscode.commands.registerCommand('tokenMeter.selectModel', async () => {
		const config = vscode.workspace.getConfiguration('tokenMeter');
		const enumValues: string[] = require('../package.json').contributes.configuration.properties['tokenMeter.model'].enum;

		const picked = await vscode.window.showQuickPick(enumValues, {
			placeHolder: `Current model: ${config.get<string>('model')}`,
		});

		if (picked) {
			await config.update('model', picked, vscode.ConfigurationTarget.Global);
		}
	});
	context.subscriptions.push(selectModelCommand);

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(() => scheduleUpdate()),
		vscode.window.onDidChangeTextEditorSelection(() => scheduleUpdate()),
		vscode.workspace.onDidChangeTextDocument(() => scheduleUpdate()),
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('tokenMeter')) {
				resetEncoder();
				scheduleUpdate();
			}
		}),
	);

	scheduleUpdate();
}

function scheduleUpdate() {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}
	debounceTimer = setTimeout(updateTokenCount, 300);
}

function resetEncoder() {
	if (encoder) {
		encoder.free();
		encoder = undefined;
		currentModel = '';
	}
}

function getEncoder(model: string): Tiktoken {
	if (encoder && currentModel === model) {
		return encoder;
	}
	resetEncoder();
	try {
		encoder = encoding_for_model(model as TiktokenModel);
	} catch {
		encoder = get_encoding('cl100k_base');
	}
	currentModel = model;
	return encoder;
}

function matchesFilePattern(fileName: string, patterns: string[]): boolean {
	const baseName = fileName.split('/').pop() ?? fileName;
	for (const pattern of patterns) {
		if (pattern === '*') {
			return true;
		}
		// Simple glob: *.ext
		if (pattern.startsWith('*.')) {
			const ext = pattern.slice(1); // e.g. ".md"
			if (baseName.endsWith(ext)) {
				return true;
			}
		} else if (baseName === pattern) {
			return true;
		}
	}
	return false;
}

function updateTokenCount() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		statusBarItem.hide();
		return;
	}

	const config = vscode.workspace.getConfiguration('tokenMeter');
	const patterns = config.get<string[]>('filePatterns', ['*']);
	const fileName = editor.document.fileName;

	if (!matchesFilePattern(fileName, patterns)) {
		statusBarItem.hide();
		return;
	}

	const model = config.get<string>('model', 'gpt-4o');
	const enc = getEncoder(model);

	const selection = editor.selection;
	const text = selection.isEmpty
		? editor.document.getText()
		: editor.document.getText(selection);

	const tokens = enc.encode(text);
	const count = tokens.length;
	const formatted = count.toLocaleString();

	const label = selection.isEmpty ? 'tokens' : 'tokens (selected)';
	statusBarItem.text = `$(symbol-numeric) ${formatted} ${label} (${model})`;
	statusBarItem.tooltip = `Token count using ${model}. Click to change model.`;
	statusBarItem.show();
}

export function deactivate() {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}
	resetEncoder();
}
