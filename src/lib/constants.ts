export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  OPS_MANAGER: 'OPS_MANAGER',
  CHIEF_ACCOUNTANT: 'CHIEF_ACCOUNTANT',
  GENERAL_MANAGER: 'GENERAL_MANAGER',
  CASHIER: 'CASHIER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employee',
  OPS_MANAGER: 'Operations Manager',
  CHIEF_ACCOUNTANT: 'Chief Accountant',
  GENERAL_MANAGER: 'General Manager',
  CASHIER: 'Cashier',
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super Administrator',
};

export const CURRENCY = 'TZS';

export const CATEGORIES = [
  { value: 'FUEL', label: 'Fuel / Mafuta' },
  { value: 'PROJECT', label: 'Project / Mradi' },
  { value: 'TRAVEL', label: 'Travel / Usafiri' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies / Vifaa vya Ofisi' },
  { value: 'MAINTENANCE', label: 'Maintenance / Matengenezo' },
  { value: 'TRAINING', label: 'Training / Mafunzo' },
  { value: 'VEHICLE', label: 'Vehicle / Gari' },
  { value: 'OTHER', label: 'Other / Nyingine' },
] as const;

export const URGENCY_LEVELS = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-sky-100 text-sky-700' },
  { value: 'HIGH', label: 'High', color: 'bg-amber-100 text-amber-700' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-700' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash / Bashi' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / Hamisha Benki' },
  { value: 'CHECK', label: 'Check / Cheki' },
] as const;

export const REQUEST_STATUSES = {
  PENDING_OPS_MANAGER: { label: 'Pending Ops Manager', color: 'bg-amber-100 text-amber-800', step: 1 },
  PENDING_CHIEF_ACCOUNTANT: { label: 'Pending Chief Accountant', color: 'bg-amber-100 text-amber-800', step: 2 },
  PENDING_GENERAL_MANAGER: { label: 'Pending General Manager', color: 'bg-amber-100 text-amber-800', step: 3 },
  PENDING_DISBURSEMENT: { label: 'Pending Disbursement', color: 'bg-cyan-100 text-cyan-800', step: 4 },
  DISBURSED: { label: 'Disbursed', color: 'bg-emerald-100 text-emerald-800', step: 5 },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800', step: -1 },
  INFO_REQUESTED: { label: 'Info Requested', color: 'bg-orange-100 text-orange-800', step: -2 },
} as const;

export const VEHICLE_STATUSES = {
  PENDING_OPS_MANAGER: { label: 'Pending Ops Manager', color: 'bg-amber-100 text-amber-800', step: 1 },
  PENDING_CHIEF_ACCOUNTANT: { label: 'Pending Chief Accountant', color: 'bg-amber-100 text-amber-800', step: 2 },
  PENDING_GENERAL_MANAGER: { label: 'Pending General Manager', color: 'bg-amber-100 text-amber-800', step: 3 },
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-800', step: 4 },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800', step: -1 },
  INFO_REQUESTED: { label: 'Info Requested', color: 'bg-orange-100 text-orange-800', step: -2 },
  RETURNED: { label: 'Returned', color: 'bg-blue-100 text-blue-800', step: 5 },
} as const;

export const WORKFLOW_STEPS = [
  { step: 1, role: 'OPS_MANAGER' as Role, label: 'Operations Manager', status: 'PENDING_OPS_MANAGER' },
  { step: 2, role: 'CHIEF_ACCOUNTANT' as Role, label: 'Chief Accountant', status: 'PENDING_CHIEF_ACCOUNTANT' },
  { step: 3, role: 'GENERAL_MANAGER' as Role, label: 'General Manager', status: 'PENDING_GENERAL_MANAGER' },
  { step: 4, role: 'CASHIER' as Role, label: 'Cashier (Disbursement)', status: 'PENDING_DISBURSEMENT' },
] as const;

export const VEHICLE_WORKFLOW_STEPS = [
  { step: 1, role: 'OPS_MANAGER' as Role, label: 'Operations Manager', status: 'PENDING_OPS_MANAGER' },
  { step: 2, role: 'CHIEF_ACCOUNTANT' as Role, label: 'Chief Accountant', status: 'PENDING_CHIEF_ACCOUNTANT' },
  { step: 3, role: 'GENERAL_MANAGER' as Role, label: 'General Manager / Chairman', status: 'PENDING_GENERAL_MANAGER' },
] as const;

export const VEHICLE_CONDITIONS = [
  { value: 'NZURI', label: 'Nzuri (Good)' },
  { value: 'MBAYA', label: 'Mbaya (Bad)' },
] as const;

export const NOTIFICATION_TYPES = {
  SUBMISSION: 'SUBMISSION',
  APPROVAL: 'APPROVAL',
  REJECTION: 'REJECTION',
  INFO_REQUEST: 'INFO_REQUEST',
  DISBURSEMENT: 'DISBURSEMENT',
  SYSTEM: 'SYSTEM',
} as const;
