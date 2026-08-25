const { ObjectId } = require("mongodb");
const { db } = require("./db");

const collection = db.collection("channels");

const DEFAULT_CHANNELS = [
  "Nadine",
  "Aleya",
  "Employee referral",
  "Supplier referral",
  "Client referral",
  "Facebook",
  "Instagram",
  "Tiktok",
  "Gmaps",
  "Hotline",
  "Website",
  "Whatsapp",
  "Genie",
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeChannelName(value) {
  return String(value || "").trim();
}

async function findByName(name) {
  const trimmed = normalizeChannelName(name);
  if (!trimmed) return null;
  return collection.findOne({
    name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" },
  });
}

async function ensureChannel(name) {
  const trimmed = normalizeChannelName(name);
  if (!trimmed || trimmed.toLowerCase().startsWith("choose ")) {
    return null;
  }
  const existing = await findByName(trimmed);
  if (existing) return existing;
  const channel = {
    _id: new ObjectId().toString(),
    name: trimmed,
    exactDate: new Date(),
  };
  await collection.insertOne(channel);
  console.log(`Added channel: ${trimmed}`);
  return channel;
}

async function seedMissingDefaults() {
  for (let i = 0; i < DEFAULT_CHANNELS.length; i++) {
    const name = DEFAULT_CHANNELS[i];
    const existing = await findByName(name);
    if (!existing) {
      await collection.insertOne({
        _id: new ObjectId().toString(),
        name,
        exactDate: new Date(Date.now() + i),
      });
      console.log(`Seeded missing channel: ${name}`);
    }
  }
}

async function syncDistinctFromRecords() {
  const [clientChannels, eventChannels] = await Promise.all([
    db.collection("clients").distinct("channel"),
    db.collection("events").distinct("channel"),
  ]);
  const names = [...clientChannels, ...eventChannels];
  for (const name of names) {
    await ensureChannel(name);
  }
}

async function dedupeChannels() {
  const all = await collection.find().sort({ exactDate: 1 }).toArray();
  const seen = new Set();
  const toDelete = [];
  for (const channel of all) {
    const key = normalizeChannelName(channel.name).toLowerCase();
    if (!key) {
      toDelete.push(channel._id);
      continue;
    }
    if (seen.has(key)) {
      toDelete.push(channel._id);
    } else {
      seen.add(key);
    }
  }
  if (toDelete.length > 0) {
    await collection.deleteMany({ _id: { $in: toDelete } });
    console.log(`Removed ${toDelete.length} duplicate channels`);
  }
}

async function ensureChannels() {
  await dedupeChannels();
  await seedMissingDefaults();
  await syncDistinctFromRecords();
}

let ensurePromise = null;
function ensureChannelsOnce() {
  if (!ensurePromise) {
    ensurePromise = ensureChannels().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

async function listChannelNames() {
  await ensureChannelsOnce();
  const channels = await collection.find().sort({ exactDate: 1 }).toArray();
  const seen = new Set();
  const names = [];
  for (const channel of channels) {
    const name = normalizeChannelName(channel.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  names.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  return names;
}

module.exports = {
  DEFAULT_CHANNELS,
  collection,
  ensureChannel,
  ensureChannelsOnce,
  listChannelNames,
  normalizeChannelName,
};
