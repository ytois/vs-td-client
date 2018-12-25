import * as vscode from 'vscode';

export default class View {
  constructor() {}
  activate() {}
  dispose() {}

  showQuickPick(
    labels: Array<any>,
    options: any
  ): Thenable<string[] | undefined> {
    return vscode.window.showQuickPick(labels, options);
  }

  currentEditorText(): string | undefined {
    const editor: vscode.TextEditor | undefined =
      vscode.window.activeTextEditor;
    if (editor) {
      return editor.document.getText();
    }
  }
}
