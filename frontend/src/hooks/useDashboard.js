// src/hooks/useDashboard.js
// Hook que centraliza la carga del dashboard + entries para un mes/año determinados,
// y expone la acción toggle para marcar/desmarcar días en el calendario.

import { useEffect, useState, useCallback, useRef } from 'react';
import { getDashboard, getEntries, upsertEntry } from '../api/client';

export function useDashboard(month, year) {
  const [data, setData] = useState({ dashboard: null, entries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadedKeyRef = useRef(null);
  const load = useCallback(async () => {
    // Solo la primera carga (o cambio de mes/año) muestra el estado de carga;
    // las recargas tras un toggle son "silenciosas" para no desmontar el
    // calendario (rompería la animación de confeti y provoca parpadeo).
    const key = `${year}-${month}`;
    const isBackground = loadedKeyRef.current === key;
    setLoading((prev) => (isBackground ? prev : true));
    setError(null);
    try {
      const [dashboard, entriesRes] = await Promise.all([
        getDashboard(month, year),
        getEntries(month, year),
      ]);
      setData({ dashboard, entries: entriesRes.data });
      loadedKeyRef.current = key;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  /** Mapa "habitId:date" -> completed para consultas rápidas del calendario. */
  const entryMap = data.entries.reduce((acc, e) => {
    const key = `${e.habitId?._id ?? e.habitId}:${e.date.slice(0, 10)}`;
    acc[key] = e.completed;
    return acc;
  }, {});

  /**
   * Invierte el estado de un hábito en una fecha, persiste con upsert y recarga todo.
   * @returns {Promise<boolean>} el nuevo valor (completed) aplicado.
   */
  const toggle = useCallback(
    async (habitId, date, currentCompleted) => {
      const next = !currentCompleted;
      try {
        await upsertEntry(habitId, date, next);
        await load();
        return next;
      } catch (e) {
        setError(e.message);
        return currentCompleted;
      }
    },
    [load]
  );

  return { data, loading, error, entryMap, toggle, reload: load };
}