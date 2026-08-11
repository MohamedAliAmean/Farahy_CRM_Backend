const { admin } = require("../services/firebase");
const usersService = require("../services/users");
const { resolvePermissions } = require("../services/permissions");

// Cache verified Firebase tokens until near expiry to cut verifyIdToken cost.
const tokenCache = new Map();
const CACHE_SKEW_MS = 60 * 1000;

function getCachedUser(token) {
  const entry = tokenCache.get(token);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    tokenCache.delete(token);
    return null;
  }
  return entry.user;
}

function setCachedUser(token, user) {
  const expSec = user.exp ? user.exp * 1000 : Date.now() + 55 * 60 * 1000;
  tokenCache.set(token, {
    user,
    expiresAt: Math.min(expSec - CACHE_SKEW_MS, Date.now() + 55 * 60 * 1000),
  });
  // Prevent unbounded growth
  if (tokenCache.size > 500) {
    const firstKey = tokenCache.keys().next().value;
    tokenCache.delete(firstKey);
  }
}

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const cached = getCachedUser(token);
    if (cached) {
      req.user = cached;
    } else {
      const decodedToken = await admin.auth().verifyIdToken(token);
      setCachedUser(token, decodedToken);
      req.user = decodedToken;
    }

    const email = (req.user.email || "").toLowerCase();
    if (!email) {
      return res.status(403).json({ error: "Forbidden", message: "Missing email" });
    }

    let crmUser = await usersService.findByEmail(email);
    if (!crmUser) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Account is not authorized for this CRM",
      });
    }
    if (crmUser.status !== "active") {
      return res.status(403).json({
        error: "Forbidden",
        message:
          crmUser.status === "pending"
            ? "Account setup incomplete. Verify your email and set a password first."
            : "Account is disabled",
      });
    }

    req.crmUser = crmUser;
    req.permissions = resolvePermissions(crmUser);
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(403).json({ error: "Forbidden" });
  }
};

module.exports = { verifyFirebaseToken };
