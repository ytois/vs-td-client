import * as vscode from 'vscode';
import * as events from 'events';
import View from './view';
import TdClient from './tdclient';
import * as fs from 'fs';
import * as path from 'path';
import * as moment from 'moment';
import { setFlagsFromString } from 'v8';

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

  private excuteQuery(queryType: string): Promise<string> | undefined {
    const query: string | undefined = this.getQueryText();
    if (!query) {
      return;
    }

    this.view.showStatusMessage('query running...');
    return this.td.queryResult(queryType, 'sample_datasets', query, {});
  }

  private saveFile(path: string, data: string): void {
    fs.writeFile(path, data, (err: Error) => {});
  }

  private runQuery(queryType: string): void {
    const self = this;
    this.excuteQuery(queryType).then((res: string) => {
      self.view.createNewEditor(res, 'csv');
    });
  }

  private saveQueryResult(queryType: string): void {
    const self = this;
    const defaultPath = this.defaultPath();

    // TODO: cancel process
    this.view.showInputBox(defaultPath).then((path: string) => {
      self.excuteQuery(queryType).then((res: string) => {
        self.saveFile(path, res);
      });
    });
  }

  private defaultPath(): string {
    const home =
      process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
    const rootPath = vscode.workspace.rootPath;
    const saveDir = rootPath || home || '';
    const time = moment().format('YYYYMMDDHHmmss');
    return path.join(saveDir, `query_result_${time}.csv`);
  }

  activate() {
    const self = this;

    self.registerCommand('selectTable');
    self.event.on('selectTable', () => self.selectTable());

    self.registerCommand('runHiveQuery');
    self.event.on('runHiveQuery', () => self.runQuery('hive'));
    self.registerCommand('runPrestoQuery');
    self.event.on('runPrestoQuery', () => self.runQuery('presto'));

    self.registerCommand('saveHiveQueryResult');
    self.event.on('saveHiveQueryResult', () => self.saveQueryResult('hive'));
    self.registerCommand('savePrestoQueryResult');
    self.event.on('savePrestoQueryResult', () =>
      self.saveQueryResult('presto')
    );
  }

  deactivate() {}

  dispose() {
    this.deactivate();
    this.view.dispose();
  }
}
