const crypto = require("crypto");
const { db } = require("./db");

const collection = db.collection("auth_codes");

const CODE_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes after verify

function pepper() {
  return process.env.OTP_PEPPER || "farahy-crm-otp";
}

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(`${value}:${pepper()}`)
    .digest("hex");
}

function generateCode() {
  return String(crypto.randomInt(0, 1e10)).padStart(10, "0");
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function issueCode(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const existing = await collection.findOne({ email: normalized });
  const now = Date.now();
  if (existing?.lastSentAt) {
    const elapsed = now - new Date(existing.lastSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      const err = new Error(`Please wait ${waitSec}s before requesting another code`);
      err.code = "COOLDOWN";
      throw err;
    }
  }

  const code = generateCode();
  const doc = {
    email: normalized,
    codeHash: hashValue(code),
    expiresAt: new Date(now + CODE_TTL_MS),
    attempts: 0,
    lastSentAt: new Date(now),
    createdAt: existing?.createdAt || new Date(now),
    updatedAt: new Date(now),
    sessionTokenHash: null,
    sessionExpiresAt: null,
  };

  await collection.updateOne(
    { email: normalized },
    { $set: doc },
    { upsert: true }
  );

  return { code, expiresAt: doc.expiresAt };
}

async function verifyCode(email, code) {
  const normalized = String(email || "").trim().toLowerCase();
  const rawCode = String(code || "").trim();
  const doc = await collection.findOne({ email: normalized });
  if (!doc || !doc.codeHash) {
    const err = new Error("Invalid or expired code");
    err.code = "INVALID";
    throw err;
  }
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
    const err = new Error("Code has expired. Please request a new one");
    err.code = "EXPIRED";
    throw err;
  }
  if ((doc.attempts || 0) >= MAX_ATTEMPTS) {
    const err = new Error("Too many attempts. Please request a new code");
    err.code = "LOCKED";
    throw err;
  }
  if (hashValue(rawCode) !== doc.codeHash) {
    await collection.updateOne(
      { email: normalized },
      { $inc: { attempts: 1 }, $set: { updatedAt: new Date() } }
    );
    const err = new Error("Invalid or expired code");
    err.code = "INVALID";
    throw err;
  }

  const sessionToken = generateSessionToken();
  const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await collection.updateOne(
    { email: normalized },
    {
      $set: {
        codeHash: null,
        attempts: 0,
        sessionTokenHash: hashValue(sessionToken),
        sessionExpiresAt,
        updatedAt: new Date(),
      },
    }
  );
  return { sessionToken, sessionExpiresAt };
}

async function consumeSession(email, sessionToken) {
  const normalized = String(email || "").trim().toLowerCase();
  const token = String(sessionToken || "").trim();
  const doc = await collection.findOne({ email: normalized });
  if (!doc?.sessionTokenHash || !doc.sessionExpiresAt) {
    const err = new Error("Session expired. Please verify the code again");
    err.code = "SESSION";
    throw err;
  }
  if (new Date(doc.sessionExpiresAt).getTime() < Date.now()) {
    const err = new Error("Session expired. Please verify the code again");
    err.code = "SESSION";
    throw err;
  }
  if (hashValue(token) !== doc.sessionTokenHash) {
    const err = new Error("Invalid session. Please verify the code again");
    err.code = "SESSION";
    throw err;
  }
  await collection.deleteOne({ email: normalized });
  return true;
}

module.exports = {
  issueCode,
  verifyCode,
  consumeSession,
  CODE_TTL_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
};
