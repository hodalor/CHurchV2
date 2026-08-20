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
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired access token." });
  }
}

module.exports = authenticate;
