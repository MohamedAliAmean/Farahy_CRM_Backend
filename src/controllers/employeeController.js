const admins = require("../services/admins");
const { db } = require("../services/db");
const { ObjectId } = require("mongodb");

const collection = db.collection("employees");

const DEFAULT_EMPLOYEES = [
  "Nadine",
  "Aleya",
  "Sara",
  "Merna",
  "Marwa",
  "Aya",
  "Amira",
  "Nour",
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function dedupeEmployees() {
  const all = await collection.find().sort({ exactDate: 1 }).toArray();
  const seen = new Set();
  const toDelete = [];

  for (const emp of all) {
    const key = (emp.name || "").trim().toLowerCase();
    if (!key) {
      toDelete.push(emp._id);
      continue;
    }
    if (seen.has(key)) {
      toDelete.push(emp._id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    await collection.deleteMany({ _id: { $in: toDelete } });
    console.log(`Removed ${toDelete.length} duplicate employees`);
  }
}

async function seedMissingDefaults() {
  for (let i = 0; i < DEFAULT_EMPLOYEES.length; i++) {
    const name = DEFAULT_EMPLOYEES[i];
    const existing = await collection.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    });
    if (!existing) {
      await collection.insertOne({
        _id: new ObjectId().toString(),
        name,
        exactDate: new Date(Date.now() + i),
      });
      console.log(`Seeded missing employee: ${name}`);
    }
  }
}

async function ensureEmployees() {
  await dedupeEmployees();
  await seedMissingDefaults();
}

exports.fetch = async (req, res) => {
  const { id } = req.body;

  if (!admins.includes(req.user["email"])) {
    return res.status(400).json({ success: false, message: "Not authorised" });
  }

  try {
    await ensureEmployees();

    let employees = [];
    if (id) {
      const employee = await collection.findOne({ _id: id });
      if (employee) {
        employees.push(employee);
      }
    } else {
      employees = await collection.find().sort({ exactDate: 1 }).toArray();
    }

    res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.create = async (req, res) => {
  const { name } = req.body;

  if (!admins.includes(req.user["email"])) {
    return res.status(400).json({ success: false, message: "Not authorised" });
  }

  try {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const existing = await collection.findOne({
      name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Employee already exists" });
    }

    const employeeId = new ObjectId().toString();
    const employee = {
      _id: employeeId,
      name: trimmed,
      exactDate: new Date(),
    };

    await collection.insertOne(employee);
    console.log(`Added new employee: ${trimmed}`);

    res.status(201).json({
      success: true,
      message: "Employee added successfully",
      employeeId,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.update = async (req, res) => {
  const { id, employeeData } = req.body;

  if (!admins.includes(req.user["email"])) {
    return res.status(400).json({ success: false, message: "Not authorised" });
  }

  try {
    if (!id || !employeeData || !employeeData.name) {
      return res.status(400).json({ success: false, message: "Invalid update payload" });
    }

    const trimmed = String(employeeData.name).trim();
    if (!trimmed) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const duplicate = await collection.findOne({
      _id: { $ne: id },
      name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" },
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: "Employee already exists" });
    }

    await collection.findOneAndUpdate(
      { _id: id },
      { $set: { name: trimmed } }
    );
    console.log("Employee updated");

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.body;

  if (!admins.includes(req.user["email"])) {
    return res.status(400).json({ success: false, message: "Not authorised" });
  }

  try {
    await collection.deleteOne({ _id: id });
    console.log("Employee deleted");
    res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
