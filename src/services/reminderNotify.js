const crypto = require("crypto");
const { db } = require("./db");
const mail = require("./mail");
const {
  findEmailsByAssigneeNames,
  parseAssigneeNames,
} = require("../controllers/employeeController");

const eventsCollection = db.collection("events");
const clientsCollection = db.collection("clients");

function newReminderId() {
  return crypto.randomUUID();
}

function cairoDateKey(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
}

function todayCairoKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
}

/**
 * Keep existing reminder ids/flags when frontend resends the list,
 * mint ids for brand-new reminders, and return which ones are newly created.
 */
function enrichReminders(previous = [], incoming = []) {
  const oldById = new Map();
  for (const rem of previous) {
    if (rem && rem._id) oldById.set(String(rem._id), rem);
  }

  const created = [];
  const enriched = (incoming || []).map((raw) => {
    const rem = { ...(raw || {}) };
    const existingId = rem._id ? String(rem._id) : "";
    const prev = existingId ? oldById.get(existingId) : null;
    const isNew = !prev;
    if (!existingId) {
      rem._id = newReminderId();
    }
    rem.createdEmailSent = prev?.createdEmailSent === true || rem.createdEmailSent === true;
    rem.dueEmailSent = prev?.dueEmailSent === true || rem.dueEmailSent === true;
    rem.dueEmailSentOn = prev?.dueEmailSentOn || rem.dueEmailSentOn || null;
    if (isNew) created.push(rem);
    return rem;
  });

  return { enriched, created };
}

async function sendReminderEmails(reminder, context, kind) {
  const names = parseAssigneeNames(reminder.assignedTo);
  if (!names.length) return;
  const recipients = await findEmailsByAssigneeNames(names);
  await Promise.all(
    recipients.map((recipient) =>
      mail.sendReminderEmail({
        to: recipient.email,
        employeeName: recipient.name,
        kind,
        clientName: context.clientName,
        eventType: context.eventType,
        category: reminder.category,
        date: reminder.date,
        status: reminder.status,
        assignedTo: reminder.assignedTo,
        description: reminder.reminder,
      })
    )
  );
}

async function processReminderUpdate({
  collection,
  id,
  incomingReminders,
  contextBuilder,
}) {
  const doc = await collection.findOne({ _id: id });
  if (!doc) {
    throw new Error("Record not found");
  }

  const previous = Array.isArray(doc.reminders) ? doc.reminders : [];
  const { enriched, created } = enrichReminders(previous, incomingReminders);
  const context = await contextBuilder(doc);

  for (const rem of created) {
    try {
      await sendReminderEmails(rem, context, "created");
      rem.createdEmailSent = true;
      // If the reminder is due today, also send the due notification now.
      if (cairoDateKey(rem.date) === todayCairoKey() && rem.dueEmailSent !== true) {
        await sendReminderEmails(rem, context, "due");
        rem.dueEmailSent = true;
        rem.dueEmailSentOn = new Date().toISOString();
      }
    } catch (err) {
      console.error("Reminder create email failed:", err.message || err);
    }
  }

  await collection.findOneAndUpdate(
    { _id: id },
    { $set: { reminders: enriched } }
  );

  return enriched;
}

async function processDueRemindersForCollection(collection, kind, contextBuilder) {
  const today = todayCairoKey();
  const cursor = collection.find({
    reminders: { $exists: true, $ne: [] },
  });

  let sent = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const reminders = Array.isArray(doc.reminders) ? doc.reminders : [];
    let changed = false;
    const context = await contextBuilder(doc);

    for (const rem of reminders) {
      if (!rem || rem.dueEmailSent === true) continue;
      if (cairoDateKey(rem.date) !== today) continue;
      try {
        await sendReminderEmails(rem, context, "due");
        rem.dueEmailSent = true;
        rem.dueEmailSentOn = new Date().toISOString();
        changed = true;
        sent += 1;
      } catch (err) {
        console.error("Reminder due email failed:", err.message || err);
      }
    }

    if (changed) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { reminders } }
      );
    }
  }
  return sent;
}

async function runDueReminderJob() {
  const eventSent = await processDueRemindersForCollection(
    eventsCollection,
    "event",
    async (event) => {
      let clientName = "";
      if (event.clientID) {
        const client = await clientsCollection.findOne({ _id: event.clientID });
        clientName = client?.name || "";
      }
      return {
        clientName,
        eventType: event.eventType || "",
      };
    }
  );

  const clientSent = await processDueRemindersForCollection(
    clientsCollection,
    "client",
    async (client) => ({
      clientName: client.name || "",
      eventType: "",
    })
  );

  console.log(
    `Due reminder emails sent: events=${eventSent}, clients=${clientSent}`
  );
  return { eventSent, clientSent };
}

let dueJobTimer = null;
function startDueReminderScheduler() {
  if (dueJobTimer) return;
  // Run shortly after boot, then every hour.
  setTimeout(() => {
    runDueReminderJob().catch((err) =>
      console.error("Due reminder job error:", err.message || err)
    );
  }, 15 * 1000);

  dueJobTimer = setInterval(() => {
    runDueReminderJob().catch((err) =>
      console.error("Due reminder job error:", err.message || err)
    );
  }, 60 * 60 * 1000);

  if (typeof dueJobTimer.unref === "function") dueJobTimer.unref();
  console.log("Due reminder scheduler started (hourly, Africa/Cairo)");
}

module.exports = {
  enrichReminders,
  processReminderUpdate,
  runDueReminderJob,
  startDueReminderScheduler,
  cairoDateKey,
  todayCairoKey,
};
