const { canViewIndividualGiving } = require("./financePolicyService");

function sanitizeTransactionForUser(transaction, user) {
  const plain = typeof transaction?.toObject === "function" ? transaction.toObject() : { ...transaction };

  if (canViewIndividualGiving(user)) {
    return plain;
  }

  return {
    ...plain,
    memberId: null,
    householdId: null,
    notes: plain.linkedPledgeId ? plain.notes : "",
  };
}

module.exports = {
  sanitizeTransactionForUser,
};
