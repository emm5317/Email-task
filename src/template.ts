export interface TemplateTokens {
	subject: string;
	fromName: string;
	fromAddress: string;
	isoDate: string;
	dueDate: string;
	sourceFilename: string;
	tags: string;
	body: string;
}

/**
 * Substitute {{token}} placeholders in a template string.
 *
 * Unknown tokens are left untouched. A token whose value is the empty string
 * is replaced with empty (so "📅 {{dueDate}}" collapses cleanly when dueDate
 * is blank — see buildNoteContent for the trailing-signifier cleanup).
 */
export function renderTemplate(
	template: string,
	tokens: TemplateTokens
): string {
	return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
		if (Object.prototype.hasOwnProperty.call(tokens, key)) {
			return (tokens as unknown as Record<string, string>)[key] ?? "";
		}
		return match;
	});
}
