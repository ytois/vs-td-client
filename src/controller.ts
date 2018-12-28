import * as vscode from 'vscode';
import * as events from 'events';
import View from './view';
import TdClient from './tdclient';
import * as fs from 'fs';
import * as path from 'path';
import * as moment from 'moment';
import { CommandCancel } from './errors';
import { jobDetailTemplate } from './template';

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
      throw new Error('dataset is not selected');
    }

    return this.td.queryResult(queryType, this.dataset, query, {});
  }

  private saveFile(path: string, data: string): void {
    fs.writeFile(path, data, (err: Error) => {
      if (err) {
        throw err;
      } else {
        this.view.showInformationMessage(`done. ${path}`);
      }
    });
  }

  private isWritable(pathName: string | undefined): (boolean | Error)[] {
    if (!pathName) {
      return [false, new Error('path is empty.')];
    } else {
      fs.access(path.dirname(pathName), fs.constants.W_OK, err => {
        if (err) {
          return [false, new Error(`${pathName} is not writable.`)];
        }
      });
    }
    return [true];
  }

  private formatDatasetLabels(datasets: any[]): QuickPickLabels[] {
    const self = this;
    return datasets.map((dataset: any) => {
      return {
        label: dataset.name,
        description: dataset.name === self.dataset ? '[Current]' : null
      };
    });
  }

  private formatTableLabels(tables: any[]): QuickPickLabels[] {
    return tables.map((table: any) => {
      return {
        label: table.name,
        description: `Count: ${table.count} Created: ${
          table.created_at
        } LastLog: ${table.last_log_timestamp}`,
        database: table.database,
        raw: table
      };
    });
  }

  private showDatabases(): Promise<any | undefined> {
    const self = this;
    return this.td
      .listDatabases()
      .then(datasets => self.formatDatasetLabels(datasets))
      .then((labels: QuickPickLabels[]) => {
        if (!labels) {
          return;
        }
        return self.view.showQuickPick(labels, {});
      });
  }

  private showTables(): Promise<any | undefined> {
    const self = this;
    return this.showDatabases()
      .then((select: any) => {
        return self.td.listTables(select.label);
      })
      .then(tables => self.formatTableLabels(tables))
      .then((labels: QuickPickLabels[]) => {
        return self.view.showQuickPick(labels, {});
      });
  }

  // ---- Commands ----
  private selectDataset(): Promise<string> {
    const self = this;
    return this.showDatabases().then((select: any) => {
      self.dataset = select.label;
      return select.label;
    });
  }

  private selectTable(): void {
    const self = this;
    this.showTables()
      .then((select: any) => {
        const labels = [
          // TODO: format text
          { label: 'Show Schema', table: JSON.stringify(select.raw) },
          { label: 'Insert Table Name', table: select.label },
          {
            label: 'Insert Table Name & Select Database',
            table: select.label,
            database: select.database
          }
        ];
        return this.view.showQuickPick(labels, {});
      })
      .then((select: any) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !select) {
          return;
        }
        if (select.database) {
          self.dataset = select.database;
        }
        editor.insertSnippet(new vscode.SnippetString(select.table));
      })
      .catch(error => {
        switch (error) {
          case CommandCancel:
            self.view.showInformationMessage('command canceled');
          default:
            self.view.showErrorMessage(error.message);
        }
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
        const [_, err] = self.isWritable(savePath);
        if (err) {
          throw err;
        }
        self.excuteQuery(queryType, query).then((res: string) => {
          self.saveFile(savePath, res);
        });
      });
  }

  private showJobs(): void {
    const self = this;
    this.td
      .listJobs()
      .then((jobs: any) => {
        return jobs.map((job: any) => {
          return {
            label: job.job_id,
            description: `[${job.status}] ${job.start_at} ${job.query}`
          };
        });
      })
      .then((labels: QuickPickLabels[]) => {
        return self.view.showQuickPick(labels, {});
      })
      .then((select: any) => {
        self.td.showJob(select.label).then((res: any) => {
          // TODO: 仮
          const html = jobDetailTemplate(res);
          self.view.createWebView('jobDetail', 'Job Detail', html);
        });
      });
  }

  // TODO
  private killJob(): void {}
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

    self.registerCommand('showJobs');
    self.event.on('showJobs', () => self.showJobs());
  }

  deactivate() {}

  dispose() {
    this.deactivate();
    this.view.dispose();
  }
}
