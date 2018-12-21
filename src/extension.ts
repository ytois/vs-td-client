'use strict';

import * as vscode from 'vscode';
import Controller from './controller';
import View from './view';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "vs-td-client" is now active!');

  const view = new View();
  const controller = new Controller(context, view);
  context.subscriptions.push(controller);
  controller.activate();
}

export function deactivate() {}
