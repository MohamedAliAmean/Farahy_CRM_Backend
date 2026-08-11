/**
 * Roles + overrides permission model for CRM users.
 * Existing production accounts are seeded to match previous hardcoded access.
 */

const ROLE_TEMPLATES = {
  super_admin: {
    pages: {
      clients: true,
      suppliers: true,
      events: true,
      analysis: true,
      employees: true,
      logs: true,
      users: true,
    },
    actions: {
      create: true,
      edit: true,
      delete: true,
      manageUsers: true,
    },
    dataScope: {
      mode: "all",
      hideBudgets: false,
      hideCommissions: false,
      hidePayments: false,
    },
  },
  admin: {
    pages: {
      clients: true,
      suppliers: true,
      events: true,
      analysis: true,
      employees: true,
      logs: false,
      users: false,
    },
    actions: {
      create: true,
      edit: true,
      delete: false,
      manageUsers: false,
    },
    dataScope: {
      mode: "all",
      hideBudgets: false,
      hideCommissions: false,
      hidePayments: false,
    },
  },
  accountant: {
    pages: {
      clients: true,
      suppliers: true,
      events: true,
      analysis: true,
      employees: true,
      logs: false,
      users: false,
    },
    actions: {
      create: false,
      edit: false,
      delete: false,
      manageUsers: false,
    },
    dataScope: {
      mode: "all",
      hideBudgets: false,
      hideCommissions: false,
      hidePayments: false,
    },
  },
  genie: {
    pages: {
      clients: true,
      suppliers: false,
      events: true,
      analysis: false,
      employees: false,
      logs: false,
      users: false,
    },
    actions: {
      create: true,
      edit: true,
      delete: false,
      manageUsers: false,
    },
    dataScope: {
      mode: "assigned_only",
      hideBudgets: false,
      hideCommissions: false,
      hidePayments: false,
    },
  },
  viewer: {
    pages: {
      clients: true,
      suppliers: true,
      events: true,
      analysis: true,
      employees: false,
      logs: false,
      users: false,
    },
    actions: {
      create: false,
      edit: false,
      delete: false,
      manageUsers: false,
    },
    dataScope: {
      mode: "all",
      hideBudgets: false,
      hideCommissions: false,
      hidePayments: false,
    },
  },
};

/** Exact previous access map for the 7 live Firebase accounts. */
const LEGACY_SEED = [
  {
    email: "admin@farahy.net",
    displayName: "Admin",
    role: "super_admin",
  },
  {
    email: "nadine@farahy.net",
    displayName: "Nadine",
    role: "super_admin",
  },
  {
    email: "aleya.shaalan@farahy.net",
    displayName: "Aleya",
    role: "super_admin",
  },
  {
    email: "marwa.elsanhory@farahy.net",
    displayName: "Marwa",
    role: "super_admin",
  },
  {
    email: "ayahassan@farahy.net",
    displayName: "Aya",
    role: "admin",
  },
  {
    email: "amira.rashad@farahy.net",
    displayName: "Amira",
    role: "admin",
  },
  {
    email: "accountant@farahy.net",
    displayName: "Accountant",
    role: "accountant",
  },
];

const LEGACY_EMAILS = LEGACY_SEED.map((u) => u.email);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, overrides) {
  const out = deepClone(base);
  if (!isObject(overrides)) return out;
  for (const key of Object.keys(overrides)) {
    if (isObject(out[key]) && isObject(overrides[key])) {
      out[key] = deepMerge(out[key], overrides[key]);
    } else if (overrides[key] !== undefined) {
      out[key] = overrides[key];
    }
  }
  return out;
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function roleTemplate(role) {
  if (!ROLE_TEMPLATES[role]) return null;
  return deepClone(ROLE_TEMPLATES[role]);
}

function resolvePermissions(userDoc) {
  const role = userDoc?.role || "viewer";
  const base = roleTemplate(role) || roleTemplate("viewer");
  const overrides = userDoc?.overrides || {};
  return deepMerge(base, overrides);
}

function publicUser(userDoc) {
  if (!userDoc) return null;
  const permissions = resolvePermissions(userDoc);
  return {
    id: userDoc._id,
    email: userDoc.email,
    displayName: userDoc.displayName || "",
    role: userDoc.role,
    status: userDoc.status,
    overrides: userDoc.overrides || {},
    permissions,
    createdAt: userDoc.createdAt || null,
    updatedAt: userDoc.updatedAt || null,
  };
}

module.exports = {
  ROLE_TEMPLATES,
  LEGACY_SEED,
  LEGACY_EMAILS,
  deepClone,
  deepMerge,
  normalizeEmail,
  roleTemplate,
  resolvePermissions,
  publicUser,
};
