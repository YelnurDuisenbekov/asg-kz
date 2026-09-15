export type Cluster = "PRETENDER" | "TENDER" | "CONCLUSION" | "EXECUTION";
export type Executor = "ASG" | "STROYPROJECT";
export type TenderStatus = "REVIEW" | "LOST" | "WON";
export type ExecutionType = "OWN" | "PARTIAL_SUB" | "FULL_SUB";
export type PaymentStatus = "PENDING" | "APPROVED" | "PAID";
export type ExpenseType = "MATERIALS" | "EQUIPMENT" | "LABOR" | "SPECIAL_TECH";
export type DeadlineMode = "DATE" | "CALENDAR_DAYS" | "WORKING_DAYS";

export type NamedItem = {
  id: string;
  name: string;
};

export type Deadline = {
  mode: DeadlineMode;
  date?: string;
  days?: number;
  from?: string;
};

export type Doc = {
  id: string;
  originalName: string;
  storedName: string;
};

export type ScheduleTask = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  children: ScheduleTask[];
};

export type Estimate = {
  materials: number;
  equipment: number;
  labor: number;
  specialTech: number;
  profit: number;
};

export type Deal = {
  id: string;
  cluster: Cluster;
  executor: Executor;
  title: string;
  customer: string;
  amount: number;
  documents: Doc[];
  deadline: Deadline;
  createdAt: string;
  clusterEnteredAt: string;
  announcementNumber?: string;
  lotNumber?: string;
  tenderUrl?: string;
  submissionDocuments: Doc[];
  resultsDeadline?: Deadline;
  tenderStatus?: TenderStatus;
  protocolDocuments: Doc[];
  contractNumber?: string;
  contractDate?: string;
  estimate: Estimate;
  tasks: ScheduleTask[];
  approvalDays?: number;
  signingDays?: number;
  conclusionStartedAt?: string;
  executionType?: ExecutionType;
  subcontractorIds: string[];
};

export type Payment = {
  id: string;
  dealId: string;
  counterparty: string;
  amount: number;
  purpose: string;
  expenseType: ExpenseType;
  due: Deadline;
  documents: Doc[];
  status: PaymentStatus;
  createdAt: string;
};

export type Income = {
  id: string;
  dealId: string;
  amount: number;
  date: string;
  purpose: string;
  createdAt: string;
};

export type Avr = {
  id: string;
  dealId: string;
  number: string;
  date: string;
  amount: number;
  documents: Doc[];
  createdAt: string;
};

export type Database = {
  schemaVersion: 2;
  customers: NamedItem[];
  counterparties: NamedItem[];
  subcontractors: NamedItem[];
  deals: Deal[];
  payments: Payment[];
  incomes: Income[];
  avrs: Avr[];
};
