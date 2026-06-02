// Minimal runtime stand-ins for the Obsidian symbols used by note.ts, so the
// pure note-building/parser logic can be unit-tested outside Obsidian.
export function normalizePath(path: string): string {
	return path.replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\.\//, "");
}
export class Vault {}
export class TFile {}
export class TAbstractFile {}
export class Notice {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
