const { requireActive } = require("../middleware/authz");
const {
  collection,
  ensureChannelsOnce,
  listChannelNames,
} = require("../services/channels");

exports.fetch = async (req, res) => {
  if (!requireActive(req, res)) return;

  try {
    await ensureChannelsOnce();
    const channels = await collection.find().sort({ exactDate: 1 }).toArray();
    res.status(200).json({
      success: true,
      channels,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/** Names for Channel dropdowns + Analysis sources. */
exports.names = async (req, res) => {
  if (!requireActive(req, res)) return;

  try {
    const names = await listChannelNames();
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
