declare module 'td';
declare module 'delay';

interface TdDatabase {
  name: string;
  created_at: string;
  updated_at: string;
  count: number;
  permission: string;
  delete_protected: boolean;
  organization: any | null;
}

interface TdTable {
  id: number;
  name: string;
  estimated_storage_size: number;
  counter_updated_at: string;
  last_log_timestamp: string;
  delete_protected: false;
  created_at: string;
  updated_at: string;
  type: string;
  include_v: Boolean;
  count: number;
  schema: string;
  expire_days: any | null;
}

interface Job {
  job: string | number;
  datbase: string;
  job_id: string | number;
}

interface JobDetail {
  query: string;
  type: string;
  priority: number;
  retry_limit: number;
  duration: number;
  status: string;
  cpu_time: number;
  result_size: number;
  job_id: string;
  created_at: string;
  updated_at: string;
  start_at: string;
  end_at: string;
  num_records: number;
  database: string;
  user_name: string;
  result: string;
  url: string;
  hive_result_schema: string;
  organization: any | null;
  linked_result_export_job_id: any | null;
  result_export_target_job_id: any | null;
  debug: any;
}

interface QuickPickLabels {
  label: string;
  description: string | null;
}
