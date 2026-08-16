import { useCallback, useEffect, useMemo, useState } from "react";
import { connectionsApi } from "../api/connections.api";

// ----------------------------------------------------------------------
// Memora — useConnections
// Loads the connections list and splits it into connected/available for
// ConnectionsList.jsx. Owns the "which provider is mid-OAuth-flow" state
// so ConnectionCard can show a spinner on the right button.
// ----------------------------------------------------------------------

export function useConnections() {
  const [all, setAll] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectingId, setConnectingId] = useState(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const list = await connectionsApi.list();
      setAll(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const connected = useMemo(() => all.filter((c) => Boolean(c.account)), [all]);
  const available = useMemo(() => all.filter((c) => !c.account), [all]);

  /** Kicks off the OAuth redirect. Page navigates away, so no need to reset connectingId here. */
  const connect = useCallback(async (id) => {
    setConnectingId(id);
    setError("");
    try {
      const url = await connectionsApi.getAuthUrl(id);
      window.location.href = url;
    } catch (err) {
      setConnectingId(null);
      setError(err.message);
    }
  }, []);

  const syncNow = useCallback(async (connectionId) => {
    setAll((prev) => prev.map((c) => (c.id === connectionId ? { ...c, status: "syncing" } : c)));
    try {
      const updated = await connectionsApi.syncNow(connectionId);
      setAll((prev) => prev.map((c) => (c.id === connectionId ? updated : c)));
    } catch (err) {
      setError(err.message);
      await fetchAll(); // reconcile with server state on failure
    }
  }, [fetchAll]);

  const disconnect = useCallback(async (connectionId) => {
    const previous = all;
    setAll((prev) => prev.filter((c) => c.id !== connectionId));
    try {
      await connectionsApi.disconnect(connectionId);
    } catch (err) {
      setAll(previous); // rollback
      setError(err.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  return {
    connected,
    available,
    isLoading,
    error,
    connectingId,
    connect,
    syncNow,
    disconnect,
    refetch: fetchAll,
  };
}