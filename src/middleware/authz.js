function deny(res, message = "Not authorised") {
  res.status(400).json({ success: false, message });
  return false;
}

function requireActive(req, res) {
  if (!req.crmUser || req.crmUser.status !== "active") {
    return deny(res);
  }
  return true;
}

function requireAction(req, res, action) {
  if (!requireActive(req, res)) return false;
  if (!req.permissions?.actions?.[action]) {
    return deny(res, "Missing permission");
  }
  return true;
}

function requirePage(req, res, page) {
  if (!requireActive(req, res)) return false;
  if (!req.permissions?.pages?.[page]) {
    return deny(res, "Missing permission");
  }
  return true;
}

function requireManageUsers(req, res) {
  return requireAction(req, res, "manageUsers");
}

module.exports = {
  deny,
  requireActive,
  requireAction,
  requirePage,
  requireManageUsers,
};
