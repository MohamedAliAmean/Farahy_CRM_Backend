const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const employeeController = require("../controllers/employeeController");

const router = express.Router();

router.post("/fetch", verifyFirebaseToken, employeeController.fetch);
router.post("/create", verifyFirebaseToken, employeeController.create);
router.post("/update", verifyFirebaseToken, employeeController.update);
router.post("/delete", verifyFirebaseToken, employeeController.delete);

module.exports = router;
