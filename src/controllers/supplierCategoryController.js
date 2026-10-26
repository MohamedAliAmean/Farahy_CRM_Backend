const { requireActive } = require("../middleware/authz");
const {
  createCategory,
  ensureSupplierCategoriesOnce,
  listSupplierCategoryNames,
  renameCategory,
  retireCategory,
} = require("../services/supplierCategories");

function canManage(req, res) {
  if (!requireActive(req, res)) return false;
  const actions = req.permissions?.actions || {};
  if (actions.create || actions.edit) return true;
  res.status(400).json({ success: false, message: "Missing permission" });
  return false;
}

exports.names = async (req, res) => {
  if (!requireActive(req, res)) return;
  try {
    const names = await listSupplierCategoryNames();
    res.status(200).json({ success: true, names });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  if (!canManage(req, res)) return;
  try {
    await ensureSupplierCategoriesOnce();
    const category = await createCategory(req.body.name);
    res.status(201).json({
      success: true,
      name: category.name,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  if (!canManage(req, res)) return;
  try {
    await ensureSupplierCategoriesOnce();
    const name = await renameCategory(req.body.name, req.body.newName);
    res.status(200).json({ success: true, name });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  if (!canManage(req, res)) return;
  try {
    await ensureSupplierCategoriesOnce();
    const name = await retireCategory(req.body.name);
    res.status(200).json({ success: true, name });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
