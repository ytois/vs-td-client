import * as vscode from 'vscode';
import * as events from 'events';
import View from './view';
import TdClient from './tdclient';

export default class Controller {
  private extensionContext: vscode.ExtensionContext;
  private event: events.EventEmitter = new events.EventEmitter();
  private view: View;
  private td: TdClient;

  constructor(context: vscode.ExtensionContext, view: View) {
    this.extensionContext = context;
    this.view = view;
    this.td = new TdClient();
  }

  private registerCommand(command: string) {
    const self = this;
    this.extensionContext.subscriptions.push(
      vscode.commands.registerCommand(`extension.${command}`, () => {
        self.event.emit(command);
      })
    );
  }

  private selectTable(): void {
    this.td
      .listDatabases()
      .then((databases: any) => {
        return databases.map((db: any) => {
          return {
            label: db.name
          };
        });
      })
      .then((labels: any) => {
        return this.view.showQuickPick(labels, {});
      })
      .then((select: any) => {
        return this.td.listTables(select.label);
      })
      .then((tables: any) => {
        return tables.map((table: any) => {
          return {
            label: table.name,
            description: `Count: ${table.count} Created: ${
              table.created_at
            } LastLog: ${table.last_log_timestamp}`
          };
        });
      })
      .then((labels: any) => {
        return this.view.showQuickPick(labels, {});
      })
      .then((select: any) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        editor.insertSnippet(new vscode.SnippetString(select.label));
      });
  }

  private getQueryText(): string | undefined {
    let query = this.view.currentEditorText();
    return query;
  }

  private excuteQuery(queryType: string): void {
    const self = this;
    const query: string | undefined = this.getQueryText();
    if (!query) {
      return;
    }

    this.view.showStatusMessage('query running...');
    this.td
      .queryResult(queryType, 'sample_datasets', query, {})
      .then((res: string) => {
        self.view.createNewEditor(res, 'csv');
      });
  }

  activate() {
    const self = this;
    self.registerCommand('selectTable');
    self.event.on('selectTable', () => self.selectTable());
    self.registerCommand('runHiveQuery');
    self.event.on('runHiveQuery', () => self.excuteQuery('hive'));
    self.registerCommand('runPrestoQuery');
    self.event.on('runPrestoQuery', () => self.excuteQuery('presto'));
  }

  deactivate() {}

  dispose() {
    this.deactivate();
    this.view.dispose();
  }
}
