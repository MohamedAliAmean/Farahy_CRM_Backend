const admins = require("../services/admins");
const { db } = require("../services/db");
const {
  EVENT_LIST_PROJECTION,
  parsePagination,
  wantsLightweight,
} = require("../utils/listQuery");

const collection = db.collection("events");

exports.fetch = async (req, res) => {
  const { id, clientID } = req.body;

  if (!admins.includes(req.user["email"])) {
    return res.status(400).json({ success: false, message: "Not authorised" });
  }

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

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
        model['exactDate'] = new Date();
        model['event_Date'] = new Date(model['event_Date']);
        model['request_Date'] = new Date(model['request_Date']);

        console.log(model);

        await collection.insertOne(model);

        console.log("Event created");

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

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

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

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

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

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

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

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
        await collection.findOneAndUpdate(
            {_id: id}, 
            {$set: {
                reminders: reminders, 
            }}
        );
        console.log("Client reminders updated");

        res.status(200).json({
            success: true,
            message: "Client reminders updated successfully",
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

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
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

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

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