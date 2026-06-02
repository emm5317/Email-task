import PostalMime from "postal-mime";
import MsgReader from "@kenjiuno/msgreader";
import type { ParsedEmail, EmailAttachment } from "./types";

/** Coerce postal-mime attachment content (ArrayBuffer | Uint8Array | string) to Uint8Array. */
function toUint8Array(
	content: ArrayBuffer | Uint8Array | string,
	encoding?: string
): Uint8Array {
	if (content instanceof Uint8Array) return content;
	if (content instanceof ArrayBuffer) return new Uint8Array(content);
	// string content
	if (encoding === "base64") {
		const binary = atob(content);
		const out = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
		return out;
	}
	return new TextEncoder().encode(content);
}

function parseDate(value: string | undefined | null): Date | null {
	if (!value) return null;
	const d = new Date(value);
	return isNaN(d.getTime()) ? null : d;
}

/** Parse a .eml (MIME) file. */
export async function parseEml(buf: ArrayBuffer): Promise<ParsedEmail> {
	const email = await PostalMime.parse(buf);

	const from = email.from;
	const fromName = from?.name ?? "";
	const fromAddress = from?.address ?? "";

	const toAddresses: string[] = [];
	for (const addr of email.to ?? []) {
		if ("address" in addr && addr.address) toAddresses.push(addr.address);
	}

	const attachments: EmailAttachment[] = (email.attachments ?? []).map(
		(a) => ({
			filename: a.filename ?? "attachment",
			mime: a.mimeType ?? "application/octet-stream",
			content: toUint8Array(a.content, a.encoding),
		})
	);

	return {
		subject: email.subject ?? "",
		fromName,
		fromAddress,
		toAddresses,
		date: parseDate(email.date),
		bodyHtml: email.html ?? null,
		bodyText: email.text ?? null,
		attachments,
	};
}

/**
 * Parse a .msg (Outlook OLE compound) file.
 *
 * Outlook sometimes stores the body only as compressed RTF; in that case
 * bodyHtml is undefined and we fall back to the plain-text body. We do NOT
 * attempt RTF de-encapsulation in v0.1 — never throw on a missing HTML body.
 */
export async function parseMsg(buf: ArrayBuffer): Promise<ParsedEmail> {
	const reader = new MsgReader(buf);
	const data = reader.getFileData();

	const recipients = data.recipients ?? [];
	const toAddresses: string[] = [];
	for (const r of recipients) {
		const addr = r.smtpAddress || r.email;
		if (addr) toAddresses.push(addr);
	}

	const attachments: EmailAttachment[] = [];
	for (const att of data.attachments ?? []) {
		try {
			const file = reader.getAttachment(att);
			if (file && file.content) {
				attachments.push({
					filename: file.fileName || att.fileName || "attachment",
					mime: att.attachMimeTag || "application/octet-stream",
					content: file.content,
				});
			}
		} catch {
			// skip unreadable attachment, keep parsing the rest
		}
	}

	const bodyHtml =
		typeof data.bodyHtml === "string" && data.bodyHtml.length > 0
			? data.bodyHtml
			: null;

	return {
		subject: data.subject ?? "",
		fromName: data.senderName ?? "",
		fromAddress: data.senderEmail ?? "",
		toAddresses,
		date: parseDate(data.messageDeliveryTime || data.clientSubmitTime),
		bodyHtml,
		bodyText: data.body ?? null,
		attachments,
	};
}
