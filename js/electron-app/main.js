"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const common_1 = require("../common");
const models_1 = require("../models");
const services_1 = require("../services");
const utils_1 = require("../utils");
const configurations_1 = require("../configurations");
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const childProcess = __importStar(require("child_process"));
const remoteMain = require('@electron/remote/main');
const platformFolders = require('platform-folders');
// Application methods -------------------------------------------------
/** Sets up the application. */
function setupApplication() {
    // Initialize the remote module
    remoteMain.initialize();
    electron_1.app.commandLine.appendSwitch('enable-experimental-web-platform-features');
    // Setup variables
    //VARIABLES.APP_BASE_PATH = app.isPackaged ? app.getAppPath() : '.';
    // Load the app data from the config file
    global.appGlobal = new models_1.AppGlobalData({
        isDebug: /--inspect/.test(process.argv.join(' ')),
        isPackaged: electron_1.app.isPackaged,
        appBasePath: electron_1.app.isPackaged ? electron_1.app.getAppPath() : common_1.CONSTANTS.APP_BASE_PATH,
        dialog: electron_1.dialog,
        githubRepoInfo: {},
        BrowserWindow: electron_1.BrowserWindow,
        screen: electron_1.screen,
        windowService: services_1.WindowService.instance,
        remoteMain: remoteMain,
        isWindows: process.platform === 'win32',
    });
    global.appGlobal.packageJson = require(utils_1.AppUtils.getAppPath(common_1.AppPathType.appPath, 'package.json'));
    // Add information from the runtime configuration file
    const appConfigJson = { ...global.appGlobal.packageJson.appConfig };
    Object.assign(global.appGlobal.packageJson.appConfig, configurations_1.AppConfig);
    // Create app-config.json in documents folder if not exists
    createAppConfigJsonFile(appConfigJson);
    // Populate the global data  
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    global.appGlobal.packageJson.appConfig.copyrightsDisplayText = (lang) => {
        // return TranslationService.translate({ key: 'DEVELOPED_BY', lang }) + ': ' + global.appGlobal.packageJson.author
        //   + ' | ' + global.appGlobal.packageJson.appConfig.copyrights.replace('[DATE]', new Date().getFullYear().toString());
        return global.appGlobal.packageJson.appConfig.copyrights.replace('[DATE]', new Date().getFullYear().toString());
    };
    // Setup unhandled errors handling
    process.on('uncaughtException', (error) => {
        services_1.LogService.unhandledExeption(error);
    });
}
/**
 * Creates the app-config.json file in the documents folder if it does not exist.
 */
function createAppConfigJsonFile(appConfigJson) {
    const appConfigJsonPath = path.join(platformFolders.getDocumentsFolder(), global.appGlobal.packageJson.name, common_1.CONSTANTS.APP_CONFIG_JSON_FULL_PATH);
    fs.ensureDirSync(path.dirname(appConfigJsonPath));
    if (!fs.existsSync(appConfigJsonPath)) {
        fs.writeJsonSync(appConfigJsonPath, appConfigJson, { spaces: 2 });
    }
    Object.assign(global.appGlobal.packageJson.appConfig, fs.readJsonSync(appConfigJsonPath));
}
/** Creates the main window. */
function createMainWindow() {
    // Create the browser window.
    services_1.LogService.info("Creating main window...");
    const mainWindow = new electron_1.BrowserWindow({
        height: 600,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            //                           We don't care about security because we don't load external pages in the renderer process.
            sandbox: false,
            preload: utils_1.AppUtils.getAppPath(common_1.AppPathType.scriptPath, 'electron-app/preload.js'),
        },
        show: false,
        icon: utils_1.AppUtils.getAppPath(common_1.AppPathType.imagesPath, "favicon.png"),
    });
    // Enable the remote module for the main window
    remoteMain.enable(mainWindow.webContents);
    // Set the main window
    global.appGlobal.mainWindow = mainWindow;
    // Set the title
    mainWindow.setTitle(`${global.appGlobal.packageJson.description} v${global.appGlobal.packageJson.version}`);
    // Set the display
    global.appGlobal.display = electron_1.screen.getPrimaryDisplay();
    // Create the splash window
    services_1.LogService.info("Creating splash window...");
    const windowService = global.appGlobal.windowService;
    const splashWindow = windowService.show({
        htmlFile: "splash.html",
        windowParameters: {
            transparent: true
        },
        autoSize: common_1.CONSTANTS.WINDOW_DEFAULT_SIZE,
    });
    // Set the splash window
    global.appGlobal.splashWindow = splashWindow.window;
    // Load the index.html of the app.
    services_1.LogService.info("Loading main window...");
    //mainWindow.loadFile(path.join(__dirname, "../../index.html"));
    mainWindow.loadFile(utils_1.AppUtils.getAppPath(common_1.AppPathType.appPath, "index.html"));
    // Show the main window when it's ready to be shown
    services_1.LogService.info("Showing main window...");
    mainWindow.once('ready-to-show', function mainWindowReadyToShow() {
        // Show the main window after the splash delay
        setTimeout(function mainWindowShown() {
            // Hide the splash window and show the main window
            windowService.hide(splashWindow.id);
            mainWindow.show();
            // Maximize the main window
            mainWindow.maximize();
            services_1.LogService.info("Main window shown.");
            // Open the DevTools in debug mode
            if (global.appGlobal.isDebug) {
                mainWindow.webContents.openDevTools();
            }
            else {
                // Remove the menu in production mode
                mainWindow.removeMenu();
            }
        }, common_1.CONSTANTS.SPLASH_DELAY);
    });
    // Emitted when the window is closed.
    // Dereference the window object and destroy it
    mainWindow.on('close', function onMainWindowClose(e) {
        services_1.LogService.info("Main window closed.");
        if (services_1.DialogService.showPromptDialog({
            titleKey: 'DIALOG.QUIT_APP.TITLE',
            messageKey: 'DIALOG.QUIT_APP.PROMPT',
            dialogType: common_1.DialogType.warning,
        })) {
            electron_1.webContents.getAllWebContents().forEach(webContent => {
                webContent.close();
            });
            mainWindow.getChildWindows().forEach(childWindow => {
                childWindow.destroy();
            });
            mainWindow.destroy();
        }
        e.preventDefault();
    });
}
/** * Runs the application this is the main entry point of the application. */
function runApplication() {
    services_1.LogService.info("#\n\n\n\n\n----------------------------------------");
    services_1.LogService.info("Application started.");
    services_1.LogService.info(JSON.stringify(utils_1.OsUtils.getOSDetails()));
    electron_1.app.whenReady().then(function appWhenReady() {
        // Create the main window
        createMainWindow();
        // Called when the application is activated
        electron_1.app.on("activate", function appActivate() {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (electron_1.BrowserWindow.getAllWindows().length === 0)
                createMainWindow();
        });
    }).catch(ex => {
        services_1.LogService.unhandledExeption(ex);
    });
    electron_1.app.on("window-all-closed", function winAllClosed() {
        services_1.LogService.info("All windows closed.");
        // On macOS it is common for applications to stay open until the user explicitly quits.
        // We don't want that in our application.
        // So we quit the application when all windows are closed.
        electron_1.app.quit();
    });
}
/**
* Handle Squirrel events for Windows immediately on start
*/
const handleSquirrelEvent = (app) => {
    if (os.platform() != 'win32') {
        return false;
    }
    if (process.argv.length == 1) {
        return false;
    }
    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.join(rootAtomFolder, 'Update.exe');
    const exeName = path.basename(process.execPath);
    const spawn = function (command, args) {
        let spawnedProcess;
        try {
            spawnedProcess = childProcess.spawn(command, args, { detached: true });
        }
        catch (error) { }
        return spawnedProcess;
    };
    const spawnUpdate = function (args) {
        return spawn(updateDotExe, args);
    };
    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            spawnUpdate(['--createShortcut', exeName]);
            setTimeout(app.quit, 1000);
            return true;
        case '--squirrel-uninstall':
            spawnUpdate(['--removeShortcut', exeName]);
            setTimeout(app.quit, 1000);
            return true;
        case '--squirrel-obsolete':
            app.quit();
            return true;
    }
    return false;
};
if (!handleSquirrelEvent(electron_1.app)) {
    // Set up the application -----------------------------------------------
    setupApplication();
    // Run the application -------------------------------------------------
    runApplication();
}
//# sourceMappingURL=main.js.map