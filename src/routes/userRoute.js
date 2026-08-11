const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

const router = express.Router();

router.post("/me", verifyFirebaseToken, userController.me);
router.post("/roles", verifyFirebaseToken, userController.roles);
router.post("/fetch", verifyFirebaseToken, userController.fetch);
router.post("/create", verifyFirebaseToken, userController.create);
router.post("/update", verifyFirebaseToken, userController.update);
router.post("/resetPassword", verifyFirebaseToken, userController.resetPassword);

module.exports = router;
