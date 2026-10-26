const express = require("express");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const supplierCategoryController = require("../controllers/supplierCategoryController");

const router = express.Router();

router.post("/names", verifyFirebaseToken, supplierCategoryController.names);
router.post("/create", verifyFirebaseToken, supplierCategoryController.create);
router.post("/update", verifyFirebaseToken, supplierCategoryController.update);
router.post("/delete", verifyFirebaseToken, supplierCategoryController.remove);

module.exports = router;
