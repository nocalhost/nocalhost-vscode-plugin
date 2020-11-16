import * as vscode from 'vscode';
import { login } from '../api';
import * as fileStore from '../store/fileStore';
import { EMAIL, PASSWORD } from '../constants';
import state from '../state';

export default function showLogin() {
  vscode.window.showInputBox({placeHolder: 'please input your email'}).then((email) => {
    if (!email) {
      return;
    }
    vscode.window.showInputBox({placeHolder: 'please input password'}).then((password) => {
      if (!password) {
        return;
      }
      login({email, password}).then((result) => {
        if (result) {
          fileStore.set(EMAIL, email);
          fileStore.set(PASSWORD, password);
          state.setLogin(true);
          vscode.window.showInformationMessage('login successful');
        }
      }).catch((err) => {
        vscode.window.showWarningMessage(err.message);
      }).finally(() => {
        vscode.commands.executeCommand("getApplicationList");
      });
    });
  });
}

export async function tryToLogin() {
	const email = fileStore.get(EMAIL);
	const password = fileStore.get(PASSWORD);
	if (email && password) {
    let flag = true;
		await login({email, password}).catch((err) => {
      fileStore.remove(EMAIL);
      fileStore.remove(PASSWORD);
      flag = false;
      throw err;
    }).finally(() => {
      state.setLogin(flag);
    });
  }
}

// login success --> get app --> set kubeConfig
// 

export function checkLogin() {

}