const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const eventController = require("../controllers/eventController");

const router = express.Router();

router.post("/fetch", verifyFirebaseToken, eventController.fetch);
router.post("/create", verifyFirebaseToken, eventController.create);
router.post("/update", verifyFirebaseToken, eventController.update);
router.post("/updateSuppliers", verifyFirebaseToken, eventController.updateSuppliers);
router.post("/updatePayments", verifyFirebaseToken, eventController.updatePayments);
router.post("/updateNotes", verifyFirebaseToken, eventController.updateNotes);
router.post("/updateReminders", verifyFirebaseToken, eventController.updateReminders);
router.post("/delete", verifyFirebaseToken, eventController.delete);

module.exports = router;