#!/usr/bin/env node

/**
 * Simple MCP Client - Bridges Claude Desktop to remote MCP endpoints
 * Usage: node simple-mcp-client.js <MCP_ENDPOINT_URL>
 *
 * This client:
 * - Reads JSON-RPC requests from stdin (from Claude Desktop)
 * - Forwards them to the remote MCP endpoint
 * - Returns responses to stdout (back to Claude Desktop)
 */

import fetch from 'node-fetch';
import { createInterface } from 'readline';

const MCP_ENDPOINT = process.argv[2];

if (!MCP_ENDPOINT) {
  console.error('Error: MCP endpoint URL required');
  console.error('Usage: node simple-mcp-client.js <MCP_ENDPOINT_URL>');
  process.exit(1);
}

console.error(`[MCP Client] Connecting to: ${MCP_ENDPOINT}`);

// Create readline interface to read from stdin
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Buffer for accumulating input
let inputBuffer = '';

rl.on('line', async (line) => {
  inputBuffer += line;

  // Try to parse as JSON
  try {
    const request = JSON.parse(inputBuffer);
    inputBuffer = ''; // Clear buffer on successful parse

    console.error(`[MCP Client] Request: ${request.method || 'unknown'}`);

    // Forward request to remote MCP endpoint
    try {
      const response = await fetch(MCP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Send response back to Claude Desktop via stdout
      console.log(JSON.stringify(result));

    } catch (error) {
      console.error(`[MCP Client] Error: ${error.message}`);

      // Send error response
      const errorResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message
        }
      };
      console.log(JSON.stringify(errorResponse));
    }

  } catch (e) {
    // Not complete JSON yet, continue buffering
  }
});

rl.on('close', () => {
  console.error('[MCP Client] Connection closed');
  process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.error('[MCP Client] Interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MCP Client] Terminated');
  process.exit(0);
});
