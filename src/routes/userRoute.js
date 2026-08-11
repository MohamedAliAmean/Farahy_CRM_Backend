const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");
const authCodeController = require("../controllers/authCodeController");

const router = express.Router();

// Public password-setup / reset flow (no Firebase token)
router.post("/sendCode", authCodeController.sendCode);
router.post("/verifyCode", authCodeController.verifyCode);
router.post("/setPassword", authCodeController.setPassword);

router.post("/me", verifyFirebaseToken, userController.me);
router.post("/roles", verifyFirebaseToken, userController.roles);
router.post("/fetch", verifyFirebaseToken, userController.fetch);
router.post("/create", verifyFirebaseToken, userController.create);
router.post("/update", verifyFirebaseToken, userController.update);
router.post("/resetPassword", verifyFirebaseToken, userController.resetPassword);
router.post("/resendInvite", verifyFirebaseToken, authCodeController.resendInvite);

module.exports = router;
