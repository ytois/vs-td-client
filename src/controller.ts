import * as vscode from 'vscode';
import * as events from 'events';
import View from './view';
import TdClient from './tdclient';
import * as fs from 'fs';
import * as path from 'path';
import * as moment from 'moment';

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

  get defaultPath(): string {
    const home =
      process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
    const rootPath = vscode.workspace.rootPath;
    const saveDir = rootPath || home || '';
    const time = moment().format('YYYYMMDDHHmmss');
    return path.join(saveDir, `query_result_${time}.csv`);
  }

  private registerCommand(command: string) {
    const self = this;
    this.extensionContext.subscriptions.push(
      vscode.commands.registerCommand(`extension.${command}`, () => {
        self.event.emit(command);
      })
    );
  }

  private excuteQuery(queryType: string, query: string): Promise<string> {
    this.view.showStatusMessage('query running...');

    // TODO: parse databsets name method
    return this.td.queryResult(queryType, 'sample_datasets', query, {});
  }

  private saveFile(path: string, data: string): void {
    fs.writeFile(path, data, (err: Error) => {
      // TODO: error proccess
    });
  }

  // ---- Commands ----
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

  private runQuery(queryType: string): void {
    const self = this;
    const query = this.view.currentEditorText;

    if (!query) {
      this.view.showInformationMessage('query is empty.');
      return;
    }

    this.excuteQuery(queryType, query).then((res: string) => {
      if (!res) {
        return;
      }
      self.view.createNewEditor(res, 'csv');
    });
  }

  private saveQueryResult(queryType: string): void {
    const self = this;
    const query = this.view.currentEditorText;

    if (!query) {
      this.view.showInformationMessage('query is empty.');
      return;
    }

    this.view
      .showInputBox(this.defaultPath)
      .then((savePath: string | undefined) => {
        if (!savePath) {
          this.view.showInformationMessage('save path is empty.');
        } else {
          fs.access(path.dirname(savePath), fs.constants.W_OK, err => {
            this.view.showInformationMessage(
              `${path.dirname(savePath)} is not writable.`
            );
          });
        }
        return savePath;
      })
      .then((savePath: string | undefined) => {
        if (!savePath) {
          return;
        }
        self.excuteQuery(queryType, query).then((res: string) => {
          self.saveFile(savePath, res);
        });
      });
  }
  // ----------------

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
