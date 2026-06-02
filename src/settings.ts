import { App, PluginSettingTab, Setting } from "obsidian";
import type EmailToTaskPlugin from "./main";

export type DueDateSource = "emailDate" | "today" | "none";
export type OriginalDisposition = "keep" | "move" | "delete";

export interface EmailToTaskSettings {
	watchFolder: string;
	outputFolder: string;
	template: string;
	dueDateSource: DueDateSource;
	convertHtml: boolean;
	originalDisposition: OriginalDisposition;
	archiveFolder: string;
	openOnCreate: boolean;
	defaultTags: string; // comma-separated list
	debugLogging: boolean;
}

export const DEFAULT_TEMPLATE = `---
type: email-task
from: "{{fromName}} <{{fromAddress}}>"
date: {{isoDate}}
subject: "{{subject}}"
source: "{{sourceFilename}}"
tags: [{{tags}}]
---
- [ ] {{subject}} — {{fromName}} 📅 {{dueDate}}

{{body}}
`;

export const DEFAULT_SETTINGS: EmailToTaskSettings = {
	watchFolder: "Inbox/Email",
	outputFolder: "Tasks/Email",
	template: DEFAULT_TEMPLATE,
	dueDateSource: "emailDate",
	convertHtml: true,
	originalDisposition: "move",
	archiveFolder: "Inbox/Email/_archive",
	openOnCreate: false,
	defaultTags: "email",
	debugLogging: false,
};

export class EmailToTaskSettingTab extends PluginSettingTab {
	plugin: EmailToTaskPlugin;

	constructor(app: App, plugin: EmailToTaskPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Watch folder")
			.setDesc(
				"Folder inside the vault to watch for dropped .eml/.msg files. Files elsewhere are ignored."
			)
			.addText((text) =>
				text
					.setPlaceholder("Inbox/Email")
					.setValue(this.plugin.settings.watchFolder)
					.onChange(async (value) => {
						this.plugin.settings.watchFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Output folder")
			.setDesc("Folder where generated task notes are created.")
			.addText((text) =>
				text
					.setPlaceholder("Tasks/Email")
					.setValue(this.plugin.settings.outputFolder)
					.onChange(async (value) => {
						this.plugin.settings.outputFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Due date source")
			.setDesc(
				"What to use for the Tasks 📅 due date: the email's date, today, or omit it."
			)
			.addDropdown((dd) =>
				dd
					.addOption("emailDate", "Email date")
					.addOption("today", "Today")
					.addOption("none", "None")
					.setValue(this.plugin.settings.dueDateSource)
					.onChange(async (value) => {
						this.plugin.settings.dueDateSource =
							value as DueDateSource;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Convert HTML body to Markdown")
			.setDesc(
				"When on, HTML email bodies are converted to Markdown. When off, the plain-text body is used."
			)
			.addToggle((tg) =>
				tg
					.setValue(this.plugin.settings.convertHtml)
					.onChange(async (value) => {
						this.plugin.settings.convertHtml = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Original file disposition")
			.setDesc(
				"What to do with the dropped .eml/.msg file after a note is created."
			)
			.addDropdown((dd) =>
				dd
					.addOption("keep", "Keep in place")
					.addOption("move", "Move to archive folder")
					.addOption("delete", "Delete")
					.setValue(this.plugin.settings.originalDisposition)
					.onChange(async (value) => {
						this.plugin.settings.originalDisposition =
							value as OriginalDisposition;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Archive folder")
			.setDesc('Destination folder when disposition is "Move to archive folder".')
			.addText((text) =>
				text
					.setPlaceholder("Inbox/Email/_archive")
					.setValue(this.plugin.settings.archiveFolder)
					.onChange(async (value) => {
						this.plugin.settings.archiveFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Open note on create")
			.setDesc("Open each generated note in a new tab as it is created.")
			.addToggle((tg) =>
				tg
					.setValue(this.plugin.settings.openOnCreate)
					.onChange(async (value) => {
						this.plugin.settings.openOnCreate = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default tags")
			.setDesc(
				"Comma-separated tags added via the {{tags}} token (e.g. email, work)."
			)
			.addText((text) =>
				text
					.setPlaceholder("email")
					.setValue(this.plugin.settings.defaultTags)
					.onChange(async (value) => {
						this.plugin.settings.defaultTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Note template")
			.setDesc(
				"Tokens: {{subject}} {{fromName}} {{fromAddress}} {{isoDate}} {{dueDate}} {{sourceFilename}} {{tags}} {{body}}"
			)
			.setClass("email-to-task-setting-template")
			.addTextArea((ta) =>
				ta
					.setValue(this.plugin.settings.template)
					.onChange(async (value) => {
						this.plugin.settings.template = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Reset template to default")
			.addButton((btn) =>
				btn.setButtonText("Reset").onClick(async () => {
					this.plugin.settings.template = DEFAULT_TEMPLATE;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName("Debug logging")
			.setDesc("Log processing steps to the developer console.")
			.addToggle((tg) =>
				tg
					.setValue(this.plugin.settings.debugLogging)
					.onChange(async (value) => {
						this.plugin.settings.debugLogging = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
