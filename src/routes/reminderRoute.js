const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const reminderController = require("../controllers/reminderController");

const router = express.Router();

router.post("/mine", verifyFirebaseToken, reminderController.mine);

module.exports = router;
