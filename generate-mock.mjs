import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function printUsage() {
	console.error('Usage: node generate-mock.mjs "message to return" "name" [outputDir]');
	console.error('Creates <name>-messages.txt and <name>-responses.txt, then updates the active messages/responses bodies in mocks.json.');
}

function escapeJson(value) {
	return JSON.stringify(value);
}

async function updateMocksFile(name) {
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
		.replace(messagesBodyPattern, `"body": "@${name}-messages.txt"`)
		.replace(responsesBodyPattern, `"body": "@${name}-responses.txt"`);

	if (next !== source) {
		await writeFile(filePath, next, 'utf8');
	}
}

function createMessageMock(messageText, name) {
	return [
		'event: message_start',
		`data: ${escapeJson({
			type: 'message_start',
			message: {
				id: `msg_${name}_01`,
				type: 'message',
				role: 'assistant',
				content: [],
				model: 'claude-opus-4-5',
				stop_reason: null,
				stop_sequence: null,
				usage: {
					input_tokens: 10,
					output_tokens: 1,
				},
			},
		})}`,
		'',
		'event: content_block_start',
		`data: ${escapeJson({
			type: 'content_block_start',
			index: 0,
			content_block: {
				type: 'text',
				text: '',
			},
		})}`,
		'',
		'event: ping',
		`data: ${escapeJson({ type: 'ping' })}`,
		'',
		'event: content_block_delta',
		`data: ${escapeJson({
			type: 'content_block_delta',
			index: 0,
			delta: {
				type: 'text_delta',
				text: messageText,
			},
		})}`,
		'',
		'event: content_block_stop',
		`data: ${escapeJson({ type: 'content_block_stop', index: 0 })}`,
		'',
		'event: message_delta',
		`data: ${escapeJson({
			type: 'message_delta',
			delta: {
				stop_reason: 'end_turn',
				stop_sequence: null,
			},
			usage: {
				output_tokens: 12,
			},
		})}`,
		'',
		'event: message_stop',
		`data: ${escapeJson({ type: 'message_stop' })}`,
		'',
		'data: [DONE]',
		'',
	].join('\n');
}

function createResponseMock(messageText, name) {
	return [
		'event: response.created',
		`data: ${escapeJson({
			type: 'response.created',
			response: {
				id: `resp_${name}_01`,
				object: 'response',
				model: 'gpt-4.1',
				status: 'in_progress',
				output: [],
			},
		})}`,
		'',
		'event: response.in_progress',
		`data: ${escapeJson({
			type: 'response.in_progress',
			response: {
				id: `resp_${name}_01`,
				object: 'response',
				model: 'gpt-4.1',
				status: 'in_progress',
				output: [],
			},
		})}`,
		'',
		'event: response.output_item.added',
		`data: ${escapeJson({
			type: 'response.output_item.added',
			output_index: 0,
			item: {
				id: `msg_${name}_01`,
				type: 'message',
				role: 'assistant',
				status: 'in_progress',
				content: [],
			},
		})}`,
		'',
		'event: response.content_part.added',
		`data: ${escapeJson({
			type: 'response.content_part.added',
			output_index: 0,
			item_id: `msg_${name}_01`,
			content_index: 0,
			part: {
				type: 'output_text',
				text: '',
			},
		})}`,
		'',
		'event: response.output_text.delta',
		`data: ${escapeJson({
			type: 'response.output_text.delta',
			output_index: 0,
			item_id: `msg_${name}_01`,
			content_index: 0,
			delta: messageText,
		})}`,
		'',
		'event: response.output_item.done',
		`data: ${escapeJson({
			type: 'response.output_item.done',
			output_index: 0,
			item: {
				id: `msg_${name}_01`,
				type: 'message',
				role: 'assistant',
				status: 'completed',
				content: [
					{
						type: 'output_text',
						text: messageText,
					},
				],
			},
		})}`,
		'',
		'event: response.completed',
		`data: ${escapeJson({
			type: 'response.completed',
			response: {
				id: `resp_${name}_01`,
				object: 'response',
				model: 'gpt-4.1',
				status: 'completed',
				output: [
					{
						id: `msg_${name}_01`,
						type: 'message',
						role: 'assistant',
						status: 'completed',
						content: [
							{
								type: 'output_text',
								text: messageText,
							},
						],
					},
				],
			},
		})}`,
		'',
		'data: [DONE]',
		'',
	].join('\n');
}

async function main() {
	const [, , messageText, name, outputDir = '.'] = process.argv;

	if (!messageText || !name) {
		printUsage();
		process.exitCode = 1;
		return;
	}

	const safeName = name.trim();
	const targetDir = path.resolve(process.cwd(), outputDir);
	const messagesPath = path.join(targetDir, `${safeName}-messages.txt`);
	const responsesPath = path.join(targetDir, `${safeName}-responses.txt`);

	await mkdir(targetDir, { recursive: true });
	await Promise.all([
		writeFile(messagesPath, createMessageMock(messageText, safeName), 'utf8'),
		writeFile(responsesPath, createResponseMock(messageText, safeName), 'utf8'),
	]);

	await updateMocksFile(safeName);

	console.log(`Wrote ${messagesPath}`);
	console.log(`Wrote ${responsesPath}`);
	console.log(`Updated ${path.join(process.cwd(), 'mocks.json')}`);
	console.log('Done.');
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});