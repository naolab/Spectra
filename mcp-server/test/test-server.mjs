#!/usr/bin/env node

/**
 * MCP Server Test Script
 * Tests the MCP server tools by sending JSON-RPC requests via stdin
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.resolve(__dirname, '../dist/index.js');

console.log('Starting MCP Server test...\n');

const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit']
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
    responseBuffer += data.toString();

    // Try to parse complete JSON-RPC messages
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || ''; // Keep incomplete line

    lines.forEach(line => {
        if (line.trim()) {
            try {
                const response = JSON.parse(line);
                console.log('Response:', JSON.stringify(response, null, 2));
            } catch (e) {
                console.log('Raw output:', line);
            }
        }
    });
});

server.on('close', (code) => {
    console.log(`\nServer exited with code ${code}`);
    process.exit(code || 0);
});

// Wait a bit for server to initialize
setTimeout(() => {
    console.log('Sending test requests...\n');

    // Test 1: List tools
    const listToolsRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
    };

    console.log('Test 1: Listing available tools');
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

    // Test 2: Get settings
    setTimeout(() => {
        const getSettingsRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'settings_get',
                arguments: {}
            }
        };

        console.log('\nTest 2: Getting current settings');
        server.stdin.write(JSON.stringify(getSettingsRequest) + '\n');
    }, 1000);

    // Test 3: List windows
    setTimeout(() => {
        const listWindowsRequest = {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
                name: 'screen_list_windows',
                arguments: {}
            }
        };

        console.log('\nTest 3: Listing windows');
        server.stdin.write(JSON.stringify(listWindowsRequest) + '\n');
    }, 2000);

    // Exit after tests
    setTimeout(() => {
        console.log('\nTests completed. Shutting down...');
        server.kill();
    }, 4000);
}, 500);
