import * as vscode from 'vscode';
import * as TD from 'td';
import delay from 'delay';

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

  excuteQuery(
    queryType: string,
    database: string,
    query: string,
    option: object
  ): Promise<Job> {
    const self = this;
    const method =
      queryType === 'presto' ? self.client.prestoQuery : self.client.hiveQuery;
    return new Promise((resolve, reject) => {
      // TODO: methodに代入して呼び出すとエラー
      return self.client.hiveQuery(
        database,
        query,
        option,
        (err: any, res: Job) => {
          if (err) {
            reject(err);
          }
          resolve(res);
        }
      );
    });
  }

  hiveQuery() {
    return this.client.hiveQuery;
  }

  prestoQuery() {
    return this.client.prestoQuery;
  }

  showJob(jobId: string | number): Promise<JobDetail> {
    const self = this;
    return new Promise((resolve, reject) => {
      return self.client.showJob(jobId, (err: any, res: JobDetail) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });
  }

  jobResult(jobId: string | number, format: string = 'csv'): Promise<string> {
    const self = this;
    return new Promise((resolve, reject) => {
      return self.client.jobResult(jobId, format, (err: any, res: string) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });
  }

  async queryResult(
    queryType: string,
    database: string,
    query: string,
    option: object,
    format: string = 'csv'
  ) {
    let job = await this.excuteQuery(queryType, database, query, option).catch(
      (err: any) => {
        console.log(err);
        return false;
      }
    );

    while (true) {
      const detail = await this.showJob(job.job_id);

      if (detail.status === 'success') {
        break;
      } else if (detail.status === 'error') {
        throw new Error(detail.debug.stderr);
      }

      await delay(1000);
    }
    return this.jobResult(job.job_id, format);
  }
}
