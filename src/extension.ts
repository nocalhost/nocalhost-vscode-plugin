// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import NocalhostAppProvider, { AppNode } from './appProvider';
import WorkLoadProvider, {WorkloadNode} from './workloadProvider';
import showLogin, { tryToLogin } from './commands/login';
// import {deployApp} from './commands/application';
import * as fileStore from './store/fileStore';
import application from './commands/application';
import { CURRENT_KUBECONFIG_FULLPATH, KUBE_CONFIG_DIR, NH_CONFIG_DIR } from './constants';
import * as nhctl from './ctl/nhctl';
import host from './host';
import { clearInterval } from 'timers';
import * as webPage from './webviews';

let _refreshWorkload: NodeJS.Timeout, _refreshApp: NodeJS.Timeout;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	await init();
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "nocalhost-vscode-plugin" is now active!');

	let appTreeProvider = new NocalhostAppProvider();
	let workLoadProvider = new WorkLoadProvider(host);
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	const namespace = process.env.namespace || 'plugin-01';
	const appName = process.env.appName || 'app';

	let subs = [
		// register welcome page
		vscode.commands.registerCommand('showWelcomePage', () =>  {
			webPage.showWelcome();
		}),
		vscode.commands.registerCommand('startDebug', (node: WorkloadNode) => {
			nhctl.debug(host,appName, node.label);
			vscode.window.showInformationMessage('startDebug: ' + JSON.stringify(node));
		}),
		vscode.commands.registerCommand('endDebug', (node: WorkloadNode) => {
			nhctl.endDebug(host, appName, node.label, namespace);
			vscode.window.showInformationMessage('endDebug');
		}),
		vscode.commands.registerCommand('showLogin', showLogin),
		
		vscode.commands.registerCommand('getApplicationList', () => appTreeProvider.refresh()),
		vscode.commands.registerCommand('refreshApplication', () => appTreeProvider.refresh()),
		vscode.commands.registerCommand('refreshWorkLoad', () => {
			workLoadProvider.refresh();
		}),
		vscode.commands.registerCommand('deployApp', async (appNode: AppNode) => {
			// TODO: if has deployed return
			const kubePath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
			await nhctl.install(host, `${appNode.info.url} ${appName} -n ${namespace}  --kubeconfig ${kubePath}`); // TODO: MODIFY APPNAME
			// vscode.commands.executeCommand('refreshWorkLoad');
			vscode.window.showInformationMessage('deploying app');
		}),
		vscode.commands.registerCommand('useApplication', (appNode: AppNode) => {
			application.useApplication(appNode);
			vscode.window.showInformationMessage('select app');
		}),
		vscode.window.registerTreeDataProvider('application', appTreeProvider),
		vscode.window.registerTreeDataProvider('workloads', workLoadProvider)
	];

	context.subscriptions.push(...subs);
	_refreshApp = host.timer('refreshApplication', []);
	_refreshWorkload = host.timer('refreshWorkLoad', []);
	vscode.commands.executeCommand('showWelcomePage');
}

// this method is called when your extension is deactivated
export function deactivate() {
	clearInterval(_refreshApp);
	clearInterval(_refreshWorkload);
}

async function init() {
	fileStore.mkdir(NH_CONFIG_DIR);
	fileStore.mkdir(KUBE_CONFIG_DIR);
	fileStore.initConfig();

	await tryToLogin().catch(() => {});
}
