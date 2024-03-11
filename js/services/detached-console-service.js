"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetachedConsoleService = void 0;
const child_process_1 = require("child_process");
/**
 * Class representing a  service that executes a command in a new terminal window.
 * @class
 */
class DetachedConsoleService {
    /**
     * Executes the given command in a new terminal window.
     *
     * @param {string} command - The command to execute.
     * @returns {Promise<number>} The exit code of the executed command.
     * @throws Will reject the promise if an error occurs while executing the command.
     * @async
     */
    async executeCommand(command) {
        return new Promise((resolve, reject) => {
            // Split the command and arguments for spawn
            const [cmd, ...args] = command.split(' ');
            // Determine the platform and execute the command accordingly
            if (process.platform === "win32") {
                this.process = (0, child_process_1.spawn)(`cmd.exe`, ['/c', cmd, ...args], { detached: true, shell: true });
            }
            else if (process.platform === "darwin") {
                const appleScript = `tell application "Terminal" 
                                        do script "${cmd} ${args.join(' ')}"
                                        activate                                         
                                     end tell
                                     `;
                this.process = (0, child_process_1.spawn)('osascript', ['-e', appleScript]);
            }
            else {
                this.process = (0, child_process_1.spawn)(`gnome-terminal`, ['--', cmd, ...args], { detached: true, shell: true });
            }
            // Listen for the close event to get the exit code
            this.process.on('close', (code) => {
                resolve(code);
            });
            // Handle errors
            this.process.on('error', (err) => {
                reject(err);
            });
        });
    }
    /**
     * Cancels the execution of the command by terminating the child process.
     */
    cancel() {
        if (this.process && this.process.pid) {
            if (process.platform === "win32") {
                // Attempt to use a Windows Command Prompt command to forcefully kill the process.
                (0, child_process_1.spawn)("cmd.exe", ["/c", "taskkill", "/F", "/PID", this.process.pid.toString()], { shell: true });
            }
            else {
                // For Unix-like systems.
                this.process.kill(-this.process.pid);
            }
        }
    }
}
exports.DetachedConsoleService = DetachedConsoleService;
//# sourceMappingURL=detached-console-service.js.map