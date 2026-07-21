const admins = require("../services/admins");
const { db } = require("../services/db");

const collection = db.collection("clients");

exports.fetch = async (req, res) => {
    const { id } = req.body;

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
        var clients = [];

        if(id){
            var client = await collection.findOne({_id: id});
            clients.push(client);
        } else {
            clients = await collection.find().toArray();
        }

        res.status(200).json({
            success: true,
            clients: clients,
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
        await collection.findOneAndUpdate(
            {_id: id}, 
            {$set: {
                name: model['name'], 
                number: model['number'], 
                fromAd: model['fromAd'], 
                assigned_to: model['assigned_to'],
                status: model['status'],
                channel: model['channel'],
                additionalNumbers: model['additionalNumbers'],
                cancellationReason: model['cancellationReason'],
            }}
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