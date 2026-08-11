const crypto = require("crypto");
const { admin } = require("../services/firebase");
const usersService = require("../services/users");
const authCodes = require("../services/authCodes");
const mail = require("../services/mail");
const { deny } = require("../middleware/authz");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function randomPassword() {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Public: send verification code for setup (pending) or reset (active).
 * Always returns a generic success message when the email format is valid,
 * except for cooldown / mail failures after we know the user exists.
 */
exports.sendCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !isValidEmail(email)) {
      return deny(res, "Enter a valid email");
    }

    const user = await usersService.findByEmail(email);
    // Avoid email enumeration for unknown addresses.
    if (!user || user.status === "disabled") {
      return res.status(200).json({
        success: true,
        message: "If this email is registered, a verification code was sent",
      });
    }

    let purpose = "reset";
    if (user.status === "pending") purpose = "setup";
    else if (user.status !== "active") {
      return res.status(200).json({
        success: true,
        message: "If this email is registered, a verification code was sent",
      });
    }

    const { code } = await authCodes.issueCode(email);
    await mail.sendVerificationCodeEmail({ to: email, code, purpose });

    res.status(200).json({
      success: true,
      message: "Verification code sent",
      purpose,
    });
  } catch (error) {
    if (error.code === "COOLDOWN") {
      return res.status(429).json({ success: false, message: error.message });
    }
    console.error("sendCode error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/** Public: verify 10-digit code → short-lived session token for setPassword */
exports.verifyCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    if (!email || !isValidEmail(email)) {
      return deny(res, "Enter a valid email");
    }
    if (!/^\d{10}$/.test(code)) {
      return deny(res, "Enter the 10-digit verification code");
    }

    const user = await usersService.findByEmail(email);
    if (!user || user.status === "disabled") {
      return deny(res, "Invalid or expired code");
    }

    const { sessionToken } = await authCodes.verifyCode(email, code);
    res.status(200).json({
      success: true,
      message: "Code verified",
      sessionToken,
      purpose: user.status === "pending" ? "setup" : "reset",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Invalid or expired code",
    });
  }
};

/** Public: set password after successful code verification */
exports.setPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const sessionToken = String(req.body.sessionToken || "").trim();
    const password = String(req.body.password || "");

    if (!email || !isValidEmail(email)) {
      return deny(res, "Enter a valid email");
    }
    if (!sessionToken) {
      return deny(res, "Missing verification session");
    }
    if (password.length < 6) {
      return deny(res, "Password must be at least 6 characters");
    }

    const user = await usersService.findByEmail(email);
    if (!user || user.status === "disabled") {
      return deny(res, "Account not found or disabled");
    }
    if (user.status !== "pending" && user.status !== "active") {
      return deny(res, "Account cannot set a password right now");
    }

    await authCodes.consumeSession(email, sessionToken);

    let fbUser;
    try {
      fbUser = await admin.auth().getUserByEmail(email);
    } catch (err) {
      if (err?.code === "auth/user-not-found") {
        fbUser = await admin.auth().createUser({
          email,
          password,
          displayName: user.displayName || email.split("@")[0],
          emailVerified: true,
          disabled: false,
        });
      } else {
        throw err;
      }
    }

    await admin.auth().updateUser(fbUser.uid, {
      password,
      disabled: false,
      emailVerified: true,
    });

    if (user.status === "pending") {
      await usersService.updateUser(email, {
        status: "active",
        passwordSetAt: new Date(),
      });
    } else {
      await usersService.updateUser(email, {
        passwordSetAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Password set successfully. You can sign in now.",
    });
  } catch (error) {
    console.error("setPassword error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/** Authenticated admin: resend invite / setup email for pending users */
exports.resendInvite = async (req, res) => {
  try {
    const { requireManageUsers } = require("../middleware/authz");
    if (!requireManageUsers(req, res)) return;

    const email = normalizeEmail(req.body.email);
    if (!email) return deny(res, "Email is required");

    const user = await usersService.findByEmail(email);
    if (!user) return deny(res, "User not found");

    await mail.sendInviteEmail({
      to: email,
      displayName: user.displayName,
    });

    res.status(200).json({
      success: true,
      message: "Invite email sent",
    });
  } catch (error) {
    console.error("resendInvite error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.randomPassword = randomPassword;
exports.normalizeEmail = normalizeEmail;
exports.isValidEmail = isValidEmail;
