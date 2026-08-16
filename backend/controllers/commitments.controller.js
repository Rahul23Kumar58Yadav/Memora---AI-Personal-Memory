import Commitment from "../models/Commitment.js";

// ----------------------------------------------------------------------
// Memora Backend — commitments.controller
// Maps to commitments.routes.js. Unlike chat/connections, this one is
// mostly direct model operations — Commitment.js's urgency/group
// virtuals (see the model) do the heavy lifting, so this controller
// stays thin. The one non-obvious piece is `list`'s status filter,
// which has to map UI filter keys ("overdue"/"today"/etc.) to real
// Mongo queries since urgency is a virtual, not a stored field.
// ----------------------------------------------------------------------

const PAGE_SIZE = 30;

/**
 * Builds a Mongo filter for a UI status key. Urgency is a virtual
 * (computed from dueDate/status at read time — see Commitment.js), so
 * "overdue"/"today"/"upcoming" can't be queried directly; this
 * reconstructs the equivalent date range instead.
 */
function urgencyFilter(status) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  switch (status) {
    case "overdue":
      return { status: "active", dueDate: { $lt: now, $ne: null } };
    case "today":
      return { status: "active", dueDate: { $gte: startOfToday, $lt: startOfTomorrow } };
    case "upcoming":
      return { status: "active", dueDate: { $gte: startOfTomorrow } };
    case "kept":
      return { status: "kept" };
    case "stale":
      return { status: "active", dueDate: null };
    case "all":
    default:
      return { status: { $ne: "dismissed" } };
  }
}

// ---- GET /commitments ---------------------------------------------------------
export async function list(req, res, next) {
  try {
    const { status = "all", q, cursor, limit = PAGE_SIZE } = req.query;

    const filter = { userId: req.userId, ...urgencyFilter(status) };
    if (q?.trim()) {
      filter.$text = { $search: q.trim() };
    }
    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const items = await Commitment.find(filter)
      .sort({ _id: -1 })
      .limit(Number(limit) + 1);

    const hasMore = items.length > Number(limit);
    const page = hasMore ? items.slice(0, -1) : items;

    return res.json({
      items: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
}

// ---- GET /commitments/summary --------------------------------------------------
export async function getSummary(req, res, next) {
  try {
    const userId = req.userId;
    const [overdue, today, upcoming, keptThisMonth] = await Promise.all([
      Commitment.countDocuments({ userId, ...urgencyFilter("overdue") }),
      Commitment.countDocuments({ userId, ...urgencyFilter("today") }),
      Commitment.countDocuments({ userId, ...urgencyFilter("upcoming") }),
      Commitment.countDocuments({
        userId,
        status: "kept",
        keptAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
    ]);

    return res.json({ overdue, today, upcoming, keptThisMonth });
  } catch (err) {
    next(err);
  }
}

// ---- GET /commitments/:id ------------------------------------------------------
export async function getById(req, res, next) {
  try {
    const commitment = await Commitment.findOne({ _id: req.params.id, userId: req.userId });
    if (!commitment) {
      return res.status(404).json({ message: "Commitment not found." });
    }
    return res.json({ commitment });
  } catch (err) {
    next(err);
  }
}

// ---- PATCH /commitments/:id ------------------------------------------------------
export async function update(req, res, next) {
  try {
    const { text, dueDate } = req.body;
    const updates = {};
    if (text !== undefined) updates.text = text;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

    const commitment = await Commitment.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!commitment) {
      return res.status(404).json({ message: "Commitment not found." });
    }
    return res.json({ commitment });
  } catch (err) {
    next(err);
  }
}

// ---- PATCH /commitments/:id/keep --------------------------------------------------
export async function markKept(req, res, next) {
  try {
    const commitment = await Commitment.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status: "kept", keptAt: new Date() },
      { new: true }
    );
    if (!commitment) {
      return res.status(404).json({ message: "Commitment not found." });
    }
    return res.json({ commitment });
  } catch (err) {
    next(err);
  }
}

// ---- PATCH /commitments/:id/snooze --------------------------------------------------
export async function snooze(req, res, next) {
  try {
    const { dueDate } = req.body;
    if (!dueDate) {
      return res.status(400).json({ message: "A new due date is required to snooze." });
    }

    const commitment = await Commitment.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { dueDate: new Date(dueDate), snoozedUntil: new Date(dueDate) },
      { new: true, runValidators: true }
    );
    if (!commitment) {
      return res.status(404).json({ message: "Commitment not found." });
    }
    return res.json({ commitment });
  } catch (err) {
    next(err);
  }
}

// ---- PATCH /commitments/:id/dismiss --------------------------------------------------
// User correction: "this wasn't actually a commitment." Stored (not
// hard-deleted) with a reason — this is the training signal for
// improving commitmentExtractor.js's precision over time.
export async function dismiss(req, res, next) {
  try {
    const { reason } = req.body;

    const commitment = await Commitment.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status: "dismissed", dismissedAt: new Date(), dismissReason: reason || null },
      { new: true }
    );
    if (!commitment) {
      return res.status(404).json({ message: "Commitment not found." });
    }

    // TODO: pipe {text, sourceExcerpt, reason} into an extractor
    // feedback log for periodic prompt/threshold tuning.

    return res.json({ message: "Dismissed." });
  } catch (err) {
    next(err);
  }
}

// ---- DELETE /commitments/:id ------------------------------------------------------
export async function remove(req, res, next) {
  try {
    const result = await Commitment.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Commitment not found." });
    }
    return res.json({ message: "Deleted." });
  } catch (err) {
    next(err);
  }
}