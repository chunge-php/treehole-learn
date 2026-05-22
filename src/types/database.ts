// 数据库类型占位 — 生产环境用 `pnpm db:gen` 自动生成
export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: AccountRow;
        Insert: Partial<AccountRow> & { username: string; password_hash: string; display_name: string };
        Update: Partial<AccountRow>;
      };
      channels: { Row: ChannelRow; Insert: Partial<ChannelRow> & { name: string }; Update: Partial<ChannelRow> };
      channel_levels: { Row: ChannelLevelRow; Insert: Partial<ChannelLevelRow> & { name: string }; Update: Partial<ChannelLevelRow> };
      stores: { Row: StoreRow; Insert: Partial<StoreRow> & { name: string; channel_id: string }; Update: Partial<StoreRow> };
      end_users: { Row: EndUserRow; Insert: Partial<EndUserRow> & { name: string; store_id: string; channel_id: string }; Update: Partial<EndUserRow> };
      top_types: { Row: TopTypeRow; Insert: Partial<TopTypeRow> & { name: string }; Update: Partial<TopTypeRow> };
      assessments: { Row: AssessmentRow; Insert: Partial<AssessmentRow> & { title: string; dimension: string; qtype: string }; Update: Partial<AssessmentRow> };
      resources: { Row: ResourceRow; Insert: Partial<ResourceRow> & { title: string; type: string }; Update: Partial<ResourceRow> };
      orders: { Row: OrderRow; Insert: Partial<OrderRow> & { order_no: string }; Update: Partial<OrderRow> };
      assessment_records: { Row: AssessmentRecordRow; Insert: Partial<AssessmentRecordRow> & { end_user_id: string; channel_id: string; store_id: string }; Update: Partial<AssessmentRecordRow> };
      import_jobs: { Row: ImportJobRow; Insert: Partial<ImportJobRow> & { account_id: string; entity: string }; Update: Partial<ImportJobRow> };
      report_sessions: { Row: ReportSessionDbRow; Insert: Partial<ReportSessionDbRow> & { name: string }; Update: Partial<ReportSessionDbRow> };
      report_answers: { Row: ReportAnswerRow; Insert: Partial<ReportAnswerRow> & { session_id: string; assessment_id: string }; Update: Partial<ReportAnswerRow> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "super_admin" | "admin" | "channel_admin";
      account_status: "active" | "disabled";
      assessment_dimension: "learning_attitude" | "learning_method" | "learning_ability" | "learning_habit";
      assessment_qtype: "single" | "multiple" | "text";
      resource_type: "text" | "video" | "file";
      resource_status: "online" | "offline";
      import_status: "pending" | "processing" | "success" | "partial" | "failed";
    };
  };
};

export type AccountRow = {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "super_admin" | "admin" | "channel_admin";
  channel_id: string | null;
  status: "active" | "disabled";
  last_login_at: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
};

export type ChannelLevelRow = {
  id: string;
  name: string;
  rank: number;
  remark: string | null;
  created_at: string;
};

export type ChannelRow = {
  id: string;
  seq_no: number;
  name: string;
  level_id: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: "active" | "disabled";
  remark: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreRow = {
  id: string;
  seq_no: number;
  channel_id: string;
  name: string;
  province: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  device_count: number;
  status: "active" | "disabled";
  remark: string | null;
  created_at: string;
  updated_at: string;
};

export type EndUserRow = {
  id: string;
  seq_no: number;
  store_id: string;
  channel_id: string;
  name: string;
  phone: string | null;
  gender: "male" | "female" | "other" | null;
  age: number | null;
  grade: string | null;
  school: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  paid_amount: number;
  status: "active" | "disabled";
  remark: string | null;
  created_at: string;
  updated_at: string;
};

export type TopTypeRow = {
  id: string;
  parent_id: string | null;
  name: string;
  cover_url: string | null;
  selected_icon_url: string | null;
  unselected_icon_url: string | null;
  sort_order: number;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
};

export type AssessmentRow = {
  id: string;
  seq_no: number;
  project_id: string | null;
  dimension: "learning_attitude" | "learning_method" | "learning_ability" | "learning_habit";
  qtype: "single" | "multiple" | "text";
  title: string;
  options: Array<{ label: string; value: string; score?: number; explanation?: string }>;
  answer: unknown;
  explanation: string | null;
  score: number;
  sort_order: number;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
};

export type ResourceRow = {
  id: string;
  seq_no: number;
  type: "text" | "video" | "file";
  title: string;
  cover_url: string | null;
  body: string | null;
  media_url: string | null;
  duration_sec: number | null;
  file_size: number | null;
  file_ext: string | null;
  category_id: string | null;
  status: "online" | "offline";
  sort_order: number;
  remark: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  seq_no: number;
  order_no: string;
  channel_id: string | null;
  store_id: string | null;
  end_user_id: string | null;
  amount: number;
  pay_status: string;
  pay_method: string | null;
  paid_at: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
};

export type AssessmentRecordRow = {
  id: string;
  seq_no: number;
  end_user_id: string;
  channel_id: string;
  store_id: string;
  project_id: string | null;
  total_score: number;
  dimension_scores: Record<string, number>;
  answers: unknown[];
  finished_at: string | null;
  created_at: string;
};

export type ImportJobRow = {
  id: string;
  account_id: string;
  acting_channel_id: string | null;
  entity: string;
  file_url: string | null;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  errors: Array<{ row: number; field?: string; message: string }>;
  status: "pending" | "processing" | "success" | "partial" | "failed";
  created_at: string;
  finished_at: string | null;
};

export type ReportSessionDbRow = {
  id: string;
  seq_no: number;
  name: string;
  remark: string | null;
  question_ids: string[];
  total_questions: number;
  answered_count: number;
  status: "in_progress" | "completed";
  report_data: unknown | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportAnswerRow = {
  id: string;
  session_id: string;
  assessment_id: string;
  answer: string | null;
  answered_at: string;
};
