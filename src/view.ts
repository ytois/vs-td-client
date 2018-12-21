import * as vscode from 'vscode';

export default class View {
  constructor() {}
  activate() {}
  dispose() {}

  showQuickPick(labels: Array<any>, options: any) {
    return vscode.window.showQuickPick(labels, options);
  }
}
