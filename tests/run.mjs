import esbuild from "esbuild";
import { tmpdir } from "os";
import { join } from "path";
import { pathToFileURL } from "url";

const outfile = join(tmpdir(), `email-to-task-test-${Date.now()}.cjs`);

await esbuild.build({
	entryPoints: ["tests/parser.test.ts"],
	bundle: true,
	platform: "node",
	format: "cjs",
	target: "node18",
	outfile,
	alias: { obsidian: "./tests/obsidian-shim.ts" },
	logLevel: "warning",
});

await import(pathToFileURL(outfile).href);
