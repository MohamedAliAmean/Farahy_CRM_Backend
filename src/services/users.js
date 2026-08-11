const { db } = require("./db");
const {
  LEGACY_SEED,
  normalizeEmail,
  resolvePermissions,
  publicUser,
  roleTemplate,
  deepClone,
} = require("./permissions");

const collection = db.collection("users");

let seedPromise = null;

async function ensureSeeded() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const now = new Date();
    for (const seed of LEGACY_SEED) {
      const email = normalizeEmail(seed.email);
      const existing = await collection.findOne({ email });
      if (existing) continue;
      await collection.insertOne({
        _id: email,
        email,
        displayName: seed.displayName,
        role: seed.role,
        status: "active",
        overrides: {},
        createdAt: now,
        updatedAt: now,
        createdBy: "system-seed",
      });
      console.log(`Seeded CRM user ${email} as ${seed.role}`);
    }
  })().catch((err) => {
    seedPromise = null;
    throw err;
  });
  return seedPromise;
}

async function findByEmail(email) {
  await ensureSeeded();
  return collection.findOne({ email: normalizeEmail(email) });
}

async function listUsers() {
  await ensureSeeded();
  const users = await collection.find({}).sort({ email: 1 }).toArray();
  return users.map(publicUser);
}

async function upsertUser({
  email,
  displayName,
  role,
  status = "active",
  overrides = {},
  createdBy,
}) {
  await ensureSeeded();
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("Email is required");
  if (!roleTemplate(role)) throw new Error("Invalid role");

  const now = new Date();
  const existing = await collection.findOne({ email: normalized });
  if (existing) {
    await collection.updateOne(
      { email: normalized },
      {
        $set: {
          displayName: displayName ?? existing.displayName,
          role,
          status,
          overrides: overrides || {},
          updatedAt: now,
        },
      }
    );
  } else {
    await collection.insertOne({
      _id: normalized,
      email: normalized,
      displayName: displayName || normalized.split("@")[0],
      role,
      status,
      overrides: overrides || {},
      createdAt: now,
      updatedAt: now,
      createdBy: createdBy || "system",
    });
  }
  return publicUser(await findByEmail(normalized));
}

async function updateUser(email, patch) {
  await ensureSeeded();
  const normalized = normalizeEmail(email);
  const existing = await findByEmail(normalized);
  if (!existing) throw new Error("User not found");

  const next = {
    displayName:
      patch.displayName !== undefined
        ? String(patch.displayName).trim()
        : existing.displayName,
    role: patch.role !== undefined ? patch.role : existing.role,
    status: patch.status !== undefined ? patch.status : existing.status,
    overrides:
      patch.overrides !== undefined
        ? patch.overrides || {}
        : existing.overrides || {},
    updatedAt: new Date(),
  };

  if (!roleTemplate(next.role)) throw new Error("Invalid role");
  if (!["active", "disabled"].includes(next.status)) {
    throw new Error("Invalid status");
  }

  await collection.updateOne({ email: normalized }, { $set: next });
  return publicUser(await findByEmail(normalized));
}

function getPermissionsForDoc(userDoc) {
  return resolvePermissions(userDoc);
}

module.exports = {
  collection,
  ensureSeeded,
  findByEmail,
  listUsers,
  upsertUser,
  updateUser,
  getPermissionsForDoc,
  publicUser,
  deepClone,
};
