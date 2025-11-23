#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

// Determine paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOME_DIR = process.env.HOME || "";
const SETTINGS_PATH = path.join(HOME_DIR, "Library/Application Support/Spectra/settings.json");

// Path resolution for Swift binary
// 1. Check for bundled binary (npm install / dist)
//    Structure: package/dist/index.js -> package/bin/mac
const BUNDLED_BINARY_PATH = path.resolve(__dirname, "../bin/mac");

// 2. Check for local dev binary (source checkout)
//    Structure: mcp-server/src/index.ts -> ../../capture/mac/.build/debug/mac
//    Or: mcp-server/dist/index.js -> ../../capture/mac/.build/debug/mac
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const DEV_BINARY_PATH = path.resolve(PROJECT_ROOT, "capture/mac/.build/debug/mac");
const DEV_RELEASE_BINARY_PATH = path.resolve(PROJECT_ROOT, "capture/mac/.build/release/mac");

let SWIFT_BINARY_PATH = BUNDLED_BINARY_PATH;

async function resolveBinaryPath() {
    try {
        await fs.access(BUNDLED_BINARY_PATH);
        return BUNDLED_BINARY_PATH;
    } catch {
        // Fallback to dev paths
        try {
            await fs.access(DEV_RELEASE_BINARY_PATH);
            return DEV_RELEASE_BINARY_PATH;
        } catch {
            return DEV_BINARY_PATH;
        }
    }
}

interface Settings {
    target: {
        type: "window" | "screen" | "region";
        windowId?: number;
        screenId?: number; // or string if using UUID, but Swift uses CGDirectDisplayID (UInt32)
        region?: { x: number; y: number; width: number; height: number };
    };
    region?: { x: number; y: number; width: number; height: number } | null; // Legacy/Global region override?
}

const server = new Server(
    {
        name: "spectra-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "screen_capture_latest",
                description: "Capture the latest screen content based on settings.json configuration.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "screen_list_windows",
                description: "List all open windows with their IDs and details.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "screen_capture_window",
                description: "Capture a specific window by ID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        windowId: { type: "number", description: "The ID of the window to capture" },
                    },
                    required: ["windowId"],
                },
            },
            {
                name: "screen_capture_region",
                description: "Capture a specific screen region.",
                inputSchema: {
                    type: "object",
                    properties: {
                        x: { type: "number" },
                        y: { type: "number" },
                        width: { type: "number" },
                        height: { type: "number" },
                    },
                    required: ["x", "y", "width", "height"],
                },
            },
            {
                name: "settings_get",
                description: "Get the current settings.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "settings_set",
                description: "Update the settings.",
                inputSchema: {
                    type: "object",
                    properties: {
                        target: {
                            type: "object",
                            properties: {
                                type: { type: "string", enum: ["window", "screen", "region"] },
                                windowId: { type: "number" },
                                screenId: { type: "number" },
                                region: {
                                    type: "object",
                                    properties: {
                                        x: { type: "number" },
                                        y: { type: "number" },
                                        width: { type: "number" },
                                        height: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        switch (request.params.name) {
            case "screen_capture_latest": {
                const settings = await readSettings();
                return await captureBasedOnSettings(settings);
            }
            case "screen_list_windows": {
                const { stdout } = await execFileAsync(SWIFT_BINARY_PATH, ["list_windows"], {
                    maxBuffer: 10 * 1024 * 1024, // 10MB buffer for window list
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: stdout,
                        },
                    ],
                };
            }
            case "screen_capture_window": {
                const windowId = request.params.arguments?.windowId as number;
                const result = await runCaptureCommand("capture_window", [String(windowId)]);
                return {
                    content: [
                        {
                            type: "image",
                            data: result.data,
                            mimeType: "image/jpeg",
                        },
                    ],
                };
            }
            case "screen_capture_region": {
                const args = request.params.arguments as any;
                const result = await runCaptureCommand("capture_region", [
                    String(args.x),
                    String(args.y),
                    String(args.width),
                    String(args.height),
                ]);
                return {
                    content: [
                        {
                            type: "image",
                            data: result.data,
                            mimeType: "image/jpeg",
                        },
                    ],
                };
            }
            case "settings_get": {
                const settings = await readSettings();
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(settings, null, 2),
                        },
                    ],
                };
            }
            case "settings_set": {
                const newSettings = request.params.arguments as any;
                // Merge with existing settings
                const currentSettings = await readSettings();
                const updatedSettings = { ...currentSettings, ...newSettings };
                await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
                await fs.writeFile(SETTINGS_PATH, JSON.stringify(updatedSettings, null, 2));
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(updatedSettings, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new McpError(ErrorCode.MethodNotFound, "Unknown tool");
        }
    } catch (error: any) {
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: `Error: ${error.message}`,
                },
            ],
        };
    }
});

async function readSettings(): Promise<Settings> {
    try {
        const data = await fs.readFile(SETTINGS_PATH, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        // Default settings if file missing
        return {
            target: {
                type: "screen",
            },
        };
    }
}

async function captureBasedOnSettings(settings: Settings) {
    const target = settings.target;
    let command = "";
    let args: string[] = [];

    if (target.type === "window" && target.windowId) {
        command = "capture_window";
        args = [String(target.windowId)];
    } else if (target.type === "screen") {
        command = "capture_display";
        if (target.screenId) {
            args = [String(target.screenId)];
        }
    } else if (target.type === "region" && target.region) {
        command = "capture_region";
        args = [
            String(target.region.x),
            String(target.region.y),
            String(target.region.width),
            String(target.region.height),
        ];
    } else {
        // Fallback to main screen
        command = "capture_display";
    }

    const result = await runCaptureCommand(command, args);
    return {
        content: [
            {
                type: "image",
                data: result.data,
                mimeType: "image/jpeg",
            },
        ],
    };
}

async function runCaptureCommand(command: string, args: string[]) {
    const { stdout } = await execFileAsync(SWIFT_BINARY_PATH, [command, ...args], {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for high-resolution captures
    });
    // Swift outputs JSON: { type: "image", format: "jpeg", data: "base64..." }
    // We need to parse it.
    try {
        const json = JSON.parse(stdout);
        return json;
    } catch (e) {
        throw new Error(`Failed to parse capture output: ${stdout}`);
    }
}

async function main() {
    SWIFT_BINARY_PATH = await resolveBinaryPath();
    // console.error(`Using Swift binary at: ${SWIFT_BINARY_PATH}`); // Debug log

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
