'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  checkAdmin,
  getRestorePointsStatus,
  getSystemDiagnostics,
  RestorePointsStatus,
  runSystemAudit,
  SystemDiagnostics,
  SystemAuditResult,
} from './api';
import { useSettings } from './SettingsContext';

export type HardwareTier = 'low' | 'mid' | 'high';

export interface PendingProtectedAction {
  actionName: string;
  onProceed: () => Promise<void> | void;
}

interface HardwareContextType {
  diagnostics: SystemDiagnostics | null;
  loadingDiagnostics: boolean;
  loading: boolean;
  errorDiagnostics: string | null;
  refreshDiagnostics: () => Promise<void>;
  audit: SystemAuditResult | null;
  loadingAudit: boolean;
  refreshAudit: () => Promise<void>;
  hardwareTier: HardwareTier;
  isAdmin: boolean;
  restoreStatus: RestorePointsStatus | null;
  loadingRestoreStatus: boolean;
  refreshRestoreStatus: () => Promise<void>;
  pendingProtectedAction: PendingProtectedAction | null;
  requireRestorePoint: (
    actionName: string,
    riskOrProceed: 'low' | 'medium' | 'high' | string | (() => Promise<void> | void),
    maybeOnProceed?: () => Promise<void> | void
  ) => void;
  dismissRestoreModal: () => void;
  clearPendingProtectedAction: () => void;
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
  hardwareTier: 'mid',
  isAdmin: false,
  restoreStatus: null,
  loadingRestoreStatus: true,
  refreshRestoreStatus: async () => {},
  pendingProtectedAction: null,
  requireRestorePoint: (_name, riskOrProceed, maybeOnProceed) => {
    const fn = typeof riskOrProceed === 'function' ? riskOrProceed : maybeOnProceed;
    if (fn) void fn();
  },
  dismissRestoreModal: () => {},
  clearPendingProtectedAction: () => {},
});

export function computeHardwareTierFromDiagnostics(data: SystemDiagnostics | null): HardwareTier {
  if (!data) return 'mid';
  if (data.hardwareTier === 'low' || data.hardwareTier === 'mid' || data.hardwareTier === 'high') {
    return data.hardwareTier;
  }
  const ramGb = data.memory?.totalGb ?? 8;
  const physicalCores = data.cpu?.physicalCores ?? 4;
  const isDischarging = Boolean(data.isOnBattery || (data.battery && !data.battery.isCharging && data.battery.status === 'Discharging'));
  const gpus = data.allGpus?.length ? data.allGpus : data.gpu ? [data.gpu] : [];
  const hasCapableGpu = gpus.some((g) => {
    const n = (g.name || '').toLowerCase();
    return (
      n.includes('rtx') ||
      n.includes('gtx') ||
      n.includes('radeon rx') ||
      n.includes('arc ') ||
      (g.vramMb || 0) >= 2048
    );
  });

  if (ramGb < 8 || physicalCores < 4 || !hasCapableGpu || isDischarging) {
    return 'low';
  }
  if (physicalCores >= 6 && ramGb >= 16 && hasCapableGpu) {
    return 'high';
  }
  return 'mid';
}

export function HardwareProvider({ children }: { children: React.ReactNode }) {
  const { setAutoPerformanceMode } = useSettings();
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState<boolean>(true);
  const [errorDiagnostics, setErrorDiagnostics] = useState<string | null>(null);

  const [audit, setAudit] = useState<SystemAuditResult | null>(null);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(true);

  const [hardwareTier, setHardwareTier] = useState<HardwareTier>('mid');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [restoreStatus, setRestoreStatus] = useState<RestorePointsStatus | null>(null);
  const [loadingRestoreStatus, setLoadingRestoreStatus] = useState<boolean>(true);
  const [pendingProtectedAction, setPendingProtectedAction] = useState<PendingProtectedAction | null>(null);

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
        const tier = computeHardwareTierFromDiagnostics(data);
        setHardwareTier(tier);
        setAutoPerformanceMode(tier === 'low');
      }
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Error reading hardware.';
      setErrorDiagnostics(msg);
    } finally {
      setLoadingDiagnostics(false);
    }
  }, [setAutoPerformanceMode]);

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

  const refreshRestoreStatus = useCallback(async () => {
    setLoadingRestoreStatus(true);
    try {
      const [admRes, rpRes] = await Promise.all([
        checkAdmin(),
        getRestorePointsStatus(),
      ]);
      setIsAdmin(Boolean(admRes));
      if (rpRes.success && rpRes.data) {
        setRestoreStatus(rpRes.data);
      }
    } catch (err) {
      console.error('Restore point status error:', err);
    } finally {
      setLoadingRestoreStatus(false);
    }
  }, []);

  const requireRestorePoint = useCallback(
    (
      actionName: string,
      riskOrProceed: 'low' | 'medium' | 'high' | string | (() => Promise<void> | void),
      maybeOnProceed?: () => Promise<void> | void
    ) => {
      const onProceed = typeof riskOrProceed === 'function' ? riskOrProceed : maybeOnProceed;
      if (!onProceed) return;
      if (restoreStatus?.hasRecentRestorePoint) {
        void onProceed();
        return;
      }
      setPendingProtectedAction({ actionName, onProceed });
    },
    [restoreStatus]
  );

  const dismissRestoreModal = useCallback(() => {
    setPendingProtectedAction(null);
  }, []);

  const clearPendingProtectedAction = useCallback(() => {
    setPendingProtectedAction(null);
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    void refreshDiagnostics();
    void refreshAudit();
    void refreshRestoreStatus();
  }, [refreshDiagnostics, refreshAudit, refreshRestoreStatus]);

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
        hardwareTier,
        isAdmin,
        restoreStatus,
        loadingRestoreStatus,
        refreshRestoreStatus,
        pendingProtectedAction,
        requireRestorePoint,
        dismissRestoreModal,
        clearPendingProtectedAction,
      }}
    >
      {children}
    </HardwareContext.Provider>
  );
}

export function useHardware() {
  return useContext(HardwareContext);
}
