export interface EmailAttachment {
	filename: string;
	mime: string;
	content: Uint8Array;
}

/**
 * Normalized representation of a parsed email. Both .eml and .msg parsers
 * produce this shape so the rest of the plugin is parser-agnostic.
 */
export interface ParsedEmail {
	subject: string; // may be empty -> caller supplies fallback
	fromName: string;
	fromAddress: string;
	toAddresses: string[];
	date: Date | null;
	bodyHtml: string | null;
	bodyText: string | null;
	attachments: EmailAttachment[];
}
