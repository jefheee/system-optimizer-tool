'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  getSystemDiagnostics,
  runSystemAudit,
  SystemDiagnostics,
  SystemAuditResult,
} from './api';

interface HardwareContextType {
  diagnostics: SystemDiagnostics | null;
  loadingDiagnostics: boolean;
  loading: boolean;
  errorDiagnostics: string | null;
  refreshDiagnostics: () => Promise<void>;
  audit: SystemAuditResult | null;
  loadingAudit: boolean;
  refreshAudit: () => Promise<void>;
}

const HardwareContext = createContext<HardwareContextType>({
  diagnostics: null,
  loadingDiagnostics: true,
  loading: true,
  errorDiagnostics: null,
  refreshDiagnostics: async () => {},
  audit: null,
  loadingAudit: true,
  refreshAudit: async () => {},
});

export function HardwareProvider({ children }: { children: React.ReactNode }) {
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState<boolean>(true);
  const [errorDiagnostics, setErrorDiagnostics] = useState<string | null>(null);

  const [audit, setAudit] = useState<SystemAuditResult | null>(null);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(true);
  const hasFetchedRef = useRef(false);

  const refreshDiagnostics = useCallback(async () => {
    setLoadingDiagnostics(true);
    setErrorDiagnostics(null);
    try {
      const data = await getSystemDiagnostics();
      if (data.status === 'Error' && !data.cpu) {
        setErrorDiagnostics(data.message || 'Failed to read hardware diagnostics.');
      } else {
        setDiagnostics(data);
      }
    } catch (err: any) {
      setErrorDiagnostics(typeof err === 'string' ? err : err?.message || 'Error reading hardware.');
    } finally {
      setLoadingDiagnostics(false);
    }
  }, []);

  const refreshAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await runSystemAudit();
      if (res.success && res.data) {
        setAudit(res.data);
      }
    } catch (err) {
      console.error('Audit error:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  // Pre-load once in background when app opens (Zero Refresh on tab switch)
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    refreshDiagnostics();
    refreshAudit();
  }, [refreshDiagnostics, refreshAudit]);

  return (
    <HardwareContext.Provider
      value={{
        diagnostics,
        loadingDiagnostics,
        loading: loadingDiagnostics,
        errorDiagnostics,
        refreshDiagnostics,
        audit,
        loadingAudit,
        refreshAudit,
      }}
    >
      {children}
    </HardwareContext.Provider>
  );
}

export function useHardware() {
  return useContext(HardwareContext);
}
