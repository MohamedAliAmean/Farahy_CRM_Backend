const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const clientController = require("../controllers/clientController");

const router = express.Router();

router.post("/fetch", verifyFirebaseToken, clientController.fetch);
router.post("/create", verifyFirebaseToken, clientController.create);
router.post("/update", verifyFirebaseToken, clientController.update);
router.post("/delete", verifyFirebaseToken, clientController.delete);
router.post("/checkNumber", verifyFirebaseToken, clientController.checkNumber);
router.post("/updateReminders", verifyFirebaseToken, clientController.updateReminders);
router.post("/updateNotes", verifyFirebaseToken, clientController.updateNotes);

module.exports = router;