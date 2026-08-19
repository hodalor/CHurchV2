function authorizePermissions(...requiredPermissions) {
  return (req, res, next) => {
    const grantedPermissions = req.user?.permissions || [];
    const hasPermission = requiredPermissions.every((permission) => grantedPermissions.includes(permission));

    if (!hasPermission) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }

    return next();
  };
}

function authorizeRoles(...requiredRoles) {
  return (req, res, next) => {
    const grantedRoles = req.user?.roles || [];
    const hasRole = requiredRoles.some((role) => grantedRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ message: "You do not have the required role." });
    }

    return next();
  };
}

module.exports = {
  authorizePermissions,
  authorizeRoles,
};
