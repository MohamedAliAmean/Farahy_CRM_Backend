const { db } = require("../services/db");
const admins = require("../services/admins");

const collection = db.collection("logs");

exports.fetch = async (req, res) => {
    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
        var logs = [];

        logs = await collection.find()
        .sort({ exactDate: -1 })
        .toArray();

        console.log(logs);

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

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

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