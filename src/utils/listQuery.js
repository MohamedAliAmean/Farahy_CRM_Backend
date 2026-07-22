/**
 * Shared helpers for list fetches: lightweight projections + optional pagination.
 */

const CLIENT_LIST_PROJECTION = {
  notes: 0,
  reminders: 0,
};

const EVENT_LIST_PROJECTION = {
  notes: 0,
  reminders: 0,
  payments: 0,
};

const SUPPLIER_LIST_PROJECTION = {
  notes: 0,
  attachments: 0,
};

function parsePagination(body = {}) {
  const page = Math.max(1, parseInt(body.page, 10) || 0);
  const limitRaw = parseInt(body.limit, 10);
  const limit = Math.min(200, Math.max(1, limitRaw || 0));
  const paginate = Boolean(body.page) || Boolean(body.limit);
  return {
    paginate,
    page: page || 1,
    limit: limitRaw ? limit : 50,
    skip: ((page || 1) - 1) * (limitRaw ? limit : 50),
  };
}

function wantsLightweight(body = {}) {
  // Default lightweight for collection lists; full docs when id is set or lightweight:false
  if (body.lightweight === false || body.lightweight === "false") {
    return false;
  }
  if (body.id) {
    return false;
  }
  return true;
}

module.exports = {
  CLIENT_LIST_PROJECTION,
  EVENT_LIST_PROJECTION,
  SUPPLIER_LIST_PROJECTION,
  parsePagination,
  wantsLightweight,
};
