import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'frontend/src/assets/logo.png')
    });

    // Load the frontend URL (assuming dev mode for now, or built files later)
    // In production, this should load the built index.html
    // For now, we'll wait for the server to start
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
    }, 2000);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function startServer() {
    const serverPath = path.join(__dirname, 'server.js');
    serverProcess = spawn('node', [serverPath], {
        cwd: __dirname,
        stdio: 'inherit' // Pipe output to console
    });

    serverProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
    });
}

app.on('ready', () => {
    startServer();
    createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    // Kill server process when app quits
    if (serverProcess) {
        serverProcess.kill();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
