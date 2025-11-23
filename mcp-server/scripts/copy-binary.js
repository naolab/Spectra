import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_BINARY = path.resolve(__dirname, '../../capture/mac/.build/release/mac');
const DEST_DIR = path.resolve(__dirname, '../bin');
const DEST_BINARY = path.join(DEST_DIR, 'mac');

async function copyBinary() {
    try {
        // Check if source binary exists
        try {
            await fs.access(SOURCE_BINARY);
        } catch (error) {
            console.error(`Error: Source binary not found at ${SOURCE_BINARY}`);
            console.error('Please run "swift build -c release" in capture/mac directory first.');
            process.exit(1);
        }

        // Create destination directory
        await fs.mkdir(DEST_DIR, { recursive: true });

        // Copy binary
        await fs.copyFile(SOURCE_BINARY, DEST_BINARY);

        // Ensure executable permission
        await fs.chmod(DEST_BINARY, 0o755);

        console.log(`Successfully copied Swift binary to ${DEST_BINARY}`);
    } catch (error) {
        console.error('Failed to copy binary:', error);
        process.exit(1);
    }
}

copyBinary();
