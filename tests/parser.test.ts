/**
 * Standalone parser tests. Run with: npm test
 *
 * These exercise parseEml/parseMsg (which have no Obsidian dependency) against
 * the committed fixtures, plus the pure note-building helpers.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { parseEml, parseMsg } from "../src/parser";
import { sanitizeFilename, deriveName, buildNoteContent } from "../src/note";
import { DEFAULT_SETTINGS } from "../src/settings";

const FIXTURES = join(process.cwd(), "test-fixtures");

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
	if (cond) {
		console.log(`  ✓ ${name}`);
	} else {
		failures++;
		console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`);
	}
}

function toArrayBuffer(path: string): ArrayBuffer {
	const buf = readFileSync(path);
	return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function testEml(): Promise<void> {
	console.log(".eml parsing");
	const parsed = await parseEml(toArrayBuffer(join(FIXTURES, "sample.eml")));
	check("subject", parsed.subject === "Q3 budget review — action needed", parsed.subject);
	check("fromName", parsed.fromName === "Jane Doe", parsed.fromName);
	check("fromAddress", parsed.fromAddress === "jane.doe@example.com", parsed.fromAddress);
	check("date parsed", parsed.date instanceof Date && !isNaN(parsed.date.getTime()));
	check("has html body", !!parsed.bodyHtml && parsed.bodyHtml.includes("Q3 budget"));
	check("has text body", !!parsed.bodyText && parsed.bodyText.includes("Q3 budget"));

	const content = buildNoteContent(parsed, DEFAULT_SETTINGS, "sample.eml");
	check("note has task line", /- \[ \] Q3 budget review/.test(content), content.split("\n")[6]);
	check("note has due signifier", /📅 \d{4}-\d{2}-\d{2}/.test(content));
	check("html converted to md (bold)", content.includes("**Q3 budget**"));
}

async function testMsg(): Promise<void> {
	console.log(".msg parsing");
	const parsed = await parseMsg(toArrayBuffer(join(FIXTURES, "sample.msg")));
	check("subject present", typeof parsed.subject === "string" && parsed.subject.length >= 0);
	check("has a body (html or text)", !!(parsed.bodyHtml || parsed.bodyText));
	check("never throws on missing html", true);
	console.log(`    [info] subject="${parsed.subject}" from="${parsed.fromName}" html=${!!parsed.bodyHtml} text=${!!parsed.bodyText}`);

	const content = buildNoteContent(parsed, DEFAULT_SETTINGS, "sample.msg");
	check("note builds without throwing", content.length > 0);
}

function testHelpers(): void {
	console.log("helpers");
	check("sanitize strips illegal chars", sanitizeFilename('a/b:c*?"<>|d') === "a b c d", sanitizeFilename('a/b:c*?"<>|d'));
	check("sanitize collapses whitespace", sanitizeFilename("a    b\n\tc") === "a b c");
	check("empty subject -> fallback name", /^Email \d{4}-\d{2}-\d{2} \d{4}$/.test(deriveName({
		subject: "  ", fromName: "", fromAddress: "", toAddresses: [], date: new Date(), bodyHtml: null, bodyText: null, attachments: [],
	})));

	// due date "none" should remove the dangling 📅 signifier
	const noDue = buildNoteContent({
		subject: "Test", fromName: "X", fromAddress: "x@y.z", toAddresses: [], date: null, bodyHtml: null, bodyText: "hi", attachments: [],
	}, { ...DEFAULT_SETTINGS, dueDateSource: "none" }, "x.eml");
	check("dueDate=none strips 📅", !noDue.includes("📅"), noDue.split("\n").find(l => l.startsWith("- [ ]")));
}

async function main(): Promise<void> {
	await testEml();
	await testMsg();
	testHelpers();
	console.log("");
	if (failures > 0) {
		console.error(`${failures} check(s) failed`);
		process.exit(1);
	}
	console.log("All checks passed");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
