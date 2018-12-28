export class CommandCancel extends Error {
  constructor() {
    super();
    this.name = 'CommandCancel';
    this.message = 'command canceled.';
  }
}
