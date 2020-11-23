// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import NocalhostAppProvider from './appProvider';
import showLogin, { tryToLogin } from './commands/login';
import * as fileStore from './store/fileStore';
import application from './commands/application';
import { EMAIL, KUBE_CONFIG_DIR, NH_CONFIG_DIR, PASSWORD, SELECTED_APP_ID } from './constants';
import host from './host';
import { clearInterval } from 'timers';
import * as webPage from './webviews';
import { AppNode, KubernetesResourceNode } from './nodes/nodeType';
import nocalhostService from './service/nocalhostService';
import NocalhostTextDocumentProvider from './textDocumentProvider';
import * as shell from 'shelljs';
import state from './state';

let _refreshApp: NodeJS.Timeout;
export async function activate(context: vscode.ExtensionContext) {

	await init();

	let appTreeProvider = new NocalhostAppProvider();

	let nocalhostTextDocumentProvider = new NocalhostTextDocumentProvider();

	let subs = [
		registerCommand('showWelcomePage', false, () =>  {
			webPage.showWelcome();
		}),

		registerCommand('Nocalhost.entryDevSpace', true, async (node: KubernetesResourceNode) => {
			if (!node) {
				return;
			}
			// get app name
			const appId = fileStore.get(SELECTED_APP_ID);
			if (!appId) {
				throw new Error('you must select one app');
			}
			await nocalhostService.entryDevSpace(host, appId, node.resourceType, node.name);
		}),
		registerCommand('Nocalhost.exitDevSpace', true, async (node: KubernetesResourceNode) => {
			// get app name
			const appId = fileStore.get(SELECTED_APP_ID);
			await nocalhostService.exitDevSpace(host, appId , node.name);
		}),
		registerCommand('showLogin', false, showLogin),

		registerCommand('Nocalhost.signout', false, () => {
			fileStore.remove(EMAIL);
			fileStore.remove(PASSWORD);
			state.setLogin(false);
			appTreeProvider.refresh();
		}),
		
		registerCommand('getApplicationList', false, () => appTreeProvider.refresh()),
		registerCommand('refreshApplication', false, () => appTreeProvider.refresh()),
		registerCommand('Nocahost.installApp', true, async (appNode: AppNode) => {
			await nocalhostService.install(host, appNode.id, appNode.devSpaceId, appNode.info.url);
		}),
		registerCommand('Nocahost.uninstallApp',true, async (appNode: AppNode) => {
			await nocalhostService.uninstall(host, appNode.id, appNode.devSpaceId);
		}),
		registerCommand('useApplication',true, async (appNode: AppNode) => {
			application.useApplication(appNode);
		}),
		vscode.window.registerTreeDataProvider('Nocalhost', appTreeProvider),
		vscode.workspace.registerTextDocumentContentProvider('Nocalhost', nocalhostTextDocumentProvider),
		registerCommand('Nocalhost.loadResource', false, async (node: KubernetesResourceNode | AppNode) => {
			if (node instanceof KubernetesResourceNode) {
				const kind = node.resourceType;
				const name = node.name;
				const uri = vscode.Uri.parse(`Nocalhost://k8s/loadResource/${kind}/${name}.yaml`);
				let doc = await vscode.workspace.openTextDocument(uri);
				await vscode.window.showTextDocument(doc, { preview: false });
			} else if (node instanceof AppNode) {
				const name = node.id;
				const uri = vscode.Uri.parse(`Nocalhost://nh/${name}.yaml`);
				let doc = await vscode.workspace.openTextDocument(uri);
				await vscode.window.showTextDocument(doc, { preview: false });
			}
		}),
		registerCommand('Nocalhost.log', false, async (node: KubernetesResourceNode) => {
			const kind = node.resourceType;
			const name = node.name;
			const appId = fileStore.get(SELECTED_APP_ID);
			await nocalhostService.log(host, appId, kind, name);
		}),
		registerCommand('Nocalhost.portForward', false, async (node: KubernetesResourceNode) => {
			const kind = node.resourceType;
			const name = node.name;
			await nocalhostService.portForward(host, kind, name);
		}),
		registerCommand('Nocalhost.exec', true, async (node: KubernetesResourceNode) => {
			const appId = fileStore.get(SELECTED_APP_ID);
			await nocalhostService.exec(host, appId , node.resourceType, node.name);
		})
	];

	context.subscriptions.push(...subs);
	_refreshApp = host.timer('refreshApplication', []);
	vscode.commands.executeCommand('showWelcomePage');
}

function registerCommand(command: string, isLock: boolean, callback: any) {
	const dispose = vscode.commands.registerCommand(command, async (...args: any[]) => {
		if (isLock) {
			if (state.isRunning()) {
				host.showWarnMessage('A task is running, please try again later');
				return;
			}
			state.setRunning(true);
			Promise.resolve(callback(...args)).finally(() => {
				state.setRunning(false);
			});
		} else {
			callback(...args);
		}
	});

	return dispose;
}

export function deactivate() {
	clearInterval(_refreshApp);
}

export function checkCtl(name: string) {
	const res = shell.which(name);
  if (res && res.code === 0) {
    return true;
	}
	throw new Error(`not found ${name}`);
}

async function init() {
	checkCtl('nhctl');
	checkCtl('kubectl');
	checkCtl('git');
	checkCtl('mutagen');
	fileStore.mkdir(NH_CONFIG_DIR);
	fileStore.mkdir(KUBE_CONFIG_DIR);
	fileStore.initConfig();

	await tryToLogin().catch(() => {});
}
