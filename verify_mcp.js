import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, 'mcp-server/dist/index.js');

const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
});

let buffer = '';

server.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const msg = JSON.parse(line);
            console.log('Received:', JSON.stringify(msg, null, 2));

            if (msg.result && msg.id === 1) {
                // Initialized, list tools
                send({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/list',
                });
            } else if (msg.result && msg.id === 2) {
                // Tools listed, call screen_list_windows
                send({
                    jsonrpc: '2.0',
                    id: 3,
                    method: 'tools/call',
                    params: {
                        name: 'screen_list_windows',
                        arguments: {},
                    },
                });
            } else if (msg.result && msg.id === 3) {
                // Result received
                console.log('Verification Successful!');
                process.exit(0);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    }
});

function send(msg) {
    console.log('Sending:', JSON.stringify(msg, null, 2));
    server.stdin.write(JSON.stringify(msg) + '\n');
}

// Start initialization
send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
    },
});
