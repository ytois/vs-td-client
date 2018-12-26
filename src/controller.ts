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
  private dataset: string | null;

  constructor(context: vscode.ExtensionContext, view: View) {
    this.extensionContext = context;
    this.view = view;
    this.td = new TdClient();
    this.dataset = null;
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

    if (!this.dataset) {
      this.view.showInformationMessage('dataset is not selected.');
      throw Error('dataset is not selected');
    }

    return this.td.queryResult(queryType, this.dataset, query, {});
  }

  private saveFile(path: string, data: string): void {
    fs.writeFile(path, data, (err: Error) => {
      // TODO: error proccess
      if (!err) {
        this.view.showInformationMessage(`done. ${path}`);
      }
    });
  }

  // ---- Commands ----
  private selectDataset(): Promise<string> {
    const self = this;
    return this.td
      .listDatabases()
      .then((datasets: any) => {
        return datasets.map((db: any) => {
          return {
            label: db.name,
            description: self.dataset === db.name ? '[Current]' : null
          };
        });
      })
      .then((labels: any) => {
        return self.view.showQuickPick(labels, {});
      })
      .then((select: any) => {
        self.dataset = select.label;
        return select.label;
      });
  }

  private selectTable(): void {
    this.selectDataset()
      .then((datasetName: string) => {
        return this.td.listTables(datasetName);
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

  // TODO: show schema
  private showTableSchema() {
    return;
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
          return;
        } else {
          fs.access(path.dirname(savePath), fs.constants.W_OK, err => {
            if (err) {
              this.view.showInformationMessage(
                `${path.dirname(savePath)} is not writable.`
              );
              return;
            }
          });
          return savePath;
        }
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

    self.registerCommand('selectDataset');
    self.event.on('selectDataset', () => self.selectDataset());

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
