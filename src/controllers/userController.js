const { admin } = require("../services/firebase");
const usersService = require("../services/users");
const { resolvePermissions, publicUser } = require("../services/permissions");
const mail = require("../services/mail");
const authCodeController = require("./authCodeController");
const {
  requireActive,
  requireManageUsers,
  deny,
} = require("../middleware/authz");

function validateOverrides(overrides) {
  if (overrides == null) return {};
  if (typeof overrides !== "object" || Array.isArray(overrides)) {
    throw new Error("Invalid overrides");
  }
  return overrides;
}

exports.me = async (req, res) => {
  try {
    if (!requireActive(req, res)) return;
    res.status(200).json({
      success: true,
      user: publicUser(req.crmUser),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.roles = async (req, res) => {
  try {
    if (!requireManageUsers(req, res)) return;
    const { ROLE_TEMPLATES } = require("../services/permissions");
    res.status(200).json({
      success: true,
      roles: Object.keys(ROLE_TEMPLATES),
      templates: ROLE_TEMPLATES,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.fetch = async (req, res) => {
  try {
    if (!requireManageUsers(req, res)) return;
    const users = await usersService.listUsers();
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    if (!requireManageUsers(req, res)) return;

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const displayName = String(req.body.displayName || "").trim();
    const role = String(req.body.role || "viewer").trim();
    const overrides = validateOverrides(req.body.overrides);

    if (!email) {
      return deny(res, "Email is required");
    }
    if (!authCodeController.isValidEmail(email)) {
      return deny(res, "Enter a valid email");
    }

    const existing = await usersService.findByEmail(email);
    if (existing) {
      return deny(res, "User already exists in CRM");
    }

    const password = authCodeController.randomPassword();
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split("@")[0],
        emailVerified: false,
        disabled: true,
      });
    } catch (err) {
      if (err?.code === "auth/email-already-exists") {
        firebaseUser = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(firebaseUser.uid, {
          password,
          displayName: displayName || firebaseUser.displayName || email.split("@")[0],
          disabled: true,
          emailVerified: false,
        });
      } else {
        throw err;
      }
    }

    const user = await usersService.upsertUser({
      email,
      displayName: displayName || firebaseUser.displayName || email.split("@")[0],
      role,
      status: "pending",
      overrides,
      createdBy: req.crmUser.email,
    });

    try {
      await mail.sendInviteEmail({
        to: email,
        displayName: user.displayName,
      });
    } catch (mailErr) {
      console.error("Invite email failed:", mailErr);
      return res.status(201).json({
        success: true,
        message:
          "User created, but invite email failed to send. Use Resend invite.",
        user,
        emailSent: false,
      });
    }

    res.status(201).json({
      success: true,
      message: "User created. Invite email sent.",
      user,
      emailSent: true,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    if (!requireManageUsers(req, res)) return;
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    if (!email) return deny(res, "Email is required");

    // Prevent locking every super admin out of user management by accident:
    // do not allow disabling/demoting yourself away from manageUsers.
    if (email === req.crmUser.email) {
      const nextRole = req.body.role;
      const nextStatus = req.body.status;
      const nextOverrides =
        req.body.overrides !== undefined
          ? validateOverrides(req.body.overrides)
          : undefined;
      const preview = {
        ...req.crmUser,
        role: nextRole !== undefined ? nextRole : req.crmUser.role,
        status: nextStatus !== undefined ? nextStatus : req.crmUser.status,
        overrides:
          nextOverrides !== undefined ? nextOverrides : req.crmUser.overrides,
      };
      const perms = resolvePermissions(preview);
      if (preview.status !== "active" || !perms.actions.manageUsers) {
        return deny(
          res,
          "You cannot remove your own access to manage users"
        );
      }
    }

    const patch = {};
    if (req.body.displayName !== undefined) patch.displayName = req.body.displayName;
    if (req.body.role !== undefined) patch.role = req.body.role;
    if (req.body.status !== undefined) patch.status = req.body.status;
    if (req.body.overrides !== undefined) {
      patch.overrides = validateOverrides(req.body.overrides);
    }

    const user = await usersService.updateUser(email, patch);

    // Keep Firebase disabled flag in sync with CRM status.
    // Only fully active users can sign in with email/password.
    if (patch.status) {
      try {
        const fbUser = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(fbUser.uid, {
          disabled: patch.status !== "active",
        });
      } catch (_) {
        // CRM record still updates even if Firebase sync fails.
      }
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    if (!requireManageUsers(req, res)) return;
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) {
      return deny(res, "Email and password are required");
    }
    if (password.length < 6) {
      return deny(res, "Password must be at least 6 characters");
    }

    const existing = await usersService.findByEmail(email);
    if (!existing) return deny(res, "User not found");

    const fbUser = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(fbUser.uid, { password });

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Keep lint quiet for unused require in some workflows
