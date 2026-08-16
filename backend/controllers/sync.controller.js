import ConnectedAccount from "../models/ConnectedAccount.js";
import { enqueueSync } from "../jobs/syncInbox.job.js";

// ----------------------------------------------------------------------
// Memora Backend — sync.controller
// Maps to sync.routes.js — cross-account operations only. Per-connection
// sync lives in connections.controller.js (syncNow) since it belongs
// naturally with the rest of that resource's CRUD.
// ----------------------------------------------------------------------

// ---- POST /sync/all -----------------------------------------------------------
export async function syncAll(req, res, next) {
  try {
    const accounts = await ConnectedAccount.find({ userId: req.userId, status: { $ne: "disconnected" } });

    if (accounts.length === 0) {
      return res.status(200).json({ message: "Nothing connected yet — nothing to sync.", triggered: 0 });
    }

    await ConnectedAccount.updateMany(
      { _id: { $in: accounts.map((a) => a._id) } },
      { status: "syncing" }
    );

    await Promise.all(
      accounts.map((account) =>
        enqueueSync({ connectedAccountId: account.id, userId: req.userId, isInitial: false })
      )
    );

    return res.json({ message: `Sync started for ${accounts.length} connection(s).`, triggered: accounts.length });
  } catch (err) {
    next(err);
  }
}

// ---- GET /sync/status -----------------------------------------------------------
export async function getStatus(req, res, next) {
  try {
    const accounts = await ConnectedAccount.find({
      userId: req.userId,
      status: { $ne: "disconnected" },
    }).select("provider status lastSyncedAt lastSyncError");

    const isAnySyncing = accounts.some((a) => a.status === "syncing");

    return res.json({
      isSyncing: isAnySyncing,
      connections: accounts.map((a) => ({
        provider: a.provider,
        status: a.status,
        lastSyncedAt: a.lastSyncedAt,
        error: a.lastSyncError,
      })),
    });
  } catch (err) {
    next(err);
  }
}