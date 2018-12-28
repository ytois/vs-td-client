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

  showErrorMessage(message: string): void {
    vscode.window.showErrorMessage(message);
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

  createWebView(
    viewType: string,
    title: string,
    html: string | undefined
  ): vscode.WebviewPanel {
    let panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      vscode.ViewColumn.One,
      {}
    );
    if (html) {
      panel.webview.html = html;
    }
    return panel;
  }
}
