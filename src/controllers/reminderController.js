const { requireActive } = require("../middleware/authz");
const { db } = require("../services/db");
const { parseAssigneeNames } = require("./employeeController");

const clientsCollection = db.collection("clients");
const eventsCollection = db.collection("events");
const employeesCollection = db.collection("employees");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function isActiveReminderStatus(status) {
  const s = String(status || "").trim();
  return s === "Not Started" || s === "In Progress";
}

function assigneeMatches(assignedTo, nameKeys) {
  const parts = parseAssigneeNames(assignedTo).map(normalize);
  if (!parts.length) return false;
  return nameKeys.some((key) => parts.includes(key));
}

async function resolveAssigneeKeys(req) {
  const keys = new Set();
  const email = normalize(req.crmUser?.email || req.user?.email);
  const displayName = String(req.crmUser?.displayName || "").trim();

  if (displayName) keys.add(normalize(displayName));
  if (email) {
    keys.add(email);
    const local = email.split("@")[0];
    if (local) keys.add(local);
  }

  if (email) {
    const emp = await employeesCollection.findOne({
      email: { $regex: `^${escapeRegex(email)}$`, $options: "i" },
    });
    if (emp?.name) keys.add(normalize(emp.name));
  }

  // Also match employee whose name equals displayName.
  if (displayName) {
    const empByName = await employeesCollection.findOne({
      name: { $regex: `^${escapeRegex(displayName)}$`, $options: "i" },
    });
    if (empByName?.name) keys.add(normalize(empByName.name));
  }

  return [...keys].filter(Boolean);
}

exports.mine = async (req, res) => {
  try {
    if (!requireActive(req, res)) return;

    const nameKeys = await resolveAssigneeKeys(req);
    if (!nameKeys.length) {
      return res.status(200).json({ success: true, reminders: [] });
    }

    const out = [];

    const clients = await clientsCollection
      .find({ reminders: { $exists: true, $ne: [] } })
      .project({ name: 1, reminders: 1 })
      .toArray();

    for (const client of clients) {
      const reminders = Array.isArray(client.reminders) ? client.reminders : [];
      for (const rem of reminders) {
        if (!rem) continue;
        if (!isActiveReminderStatus(rem.status)) continue;
        if (!assigneeMatches(rem.assignedTo, nameKeys)) continue;
        out.push({
          reminder: rem.reminder || "",
          date: rem.date || null,
          status: rem.status || "",
          category: rem.category || "",
          assignedTo: rem.assignedTo || "",
          type: "client",
          name: client.name || "",
          id: client._id,
        });
      }
    }

    const events = await eventsCollection
      .find({ reminders: { $exists: true, $ne: [] } })
      .project({ clientID: 1, eventType: 1, reminders: 1 })
      .toArray();

    const clientNameById = new Map(
      clients.map((c) => [String(c._id), c.name || ""])
    );
    const missingClientIds = [
      ...new Set(
        events
          .map((e) => e.clientID)
          .filter((id) => id && !clientNameById.has(String(id)))
          .map(String)
      ),
    ];
    if (missingClientIds.length) {
      const extraClients = await clientsCollection
        .find({ _id: { $in: missingClientIds } })
        .project({ name: 1 })
        .toArray();
      for (const c of extraClients) {
        clientNameById.set(String(c._id), c.name || "");
      }
    }

    for (const event of events) {
      const reminders = Array.isArray(event.reminders) ? event.reminders : [];
      for (const rem of reminders) {
        if (!rem) continue;
        if (!isActiveReminderStatus(rem.status)) continue;
        if (!assigneeMatches(rem.assignedTo, nameKeys)) continue;
        out.push({
          reminder: rem.reminder || "",
          date: rem.date || null,
          status: rem.status || "",
          category: rem.category || "",
          assignedTo: rem.assignedTo || "",
          type: "event",
          name: clientNameById.get(String(event.clientID)) || "",
          eType: event.eventType || "",
          id: event._id,
        });
      }
    }

    out.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

    res.status(200).json({ success: true, reminders: out });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
