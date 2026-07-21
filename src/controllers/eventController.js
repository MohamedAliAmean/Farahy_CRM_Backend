const admins = require("../services/admins");
const { db } = require("../services/db");

const collection = db.collection("events");

exports.fetch= async (req, res) => {
    const { id, clientID } = req.body;

    console.log(clientID);

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
        var events = [];

        if(id){
            var event = await collection.findOne({_id: id});
            if(event)
            events.push(event);
        } else if(clientID) {
            console.log('hena');
            events = await collection.find({clientID: clientID}).toArray();
        } else {
            events = await collection.find().toArray();
        }

        res.status(200).json({
            success: true,
            events: events,
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