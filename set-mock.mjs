import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function main() {
	const [, , name] = process.argv;

	if (!name) {
		console.error('Usage: node set-mock.mjs "name"');
		console.error('Updates mocks.json to point to <name>-messages.txt and <name>-responses.txt without modifying those files.');
		process.exitCode = 1;
		return;
	}

	const safeName = name.trim();
	const filePath = path.join(process.cwd(), 'mocks.json');
	const source = await readFile(filePath, 'utf8');

	const messagesBodyPattern = /"body": "@[^"]+-messages\.txt"/g;
	const responsesBodyPattern = /"body": "@[^"]+-responses\.txt"/g;

	const hasMessagesBodies = messagesBodyPattern.test(source);
	const hasResponsesBodies = responsesBodyPattern.test(source);

	if (!hasMessagesBodies || !hasResponsesBodies) {
		throw new Error(`No matching body references were found in ${filePath}`);
	}

	const next = source
		.replace(messagesBodyPattern, `"body": "@${safeName}-messages.txt"`)
		.replace(responsesBodyPattern, `"body": "@${safeName}-responses.txt"`);

	if (next !== source) {
		await writeFile(filePath, next, 'utf8');
		console.log(`Updated ${filePath} to use ${safeName}-messages.txt and ${safeName}-responses.txt`);
	} else {
		console.log(`No changes needed — ${filePath} already points to ${safeName}-messages.txt and ${safeName}-responses.txt`);
	}

	console.log('Done.');
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
