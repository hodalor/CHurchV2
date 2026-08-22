const { PERMISSIONS, ROLES } = require("../utils/permissions");

const CONFIDENTIAL_FINANCE_ROLES = [
  ROLES.FINANCE_MANAGER,
  ROLES.CHURCH_ACCOUNTANT,
  ROLES.ELDERS,
  ROLES.CHURCH_ADMINISTRATOR,
  ROLES.SYSTEM_ADMINISTRATOR,
  ROLES.SUPERADMIN,
];

const FINANCE_VOID_ROLES = [
  ROLES.FINANCE_MANAGER,
  ROLES.CHURCH_ACCOUNTANT,
  ROLES.ELDERS,
  ROLES.CHURCH_ADMINISTRATOR,
  ROLES.SYSTEM_ADMINISTRATOR,
  ROLES.SUPERADMIN,
];

function hasRole(user, roles = []) {
  const grantedRoles = new Set(user?.roles || []);
  return roles.some((role) => grantedRoles.has(role));
}

function hasPermission(user, permission) {
  return Boolean(permission && (user?.permissions || []).includes(permission));
}

function canViewIndividualGiving(user) {
  return hasRole(user, CONFIDENTIAL_FINANCE_ROLES) || hasPermission(user, PERMISSIONS.VIEW_FINANCE_CONFIDENTIAL);
}

function canVoidFinancialRecords(user) {
  return hasRole(user, FINANCE_VOID_ROLES) || hasPermission(user, PERMISSIONS.VOID_FINANCE);
}

function getExpenseApprovalThreshold() {
  const rawValue = Number(process.env.FINANCE_EXPENSE_APPROVAL_THRESHOLD || 5000);
  return Number.isFinite(rawValue) && rawValue >= 0 ? rawValue : 5000;
}

function requiresHigherExpenseApproval(amount) {
  return Number(amount || 0) > getExpenseApprovalThreshold();
}

function canApproveExpense(user, amount) {
  if (hasRole(user, [ROLES.SUPERADMIN, ROLES.SYSTEM_ADMINISTRATOR])) {
    return true;
  }

  if (!hasPermission(user, PERMISSIONS.APPROVE_FINANCE_EXPENSES) && !hasRole(user, [ROLES.FINANCE_MANAGER, ROLES.CHURCH_ADMINISTRATOR, ROLES.ELDERS])) {
    return false;
  }

  if (!requiresHigherExpenseApproval(amount)) {
    return hasRole(user, [ROLES.FINANCE_MANAGER, ROLES.CHURCH_ACCOUNTANT, ROLES.CHURCH_ADMINISTRATOR, ROLES.ELDERS]) ||
      hasPermission(user, PERMISSIONS.APPROVE_FINANCE_EXPENSES);
  }

  return hasRole(user, [ROLES.ELDERS, ROLES.CHURCH_ADMINISTRATOR]) || hasPermission(user, PERMISSIONS.APPROVE_FINANCE_HIGH_VALUE_EXPENSES);
}

module.exports = {
  canApproveExpense,
  canViewIndividualGiving,
  canVoidFinancialRecords,
  getExpenseApprovalThreshold,
  requiresHigherExpenseApproval,
};
