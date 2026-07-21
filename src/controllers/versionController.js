const { db } = require("../services/db");

const collection = db.collection("version");

exports.check = async (req, res) => {

    try {
        var version = await collection.findOne({_id: "681b2aca634bf536da3885fd"});

        res.status(200).json({
            success: true,
            data: {
                version: version['web'],
                force: version['forceWeb'],
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};