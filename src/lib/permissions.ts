import { ROLES, type Role } from './constants';

export function canApproveAtStep(userRole: Role, currentStep: number): boolean {
  if (userRole === ROLES.SUPER_ADMIN) return true;
  if (userRole === ROLES.ADMIN) return true;
  
  switch (currentStep) {
    case 1: return userRole === ROLES.OPS_MANAGER;
    case 2: return userRole === ROLES.CHIEF_ACCOUNTANT;
    case 3: return userRole === ROLES.GENERAL_MANAGER;
    case 4: return userRole === ROLES.CASHIER;
    default: return false;
  }
}

export function canDisburse(userRole: Role): boolean {
  return userRole === ROLES.CASHIER || userRole === ROLES.SUPER_ADMIN;
}

export function canManageUsers(userRole: Role): boolean {
  return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(userRole);
}

export function canManageCompanies(userRole: Role): boolean {
  return userRole === ROLES.SUPER_ADMIN;
}

export function canViewAllRequests(userRole: Role): boolean {
  return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(userRole);
}

export function getApprovalRoleForStep(step: number): Role | null {
  switch (step) {
    case 1: return ROLES.OPS_MANAGER;
    case 2: return ROLES.CHIEF_ACCOUNTANT;
    case 3: return ROLES.GENERAL_MANAGER;
    case 4: return ROLES.CASHIER;
    default: return null;
  }
}

export function isAdminRole(role: Role): boolean {
  return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);
}
