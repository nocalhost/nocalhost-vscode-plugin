import * as vscode from 'vscode';
import i18n from './i18nUtil';
import zhCN from './zh-CN.json';
import en from './en.json';
export async function initI18n() {
    const language = vscode.env.language.toLocaleLowerCase().includes('zh') ? 'zhCN' : 'en';
    await i18n.init({
        en,
        zhCN
    }, language);
}