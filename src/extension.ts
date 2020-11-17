// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import NocalhostAppProvider from './appProvider';
import showLogin, { tryToLogin } from './commands/login';
import * as fileStore from './store/fileStore';
import application from './commands/application';
import { CURRENT_KUBECONFIG_FULLPATH, KUBE_CONFIG_DIR, NH_CONFIG_DIR } from './constants';
import * as nhctl from './ctl/nhctl';
import host from './host';
import { clearInterval } from 'timers';
import * as webPage from './webviews';
import { AppNode, KubernetesResourceNode } from './nodes/nodeType';

let _refreshApp: NodeJS.Timeout;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	await init();
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "nocalhost-vscode-plugin" is now active!');

	let appTreeProvider = new NocalhostAppProvider();
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	const namespace = process.env.namespace || 'plugin-02';
	const appName = process.env.appName || 'app';

	let subs = [
		// register welcome page
		vscode.commands.registerCommand('showWelcomePage', () =>  {
			webPage.showWelcome();
		}),
		vscode.commands.registerCommand('startDebug', async (node: KubernetesResourceNode) => {
			
			vscode.window.showInformationMessage('starting debug');
			await nhctl.debug(host, appName, node.name);
			vscode.window.showInformationMessage('started debug');
		}),
		vscode.commands.registerCommand('endDebug', async (node: KubernetesResourceNode) => {
			vscode.window.showInformationMessage('ending debug');
			await nhctl.endDebug(host, appName, node.name, namespace);
			vscode.window.showInformationMessage('ended debug');
		}),
		vscode.commands.registerCommand('showLogin', showLogin),
		
		vscode.commands.registerCommand('getApplicationList', () => appTreeProvider.refresh()),
		vscode.commands.registerCommand('refreshApplication', () => appTreeProvider.refresh()),
		vscode.commands.registerCommand('deployApp', async (appNode: KubernetesResourceNode) => {
			const kubePath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
			await nhctl.install(host, `${appNode.info.url} ${appName} -n ${namespace}  --kubeconfig ${kubePath}`); // TODO: MODIFY APPNAME
			vscode.window.showInformationMessage('deploying app');
		}),
		vscode.commands.registerCommand('useApplication', (appNode: AppNode) => {
			application.useApplication(appNode);
			vscode.window.showInformationMessage('select app');
		}),
		vscode.window.registerTreeDataProvider('Nocalhost', appTreeProvider),
	];

	context.subscriptions.push(...subs);
	_refreshApp = host.timer('refreshApplication', []);
	vscode.commands.executeCommand('showWelcomePage');
}

// this method is called when your extension is deactivated
export function deactivate() {
	clearInterval(_refreshApp);
}

async function init() {
	fileStore.mkdir(NH_CONFIG_DIR);
	fileStore.mkdir(KUBE_CONFIG_DIR);
	fileStore.initConfig();

	await tryToLogin().catch(() => {});
}
