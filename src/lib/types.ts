export type PaymentStatus = "PENDING" | "APPROVED" | "PAID";
export type WorkStatus = "NEW" | "ESTIMATE" | "APPROVAL" | "SUBMITTED" | "SIGNED" | "REJECTED";
export type ExecutionType = "OWN" | "PARTIAL_SUB" | "FULL_SUB";
export type AmountMode = "PERCENT" | "AMOUNT";

export type Subcontractor = {
  id: string;
  name: string;
};

export type Contract = {
  id: string;
  title: string;
  number: string;
  date: string;
  customer: string;
  executionType: ExecutionType;
  subcontractorIds: string[];
  amount: number;
  plannedCost: number;
  documents: PaymentDocument[];
  responsibleId?: string;
  workItemId?: string;
  createdAt: string;
};

export type NamedType = {
  id: string;
  name: string;
  isSystem: boolean;
  code?: "CONTRACT";
};

export type PaymentDocument = {
  id: string;
  originalName: string;
  storedName: string;
};

export type Payment = {
  id: string;
  expenseTypeId: string;
  contractId?: string;
  counterparty: string;
  purpose: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  documents: PaymentDocument[];
  createdAt: string;
};

export type Income = {
  id: string;
  incomeTypeId: string;
  contractId?: string;
  amount: number;
  date: string;
  purpose: string;
  createdAt: string;
};

export type PlannedIncome = {
  id: string;
  contractId: string;
  receiptDate: string;
  mode: AmountMode;
  value: number;
  createdAt: string;
};

export type Task = {
  id: string;
  contractId: string;
  name: string;
  assignee: string;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
};

export type WorkItem = {
  id: string;
  lots: string;
  tenderUrl: string;
  customer: string;
  amount: number;
  status: WorkStatus;
  responsibleId?: string;
  documents: PaymentDocument[];
  createdAt: string;
};

export type Settings = {
  approachingDays: number;
};

export type Database = {
  settings: Settings;
  subcontractors: Subcontractor[];
  counterparties: Subcontractor[];
  people: Subcontractor[];
  customers: Subcontractor[];
  contracts: Contract[];
  expenseTypes: NamedType[];
  incomeTypes: NamedType[];
  payments: Payment[];
  incomes: Income[];
  plannedIncomes: PlannedIncome[];
  tasks: Task[];
  workItems: WorkItem[];
};
