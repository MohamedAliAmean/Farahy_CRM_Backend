const { ObjectId } = require("mongodb");
const { db } = require("./db");

const collection = db.collection("supplierCategories");

const DEFAULT_SUPPLIER_CATEGORIES = [
  "Venue",
  "Catering",
  "Decorations",
  "Photobooth",
  "Photography",
  "Videography",
  "Photography & Videography",
  "Media Coverage",
  "Shop",
  "Service Fees",
  "Coordination",
  "Ma2zoon",
  "Makeup",
  "Hair",
  "Family Makeup",
  "Family Hair",
  "Honeymoon",
  "Transportation",
  "DJ",
  "Dress",
  "Suit",
  "Veil",
  "Bachelorette",
  "Spa",
  "Installments",
  "Zaffa",
  "Entertainment",
  "Musicians",
  "Beauty",
  "Dentist",
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCategoryName(value) {
  return String(value || "").trim();
}

function isPlaceholder(name) {
  const value = normalizeCategoryName(name).toLowerCase();
  return !value || value === "choose category" || value === "all";
}

async function findByName(name) {
  const trimmed = normalizeCategoryName(name);
  if (!trimmed) return null;
  return collection.findOne({
    name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" },
  });
}

async function createCategory(name) {
  const trimmed = normalizeCategoryName(name);
  if (isPlaceholder(trimmed)) {
    throw new Error("Missing category name");
  }
  const existing = await findByName(trimmed);
  if (existing) {
    if (existing.active === false) {
      await collection.updateOne(
        { _id: existing._id },
        { $set: { active: true, name: trimmed } }
      );
      return { ...existing, active: true, name: trimmed };
    }
    return existing;
  }
  const category = {
    _id: new ObjectId().toString(),
    name: trimmed,
    active: true,
    exactDate: new Date(),
  };
  await collection.insertOne(category);
  console.log(`Added supplier category: ${trimmed}`);
  return category;
}

async function seedMissingDefaults() {
  for (let i = 0; i < DEFAULT_SUPPLIER_CATEGORIES.length; i++) {
    const name = DEFAULT_SUPPLIER_CATEGORIES[i];
    const existing = await findByName(name);
    if (!existing) {
      await collection.insertOne({
        _id: new ObjectId().toString(),
        name,
        active: true,
        exactDate: new Date(Date.now() + i),
      });
      console.log(`Seeded supplier category: ${name}`);
    }
  }
}

async function syncDistinctFromRecords() {
  const suppliers = await db
    .collection("suppliers")
    .find({}, { projection: { category: 1, categories: 1 } })
    .toArray();
  const events = await db
    .collection("events")
    .find({}, { projection: { suppliers: 1 } })
    .toArray();

  const names = [];
  for (const supplier of suppliers) {
    names.push(supplier.category);
    if (Array.isArray(supplier.categories)) {
      names.push(...supplier.categories);
    }
  }
  for (const event of events) {
    if (!Array.isArray(event.suppliers)) continue;
    for (const line of event.suppliers) {
      if (line && typeof line === "object") names.push(line.category);
    }
  }

  for (const name of names) {
    const trimmed = normalizeCategoryName(name);
    if (isPlaceholder(trimmed)) continue;
    const existing = await findByName(trimmed);
    if (existing) continue;
    await collection.insertOne({
      _id: new ObjectId().toString(),
      name: trimmed,
      active: true,
      exactDate: new Date(),
    });
    console.log(`Synced supplier category from records: ${trimmed}`);
  }
}

async function ensureSupplierCategories() {
  await seedMissingDefaults();
  await syncDistinctFromRecords();
}

let ensurePromise = null;
function ensureSupplierCategoriesOnce() {
  if (!ensurePromise) {
    ensurePromise = ensureSupplierCategories().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

async function listSupplierCategoryNames() {
  await ensureSupplierCategoriesOnce();
  const categories = await collection.find({ active: { $ne: false } }).toArray();
  const seen = new Set();
  const names = [];
  for (const category of categories) {
    const name = normalizeCategoryName(category.name);
    if (isPlaceholder(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  names.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  return names;
}

function replaceName(value, from, to) {
  return String(value || "").trim().toLowerCase() === from.toLowerCase()
    ? to
    : value;
}

async function renameCategory(oldName, newName) {
  const from = normalizeCategoryName(oldName);
  const to = normalizeCategoryName(newName);
  if (isPlaceholder(from) || isPlaceholder(to)) {
    throw new Error("Missing category name");
  }
  const source = await findByName(from);
  if (!source || source.active === false) {
    throw new Error("Category not found");
  }
  const target = await findByName(to);
  if (target && String(target._id) !== String(source._id)) {
    throw new Error("Category already exists");
  }

  await collection.updateOne(
    { _id: source._id },
    { $set: { name: to, active: true } }
  );

  const fromRegex = new RegExp(`^${escapeRegex(from)}$`, "i");
  const suppliers = db.collection("suppliers");
  const supplierDocs = await suppliers
    .find({
      $or: [{ category: fromRegex }, { categories: fromRegex }],
    })
    .toArray();

  for (const doc of supplierDocs) {
    const rawCategories = Array.isArray(doc.categories) ? doc.categories : [];
    const next = [];
    for (const item of rawCategories) {
      const value = replaceName(item, from, to);
      const text = normalizeCategoryName(value);
      if (!text) continue;
      if (next.some((existing) => existing.toLowerCase() === text.toLowerCase())) {
        continue;
      }
      next.push(text);
    }
    if (
      next.length === 0 &&
      String(doc.category || "").trim().toLowerCase() === from.toLowerCase()
    ) {
      next.push(to);
    }
    const category =
      next.find(
        (item) =>
          item.toLowerCase() ===
          replaceName(doc.category, from, to).toString().trim().toLowerCase()
      ) || next[0] || replaceName(doc.category, from, to);
    await suppliers.updateOne(
      { _id: doc._id },
      { $set: { categories: next, category } }
    );
  }

  const events = db.collection("events");
  const eventDocs = await events
    .find({ "suppliers.category": fromRegex })
    .toArray();
  for (const event of eventDocs) {
    const lines = (event.suppliers || []).map((line) => {
      if (!line || typeof line !== "object") return line;
      if (String(line.category || "").trim().toLowerCase() !== from.toLowerCase()) {
        return line;
      }
      return { ...line, category: to };
    });
    await events.updateOne({ _id: event._id }, { $set: { suppliers: lines } });
  }

  return to;
}

async function retireCategory(name) {
  const trimmed = normalizeCategoryName(name);
  const existing = await findByName(trimmed);
  if (!existing || existing.active === false) {
    throw new Error("Category not found");
  }
  await collection.updateOne({ _id: existing._id }, { $set: { active: false } });
  return trimmed;
}

module.exports = {
  DEFAULT_SUPPLIER_CATEGORIES,
  collection,
  createCategory,
  ensureSupplierCategoriesOnce,
  listSupplierCategoryNames,
  renameCategory,
  retireCategory,
  normalizeCategoryName,
};
