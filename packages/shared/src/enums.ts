export const Role = {
  ADMIN: 'ADMIN',
  ACCOUNTER: 'ACCOUNTER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const CompensationType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_COURSE: 'FIXED_COURSE',
  FIXED_SESSION: 'FIXED_SESSION',
} as const;
export type CompensationType =
  (typeof CompensationType)[keyof typeof CompensationType];

export const InstallmentStatus = {
  UNPAID: 'UNPAID',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type InstallmentStatus =
  (typeof InstallmentStatus)[keyof typeof InstallmentStatus];

export const LedgerEntryType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;
export type LedgerEntryType =
  (typeof LedgerEntryType)[keyof typeof LedgerEntryType];

export const CourseStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];
