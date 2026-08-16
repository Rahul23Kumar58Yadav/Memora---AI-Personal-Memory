import { useCallback, useEffect, useState } from "react";
import { digestApi } from "../api/digest.api";

// ----------------------------------------------------------------------
// Memora — useDigest
// Loads digest history + the latest digest, and manages digest settings
// (used by DigestSettings.jsx). Settings updates are optimistic with
// rollback on failure, same pattern as useCommitments.
// ----------------------------------------------------------------------

export function useDigest() {
  const [digests, setDigests] = useState([]);
  const [latest, setLatest] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [{ digests: history }, latestDigest, currentSettings] = await Promise.all([
        digestApi.list(),
        digestApi.getLatest().catch(() => null), // no digest sent yet is not an error
        digestApi.getSettings(),
      ]);
      setDigests(history);
      setLatest(latestDigest);
      setSettings(currentSettings);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateSettings = useCallback(
    async (patch) => {
      const previous = settings;
      const optimistic = { ...settings, ...patch };
      setSettings(optimistic);
      try {
        const saved = await digestApi.updateSettings(optimistic);
        setSettings(saved);
      } catch (err) {
        setSettings(previous); // rollback
        setError(err.message);
      }
    },
    [settings]
  );

  const sendNow = useCallback(async () => {
    try {
      const digest = await digestApi.sendNow();
      setLatest(digest);
      setDigests((prev) => [digest, ...prev]);
      return digest;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    digests,
    latest,
    settings,
    isLoading,
    error,
    updateSettings,
    sendNow,
    refetch: fetchAll,
  };
}