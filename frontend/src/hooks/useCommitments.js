import { useCallback, useEffect, useMemo, useState } from "react";
import { commitmentsApi } from "../api/commitments.api";

// ----------------------------------------------------------------------
// Memora — useCommitments
// Fetches the commitment list + summary counts, and applies mutations
// (keep/snooze/dismiss) optimistically so the UI reacts instantly while
// the request is in flight, rolling back on failure.
//
// Usage:
//   const { items, summary, isLoading, markKept, snooze, dismiss } =
//     useCommitments({ status: "all", q: searchQuery });
// ----------------------------------------------------------------------

export function useCommitments({ status = "all", q = "" } = {}) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ overdue: 0, today: 0, upcoming: 0, keptThisMonth: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [{ items: fetched }, summaryData] = await Promise.all([
        commitmentsApi.list({ status, q }),
        commitmentsApi.getSummary(),
      ]);
      setItems(fetched);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const patchLocal = (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const markKept = useCallback(async (id) => {
    const previous = items.find((it) => it.id === id);
    patchLocal(id, { urgency: "kept", group: "Kept", due: "Kept just now" });
    try {
      const updated = await commitmentsApi.markKept(id);
      patchLocal(id, updated);
    } catch (err) {
      if (previous) patchLocal(id, previous); // rollback
      setError(err.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const snooze = useCallback(async (id, dueDate) => {
    try {
      const updated = await commitmentsApi.snooze(id, dueDate);
      patchLocal(id, updated);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const dismiss = useCallback(async (id, reason) => {
    const previous = items;
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      await commitmentsApi.dismiss(id, reason);
    } catch (err) {
      setItems(previous); // rollback
      setError(err.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const counts = useMemo(
    () => ({
      all: items.length,
      overdue: items.filter((i) => i.urgency === "overdue").length,
      today: items.filter((i) => i.urgency === "today").length,
      upcoming: items.filter((i) => i.urgency === "upcoming").length,
      kept: items.filter((i) => i.urgency === "kept").length,
    }),
    [items]
  );

  return {
    items,
    summary,
    counts,
    isLoading,
    error,
    refetch: fetchAll,
    markKept,
    snooze,
    dismiss,
  };
}