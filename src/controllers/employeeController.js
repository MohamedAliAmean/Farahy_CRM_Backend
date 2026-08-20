const { requireActive, requireAction, requirePage } = require("../middleware/authz");
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseAssigneeNames(assignedTo) {
  return String(assignedTo || "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== "multi");
}

async function findEmailsByAssigneeNames(names) {
  const emails = [];
  const seen = new Set();
  for (const name of names) {
    const emp = await collection.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    });
    const email = normalizeEmail(emp?.email);
    if (!email || !isValidEmail(email) || seen.has(email)) continue;
    seen.add(email);
    emails.push({ name: emp.name, email });
  }
  return emails;
}

module.exports.findEmailsByAssigneeNames = findEmailsByAssigneeNames;
module.exports.parseAssigneeNames = parseAssigneeNames;

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

let ensurePromise = null;
function ensureEmployeesOnce() {
  if (!ensurePromise) {
    ensurePromise = ensureEmployees().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

exports.fetch = async (req, res) => {
  const { id } = req.body;

  if (!requirePage(req, res, "employees")) return;

  try {
    await ensureEmployeesOnce();

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

/**
 * Names for Assigned To dropdowns.
 * Available to any active CRM user — independent of Employees page access.
 */
exports.names = async (req, res) => {
  if (!requireActive(req, res)) return;

  try {
    await ensureEmployeesOnce();
    const employees = await collection
      .find({}, { projection: { name: 1 } })
      .sort({ exactDate: 1 })
      .toArray();

    const seen = new Set();
    const names = [];
    for (const emp of employees) {
      const name = String(emp.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }

    res.status(200).json({
      success: true,
      names,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/** Aggregate client status counts per employee (supports multi assigned_to). */
exports.statusCounts = async (req, res) => {
  if (!requirePage(req, res, "employees")) return;

  try {
    await ensureEmployeesOnce();
    const employees = await collection.find().sort({ exactDate: 1 }).toArray();
    const clients = db.collection("clients");

    const rows = await clients
      .aggregate([
        {
          $project: {
            status: 1,
            assignees: {
              $filter: {
                input: {
                  $map: {
                    input: { $split: [{ $ifNull: ["$assigned_to", ""] }, ","] },
                    as: "a",
                    in: { $trim: { input: "$$a" } },
                  },
                },
                as: "name",
                cond: { $ne: ["$$name", ""] },
              },
            },
          },
        },
        { $unwind: "$assignees" },
        {
          $group: {
            _id: { name: "$assignees", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const statuses = [
      "Active",
      "Inactive",
      "In contact",
      "Deposit paid",
      "Cancelled",
      "Postponed",
      "Done",
    ];

    const byName = {};
    for (const emp of employees) {
      byName[emp.name] = {
        employee: emp,
        counts: Object.fromEntries(statuses.map((s) => [s, 0])),
        total: 0,
      };
    }

    for (const row of rows) {
      const name = row._id?.name;
      const status = row._id?.status;
      if (!name || !byName[name]) continue;
      if (statuses.includes(status)) {
        byName[name].counts[status] = row.count;
        byName[name].total += row.count;
      }
    }

    const result = employees.map((emp) => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email || "",
      exactDate: emp.exactDate,
      counts: byName[emp.name].counts,
      total: byName[emp.name].total,
    }));

    res.status(200).json({
      success: true,
      employees: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.create = async (req, res) => {
  const { name, email } = req.body;

  if (!requireAction(req, res, "create")) return;

  try {
    const trimmed = (name || "").trim();
    const normalizedEmail = normalizeEmail(email);
    if (!trimmed) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Enter a valid email" });
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
      email: normalizedEmail || "",
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

  if (!requireAction(req, res, "edit")) return;

  try {
    if (!id || !employeeData || !employeeData.name) {
      return res.status(400).json({ success: false, message: "Invalid update payload" });
    }

    const trimmed = String(employeeData.name).trim();
    const normalizedEmail = normalizeEmail(employeeData.email);
    if (!trimmed) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Enter a valid email" });
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
      { $set: { name: trimmed, email: normalizedEmail || "" } }
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

  if (!requireAction(req, res, "delete")) return;

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
