const admins = require("../services/admins");
const { db } = require("../services/db");
const {
  CLIENT_LIST_PROJECTION,
  parsePagination,
  wantsLightweight,
} = require("../utils/listQuery");

const collection = db.collection("clients");

exports.fetch = async (req, res) => {
  const { id } = req.body;

  if (!admins.includes(req.user["email"])) {
    return res.status(400).json({ success: false, message: "Not authorised" });
  }

  try {
    let clients = [];

    if (id) {
      const client = await collection.findOne({ _id: id });
      if (client) clients.push(client);
    } else {
      const lightweight = wantsLightweight(req.body);
      const { paginate, page, limit, skip } = parsePagination(req.body);
      const projection = lightweight ? CLIENT_LIST_PROJECTION : undefined;
      const filter = {};

      if (req.body.status && req.body.status !== "All") {
        filter.status = req.body.status;
      }
      if (req.body.assigned_to && req.body.assigned_to !== "All") {
        filter.assigned_to = {
          $regex: req.body.assigned_to.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        };
      }
      if (req.body.q) {
        const q = String(req.body.q).trim();
        if (q) {
          filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { number: { $regex: q, $options: "i" } },
          ];
        }
      }

      let cursor = collection.find(filter, projection ? { projection } : undefined);
      if (paginate) {
        const total = await collection.countDocuments(filter);
        clients = await cursor.skip(skip).limit(limit).toArray();
        return res.status(200).json({
          success: true,
          clients,
          page,
          limit,
          total,
          hasMore: skip + clients.length < total,
        });
      }

      clients = await cursor.toArray();
    }

    res.status(200).json({
      success: true,
      clients,
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
        console.log(model);
        await collection.insertOne(model);
        console.log("Client created");

        res.status(200).json({
            success: true,
            message: "Client created successfully",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.update = async (req, res) => {
    const { id, model } = req.body;

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
        console.log(model);
        const update = {
                name: model['name'], 
                number: model['number'], 
                fromAd: model['fromAd'], 
                assigned_to: model['assigned_to'],
                status: model['status'],
                channel: model['channel'],
                additionalNumbers: model['additionalNumbers'],
                cancellationReason: model['cancellationReason'],
            };
        if (Object.prototype.hasOwnProperty.call(model, "clientSatisfaction")) {
          const raw = model["clientSatisfaction"];
          if (raw === null || raw === "" || raw === undefined) {
            update.clientSatisfaction = null;
          } else {
            const score = parseInt(raw, 10);
            update.clientSatisfaction =
              Number.isInteger(score) && score >= 1 && score <= 10 ? score : null;
          }
        }
        await collection.findOneAndUpdate(
            {_id: id}, 
            {$set: update}
        );
        console.log("Client updated");

        res.status(200).json({
            success: true,
            message: "Client updated successfully",
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
        console.log(id);
        await collection.findOneAndDelete({_id: id});
        console.log("Client deleted");

        res.status(200).json({
            success: true,
            message: "Client deleted successfully",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.checkNumber = async (req, res) => {
    const { number } = req.body;

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    console.log(number);


    try {
        var exists = false;

        if(number){
            var client = await collection.findOne({number: number});
            if(client){
                exists = true;
            }
        } else {
            res.status(400).json({
                success: false,
                message: "This API needs number attribute",
            });
        }

        res.status(200).json({
            success: true,
            exists: exists,
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