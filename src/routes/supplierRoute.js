const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const supplierController = require("../controllers/supplierController");

const router = express.Router();

router.post("/fetch", verifyFirebaseToken, supplierController.fetch);
router.post("/validate", verifyFirebaseToken, supplierController.validateSupplier);
router.post("/create", verifyFirebaseToken, supplierController.create);
router.post("/update", verifyFirebaseToken, supplierController.update);
router.post("/delete", verifyFirebaseToken, supplierController.delete);

module.exports = router;