// Assemble the deployable artifact in dist/: exactly the three files Obsidian
// loads at runtime (main.js, manifest.json, styles.css). Run after a prod build.
import { copyFileSync, mkdirSync, existsSync } from "fs";

const files = ["main.js", "manifest.json", "styles.css"];

mkdirSync("dist", { recursive: true });
for (const f of files) {
	if (!existsSync(f)) {
		console.error(`Missing ${f} — run \`npm run build\` first.`);
		process.exit(1);
	}
	copyFileSync(f, `dist/${f}`);
	console.log(`dist/${f}`);
}
console.log("\nCopy these three files to <vault>/.obsidian/plugins/email-to-task/");
