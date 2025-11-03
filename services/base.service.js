const DEFAULT_FIELDS = ['username', 'email']; // allowlist

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a Mongo query with dynamic fields.
 * Supports:
 *   ?search=alice            -> searches DEFAULT_FIELDS with regex (i)
 *   ?search=alice&fields=username,email
 *   ?orderByField=username&orderBy=asc
 *   ?page=2&limit=20
 */
function buildDynamicSearch(req, {
  allowlist = DEFAULT_FIELDS,
  caseInsensitive = true,
  defaultSort = { createdAt: -1 }
} = {}) {
  const {
    search,
    fields,
    orderByField,
    orderBy,
    page = '1',
    limit = '10'
  } = req.query;

  // 1) Fields to search (intersection with allowlist)
  const wanted = (fields ? String(fields).split(',') : allowlist)
    .map(s => s.trim())
    .filter(f => allowlist.includes(f));

  // 2) Search conditions
  const or = [];
  if (search && wanted.length) {
    const raw = String(search).trim();

    // normalize tel digits once (e.g., "084-123-4567" -> "0841234567")
    const digits = raw.replace(/\D+/g, '');

    for (const f of wanted) {
      if (f === 'tel') {
        // try exact digits and partial regex
        if (digits) {
          or.push({ [f]: new RegExp(escapeRegex(digits), caseInsensitive ? 'i' : undefined) });
        } else {
          or.push({ [f]: new RegExp(escapeRegex(raw), caseInsensitive ? 'i' : undefined) });
        }
      } else {
        // generic case-insensitive substring
        or.push({ [f]: new RegExp(escapeRegex(raw), caseInsensitive ? 'i' : undefined) });
      }
    }
  }

  const query = or.length ? { $or: or } : {};

  // 3) Sort (whitelist to prevent unsafe fields)
  const sort = { ...defaultSort };
  if (orderByField && allowlist.concat(['createdAt', '_id']).includes(orderByField)) {
    sort[orderByField] = String(orderBy).toLowerCase() === 'desc' ? -1 : 1;
  }

  // 4) Pagination
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (pg - 1) * lim;

  return { query, sort, limit: lim, skip };
}

module.exports = { buildDynamicSearch };
