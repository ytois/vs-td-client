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

  showInformationMessage(message: string): void {
    vscode.window.showInformationMessage(message);
  }

  showStatusMessage(message: string): void {
    vscode.window.setStatusBarMessage(message);
  }

  showInputBox(value: string): Thenable<string | undefined> {
    return vscode.window.showInputBox({ value: value });
  }

  get currentEditorText(): string | undefined {
    const editor: vscode.TextEditor | undefined =
      vscode.window.activeTextEditor;
    if (editor) {
      return editor.document.getText();
    }
  }

  createNewEditor(text: string, language: string): void {
    vscode.workspace
      .openTextDocument({ content: text, language: language })
      .then(document => {
        vscode.window.showTextDocument(document);
      });
  }
}
