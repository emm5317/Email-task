import {
	Notice,
	Plugin,
	TAbstractFile,
	TFile,
	normalizePath,
} from "obsidian";
import {
	DEFAULT_SETTINGS,
	EmailToTaskSettings,
	EmailToTaskSettingTab,
} from "./settings";
import { parseEml, parseMsg } from "./parser";
import { createTaskNote, ensureFolder } from "./note";
import type { ParsedEmail } from "./types";

const SUPPORTED_EXTS = new Set(["eml", "msg"]);

export default class EmailToTaskPlugin extends Plugin {
	settings: EmailToTaskSettings;
	private ready = false;
	private processed = new Set<string>();

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new EmailToTaskSettingTab(this.app, this));

		// Wait until the initial vault scan is done before listening, so we do
		// not reprocess every existing file on launch (create fires for all).
		this.app.workspace.onLayoutReady(() => {
			this.ready = true;
			this.registerEvent(
				this.app.vault.on("create", (file) =>
					this.handleCreate(file)
				)
			);
			this.log("ready — watching", this.settings.watchFolder);
		});

		this.log("loaded");
	}

	onunload(): void {
		this.log("unloaded");
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private log(...args: unknown[]): void {
		if (this.settings?.debugLogging) {
			console.log("[email-to-task]", ...args);
		}
	}

	private isInsideFolder(path: string, folder: string): boolean {
		const base = normalizePath(folder.replace(/\/+$/, ""));
		if (!base || base === "/" || base === ".") return true; // empty = whole vault
		return path === base || path.startsWith(base + "/");
	}

	private async handleCreate(file: TAbstractFile): Promise<void> {
		if (!this.ready) return; // skip the startup flood
		if (!(file instanceof TFile)) return;

		const ext = file.extension.toLowerCase();
		if (!SUPPORTED_EXTS.has(ext)) return; // ignore .md (no loop) and everything else
		if (!this.isInsideFolder(file.path, this.settings.watchFolder)) return;
		if (this.processed.has(file.path)) return; // dedupe duplicate create events
		this.processed.add(file.path);

		await this.processEmail(file, ext);
	}

	private async processEmail(file: TFile, ext: string): Promise<void> {
		let parsed: ParsedEmail;
		try {
			const buf = await this.app.vault.readBinary(file);
			parsed = ext === "eml" ? await parseEml(buf) : await parseMsg(buf);
		} catch (err) {
			console.error("[email-to-task] parse failed", file.path, err);
			new Notice(`Email to Task: could not parse ${file.name} — skipped.`);
			this.processed.delete(file.path); // allow a retry on re-drop
			return;
		}

		let newNote: TFile;
		try {
			newNote = await createTaskNote(
				this.app.vault,
				this.settings,
				parsed,
				file.name
			);
		} catch (err) {
			console.error("[email-to-task] note creation failed", file.path, err);
			new Notice(
				`Email to Task: failed to create note for ${file.name}.`
			);
			this.processed.delete(file.path);
			return;
		}

		try {
			await this.disposeOriginal(file);
		} catch (err) {
			console.error("[email-to-task] disposition failed", file.path, err);
			new Notice(
				`Email to Task: note created, but could not handle the original ${file.name}.`
			);
		}

		if (this.settings.openOnCreate) {
			this.app.workspace.getLeaf(true).openFile(newNote);
		}

		new Notice(`Email to Task: created task from ${file.name}`);
		this.log("created", newNote.path, "from", file.path);
	}

	private async disposeOriginal(file: TFile): Promise<void> {
		switch (this.settings.originalDisposition) {
			case "delete":
				await this.app.fileManager.trashFile(file);
				return;
			case "move": {
				await ensureFolder(this.app.vault, this.settings.archiveFolder);
				const dir = this.settings.archiveFolder.replace(/\/+$/, "");
				let dest = normalizePath(`${dir}/${file.name}`);
				if (this.app.vault.getAbstractFileByPath(dest)) {
					dest = normalizePath(
						`${dir}/${file.basename}-${Date.now()}.${file.extension}`
					);
				}
				await this.app.fileManager.renameFile(file, dest);
				return;
			}
			case "keep":
			default:
				return;
		}
	}
}
