# nocalhost-vscode-plugin

Nocalhost is Cloud Native Development Environment. This is a vscode plugin for nocalhost to help connect IDE and Kubernetes smoothly.

## Features

- Login to nocalhost API Server and list the applications to coding
- Install and Uninstall applications to Kubernetes
- Start Developing micro serivce
    - Auto checkout codes from Git Repo
    - Auto Port-forward
    - Auto Sync code files to dev-container

## Requirements

You need do these before using this plugin:

- Install and configure kubectl
- Install helm(If you use helm)
- Install nhctl
- Obtain a user account on Nocalhost-web from Administors.

## Package and Publishing

We use [vsce](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) to package the extension.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Known Issues

## Release Notes


### For more information

* [Nocalhost Homepage](https://nocalhost.dev)
* [GitHub](https://github.com/nocalhost/nocalhost-vscode-plugin)

**Enjoy!**
