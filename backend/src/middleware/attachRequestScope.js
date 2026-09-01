const { setRequestContext } = require("../lib/requestContext");
const { verifyAccessToken } = require("../utils/tokenUtils");

function attachRequestScope(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    setRequestContext({
      scope: decoded.scope === "tenant" ? "tenant" : "master",
      churchId: decoded.churchId || "",
      tenantDbName: decoded.tenantDbName || "",
    });
  } catch (error) {
    // Leave authentication errors to the authenticate middleware on protected routes.
  }

  return next();
}

module.exports = attachRequestScope;
