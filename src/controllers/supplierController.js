const { requireActive, requireAction, requirePage } = require("../middleware/authz");
const { db } = require("../services/db");
const {
  SUPPLIER_LIST_PROJECTION,
  parsePagination,
  wantsLightweight,
} = require("../utils/listQuery");

const collection = db.collection("suppliers");

exports.fetch = async (req, res) => {
  const { id } = req.body;

  if (!requirePage(req, res, "suppliers")) return;

  try {
    let suppliers = [];

    if (id) {
      const supplier = await collection.findOne({ _id: id });
      if (supplier) suppliers.push(supplier);
    } else {
      const lightweight = wantsLightweight(req.body);
      const { paginate, page, limit, skip } = parsePagination(req.body);
      const projection = lightweight ? SUPPLIER_LIST_PROJECTION : undefined;
      const filter = {};
      if (req.body.category && req.body.category !== "All") {
        filter.category = req.body.category;
      }
      if (req.body.q) {
        const q = String(req.body.q).trim();
        if (q) {
          filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { instaHandle: { $regex: q, $options: "i" } },
            { number: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { additionalNumbers: { $elemMatch: { $regex: q, $options: "i" } } },
          ];
        }
      }

      let cursor = collection
        .find(filter, projection ? { projection } : undefined)
        .sort({ exactDate: 1 });

      if (paginate) {
        const total = await collection.countDocuments(filter);
        suppliers = await cursor.skip(skip).limit(limit).toArray();
        return res.status(200).json({
          success: true,
          suppliers,
          page,
          limit,
          total,
          hasMore: skip + suppliers.length < total,
        });
      }

      suppliers = await cursor.toArray();
    }

    res.status(200).json({
      success: true,
      suppliers,
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

    if (!requireAction(req, res, "edit")) return;

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

    if (!requireActive(req, res)) return;

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
            const trimmed = number.trim();
            const numberCount = await collection.countDocuments({
                $or: [
                    { number: trimmed },
                    { additionalNumbers: trimmed },
                ],
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
        additionalNumbers,
        email, 
        instaHandle, 
        category, 
        hq, 
        defaultCommission, 
        note 
    } = req.body;

    if (!requireAction(req, res, "create")) return;

    try {
        const { ObjectId } = require('mongodb');
        const supplierId = new ObjectId().toString();
        const extras = Array.isArray(additionalNumbers)
            ? additionalNumbers
                .map((n) => String(n ?? '').trim())
                .filter((n) => n.length > 0)
            : [];
        
        const supplier = {
            _id: supplierId,
            name: name.trim(),
            number: number.trim(),
            additionalNumbers: extras,
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

    if (!requireAction(req, res, "delete")) return;

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