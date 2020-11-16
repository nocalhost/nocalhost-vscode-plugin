# vscode 插件开发
- command
- treeView
- fsSystemProvider
## treeView
1. 填写 package.json 的 contributes.views
```json
{
  "contributes": {
    "views": [
      {
        "id": "application",
        "name": "application"
      },
      {
        "id": "service",
        "name": "service"
      }
    ]
  }
}
```
2. 创建一个 treeView
有两种方式
- 通过 `createTreeView` 来提供一个 dataProvider
```ts
vscode.window.createTreeView('nodeDependencies', {
  treeDataProvider: new NodeDependenciesProvider(vscode.workspace.rootPath)
});
```
- 通过 `registerTreeDataProvider` 直接注册一个 dataProvider
```ts
vscode.window.registerTreeDataProvider(
  'nodeDependencies',
  new NodeDependenciesProvider(vscode.workspace.rootPath)
);
```
## 问题
1. 如何给 treeItem 添加自定义 icon finish
2. treeItem 状态 icon finish
```json
"contributes": {
  "menus": {
    "view/item/context": [
      {
        "command": "nodeDependencies.deleteEntry",
        "when": "view == nodeDependencies && viewItem == dependency"
      }
    ]
  }
}

// 注意：viewItem 的值 为 treeItem 的 treeItem.
```
3. 保存 kubeConfig 在本地 finish
4. 保存信息到本地 finish
写在文件 ~/.nh/config.json finish
~/.nh/kube/存储多份kubeConfig（命名：登录的用户名）
5. 保持子进程
6. 输出 k8s 的资源内容 load resource yaml
## TODO
1. store information finished
2. deploy app
3. load kubernetes workloads
4. debug workloads
5. selected app finished 

```pre

```