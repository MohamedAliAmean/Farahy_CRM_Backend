const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const logController = require("../controllers/logController");

const router = express.Router();

router.get("/fetch", verifyFirebaseToken, logController.fetch);
router.post("/create", verifyFirebaseToken, logController.create);

module.exports = router;