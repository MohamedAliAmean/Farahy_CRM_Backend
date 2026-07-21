const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const versionController = require("../controllers/versionController");

const router = express.Router();

router.get("/check", versionController.check);

module.exports = router;