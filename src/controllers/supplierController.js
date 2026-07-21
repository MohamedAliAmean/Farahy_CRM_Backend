const admins = require("../services/admins");
const { db } = require("../services/db");

const collection = db.collection("suppliers");

exports.fetch= async (req, res) => {
    const { id } = req.body;

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
        var suppliers = [];

        if(id){
            var supplier = await collection.findOne({_id: id});
            suppliers.push(supplier);
        } else {
            suppliers = await collection.find().sort({exactDate: 1}).toArray();
        }

        res.status(200).json({
            success: true,
            suppliers: suppliers,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.update = async (req, res) => {
    const { id, supplierData } = req.body;

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
        await collection.findOneAndUpdate(
            {_id: id}, 
            {$set: supplierData}
        );
        console.log("Supplier updated");

        res.status(200).json({
            success: true,
            message: "Supplier updated successfully",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.validateSupplier = async (req, res) => {
    const { instaHandle, number } = req.body;

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
        let repeatedHandle = false;
        let repeatedNumber = false;

        if(instaHandle) {
            const handleCount = await collection.countDocuments({
                instaHandle: instaHandle.trim().toLowerCase()
            });
            repeatedHandle = handleCount > 0;
        }

        if(number) {
            const numberCount = await collection.countDocuments({
                number: number.trim()
            });
            repeatedNumber = numberCount > 0;
        }

        res.status(200).json({
            success: true,
            repeatedHandle,
            repeatedNumber,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.create = async (req, res) => {
    const { 
        name, 
        number, 
        email, 
        instaHandle, 
        category, 
        hq, 
        defaultCommission, 
        note 
    } = req.body;

    if(!admins.includes(req.user['email'])){        
        return res.status(400).json({ success: false, message: "Not authorised" });
    }

    try {
        const { ObjectId } = require('mongodb');
        const supplierId = new ObjectId().toString();
        
        const supplier = {
            _id: supplierId,
            name: name.trim(),
            number: number.trim(),
            email: email.trim().toLowerCase(),
            instaHandle: instaHandle.trim().toLowerCase(),
            category: category,
            hq: hq.trim(),
            defaultCommission: parseFloat(defaultCommission),
            note: note.trim(),
            notes: [],
            attachments: [],
            payedByFToS: 0,
            commission_S: 0,
            commission_B: 0,
            exactDate: new Date()
        };

        const result = await collection.insertOne(supplier);
        console.log(`Added new supplier: ${name.trim()}`);

        res.status(201).json({
            success: true,
            message: "Supplier added successfully",
            supplierId: supplierId
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
        console.log("Supplier deleted");
        res.status(200).json({
            success: true,
            message: "Supplier deleted successfully",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};