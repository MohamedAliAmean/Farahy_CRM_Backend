const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const channelController = require("../controllers/channelController");

const router = express.Router();

router.post("/fetch", verifyFirebaseToken, channelController.fetch);
router.post("/names", verifyFirebaseToken, channelController.names);

module.exports = router;
