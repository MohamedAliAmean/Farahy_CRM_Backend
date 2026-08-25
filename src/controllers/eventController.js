const { requireActive, requireAction, requirePage } = require("../middleware/authz");
const { db } = require("../services/db");
const {
  EVENT_LIST_PROJECTION,
  parsePagination,
  wantsLightweight,
} = require("../utils/listQuery");
const mail = require("../services/mail");
const {
  findEmailsByAssigneeNames,
  parseAssigneeNames,
} = require("./employeeController");
const { ensureChannel } = require("../services/channels");
const reminderNotify = require("../services/reminderNotify");

const collection = db.collection("events");
const clientsCollection = db.collection("clients");

exports.fetch = async (req, res) => {
  const { id, clientID } = req.body;

  if (!requirePage(req, res, "events")) return;

  try {
    let events = [];

    if (id) {
      const event = await collection.findOne({ _id: id });
      if (event) events.push(event);
    } else if (clientID) {
      const lightweight = wantsLightweight(req.body);
      const projection = lightweight ? EVENT_LIST_PROJECTION : undefined;
      events = await collection
        .find({ clientID }, projection ? { projection } : undefined)
        .toArray();
    } else {
      const lightweight = wantsLightweight(req.body);
      const { paginate, page, limit, skip } = parsePagination(req.body);
      const projection = lightweight ? EVENT_LIST_PROJECTION : undefined;
      const filter = {};
      if (req.permissions?.dataScope?.mode === "assigned_only") {
        const display =
          (req.crmUser.displayName || "").trim() ||
          (req.crmUser.email || "").split("@")[0];
        const escaped = display.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.assigned_to = { $regex: escaped, $options: "i" };
      }
      if (req.body.eventType && req.body.eventType !== "All") {
        filter.eventType = req.body.eventType;
      }

      let cursor = collection.find(filter, projection ? { projection } : undefined);
      if (paginate) {
        const total = await collection.countDocuments(filter);
        events = await cursor.skip(skip).limit(limit).toArray();
        return res.status(200).json({
          success: true,
          events,
          page,
          limit,
          total,
          hasMore: skip + events.length < total,
        });
      }

      events = await cursor.toArray();
    }

    res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.create = async (req, res) => {
    const { model } = req.body;

    if (!requireAction(req, res, "create")) return;

    try {
        model['exactDate'] = new Date();
        model['event_Date'] = new Date(model['event_Date']);
        model['request_Date'] = new Date(model['request_Date']);

        console.log(model);

        await ensureChannel(model.channel);
        await collection.insertOne(model);

        console.log("Event created");

        // Notify event Assigned To employees (separate from client assignees).
        try {
          const client = model.clientID
            ? await clientsCollection.findOne({ _id: model.clientID })
            : null;
          const clientName = client?.name || "";
          const names = parseAssigneeNames(model.assigned_to);
          const recipients = await findEmailsByAssigneeNames(names);
          await Promise.all(
            recipients.map((recipient) =>
              mail.sendAssignmentEventEmail({
                to: recipient.email,
                employeeName: recipient.name,
                clientName,
                eventType: model.eventType,
                status: model.status,
                requestDate: model.request_Date,
                eventDate: model.event_Date,
                assignedTo: model.assigned_to,
              })
            )
          );
        } catch (mailErr) {
          console.error("Assignment notify email failed:", mailErr.message || mailErr);
        }

        res.status(200).json({
            success: true,
            message: "Event created successfully",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.updateSuppliers = async (req, res) => {
    const { id, suppliers } = req.body;

    if (!requireAction(req, res, "edit")) return;

    try {
        await collection.findOneAndUpdate(
            {_id: id}, 
            {$set: {
                suppliers: suppliers, 
            }}
        );
        console.log("Client suppliers updated");

        res.status(200).json({
            success: true,
            message: "Client suppliers updated successfully",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.updatePayments = async (req, res) => {
    const { id, payments } = req.body;

    if (!requireAction(req, res, "edit")) return;

    try {
        await collection.findOneAndUpdate(
            {_id: id}, 
            {$set: {
                payments: payments, 
            }}
        );
        console.log("Client payments updated");

        res.status(200).json({
            success: true,
            message: "Client payments updated successfully",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.updateNotes = async (req, res) => {
    const { id, notes } = req.body;

    if (!requireAction(req, res, "edit")) return;

    try {
        await collection.findOneAndUpdate(
            {_id: id}, 
            {$set: {
                notes: notes, 
            }}
        );
        console.log("Client notes updated");

        res.status(200).json({
            success: true,
            message: "Client notes updated successfully",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.updateReminders = async (req, res) => {
    const { id, reminders } = req.body;

    if (!requireAction(req, res, "edit")) return;

    try {
        const enriched = await reminderNotify.processReminderUpdate({
          collection,
          id,
          incomingReminders: reminders,
          contextBuilder: async (event) => {
            let clientName = "";
            if (event.clientID) {
              const client = await clientsCollection.findOne({
                _id: event.clientID,
              });
              clientName = client?.name || "";
            }
            return {
              clientName,
              eventType: event.eventType || "",
            };
          },
        });
        console.log("Event reminders updated");

        res.status(200).json({
            success: true,
            message: "Event reminders updated successfully",
            reminders: enriched,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.update = async (req, res) => {
    const { id, eventData } = req.body;

    if (!requireAction(req, res, "edit")) return;

    try {
        if (eventData?.channel) {
          await ensureChannel(eventData.channel);
        }
        await collection.findOneAndUpdate(
            {_id: id}, 
            {$set: eventData}
        );
        console.log("Event updated");

        res.status(200).json({
            success: true,
            message: "Event updated successfully",
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
        console.log("Event deleted");
        res.status(200).json({
            success: true,
            message: "Event deleted successfully",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};