import * as vscode from 'vscode';
import * as TD from 'td';

export default class TdClient {
  private client: any;

  constructor() {
    const config = vscode.workspace.getConfiguration('td');
    this.client = new TD(config.get('TREASURE_DATA_API_KEY'));
  }

  listDatabases(): Promise<any> {
    return new Promise((resolve, reject) => {
      return this.client.listDatabases((err: any, res: any) => {
        if (err) {
          reject(err);
        }
        resolve(res.databases);
      });
    });
  }

  listTables(dbName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      return this.client.listTables(dbName, (err: any, res: any) => {
        if (err) {
          reject(err);
        }
        resolve(res.tables);
      });
    });
  }

  hiveQuery(query: string, callback: any) {
    return this.client.hiveQuery(query, callback);
  }

  showJob(jobId: number, callback: any) {
    return this.client.showJob(jobId, callback);
  }

  jobResult(jobId: number, callback: any) {
    return this.client.jobResult(jobId, callback);
  }
}
