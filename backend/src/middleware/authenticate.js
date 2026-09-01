const Church = require("../models/Church");
const { setRequestContext } = require("../lib/requestContext");
const User = require("../models/User");
const { getEffectivePermissions } = require("../services/authService");
const { verifyAccessToken } = require("../utils/tokenUtils");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const decoded = verifyAccessToken(token);
    let church = null;

    if (decoded.scope === "tenant") {
      church = await Church.findOne({ churchId: decoded.churchId });
      if (!church || church.status !== "active") {
        return res.status(401).json({ message: "Church account is unavailable." });
      }

      setRequestContext({
        scope: "tenant",
        churchId: church.churchId,
        tenantDbName: church.dbName,
      });
    } else {
      setRequestContext({
        scope: "master",
        churchId: "",
        tenantDbName: "",
      });
    }

    const user = await User.findById(decoded.sub).populate("roles");

    if (!user || user.status !== "Active") {
      return res.status(401).json({ message: "Authenticated user is not active." });
    }

    req.user = {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      memberId: user.memberId || "",
      roles: user.roles.map((role) => role.name),
      permissions: getEffectivePermissions(user),
      scope: decoded.scope === "tenant" ? "tenant" : "master",
      churchId: decoded.scope === "tenant" ? church?.churchId || "" : "master",
      churchName: decoded.scope === "tenant" ? church?.name || "" : "Master",
      tenantDbName: church?.dbName || "",
      enabledNavigation: Array.isArray(church?.enabledNavigation) ? church.enabledNavigation : [],
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired access token." });
  }
}

module.exports = authenticate;
