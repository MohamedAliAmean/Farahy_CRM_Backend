const { db } = require("../services/db");
const { requireActive, requireAction, requirePage } = require("../middleware/authz");

const collection = db.collection("logs");

exports.fetch = async (req, res) => {
  if (!requirePage(req, res, "logs")) return;

  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.body?.limit, 10) || 100));
    const logs = await collection
      .find()
      .sort({ exactDate: -1 })
      .limit(limit)
      .toArray();

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.create = async (req, res) => {
    const {model} = req.body;

    if (!requireActive(req, res)) return;

    try {
        model['exactDate'] = new Date();

        await collection.insertOne(model);

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};