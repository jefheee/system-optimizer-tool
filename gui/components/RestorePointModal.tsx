'use client';

import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Loader2, X, Lock, History, ArrowRight } from 'lucide-react';
import { useHardware } from '../lib/HardwareContext';
import { createRestorePoint, restartAsAdmin } from '../lib/api';

interface RestorePointModalProps {
  manualOpen?: boolean;
  onCloseManual?: () => void;
}

export default function RestorePointModal({ manualOpen = false, onCloseManual }: RestorePointModalProps) {
  const {
    isAdmin,
    restoreStatus,
    refreshRestoreStatus,
    pendingProtectedAction,
    dismissRestoreModal,
    clearPendingProtectedAction,
  } = useHardware();

  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isVisible = Boolean(pendingProtectedAction) || manualOpen;
  if (!isVisible) return null;

  const closeAll = () => {
    if (creating) return;
    setErrorMsg(null);
    setStatusMsg('');
    setProgress(0);
    if (pendingProtectedAction) dismissRestoreModal();
    if (manualOpen && onCloseManual) onCloseManual();
  };

  const handleCreateAndContinue = async () => {
    setErrorMsg(null);
    setCreating(true);
    setProgress(25);
    setStatusMsg('Destravando limite de 24h no Registro e habilitando Proteção do Sistema...');

    try {
      const label = pendingProtectedAction
        ? `SYS OPTIMIZER - Antes de ${pendingProtectedAction.actionName}`
        : `SYS OPTIMIZER - Checkpoint Manual`;
      setProgress(55);
      setStatusMsg('Gravando Ponto de Restauração VSS no Windows...');
      const res = await createRestorePoint(label);
      if (!res.success) {
        throw new Error(res.message || 'Falha ao criar Ponto de Restauração.');
      }
      setProgress(90);
      setStatusMsg('Atualizando inventário de Pontos de Restauração...');
      await refreshRestoreStatus();
      setProgress(100);
      setStatusMsg('Ponto de Restauração criado com sucesso!');

      const actionToRun = pendingProtectedAction?.onProceed;
      clearPendingProtectedAction();
      if (manualOpen && onCloseManual) onCloseManual();

      if (actionToRun) {
        await actionToRun();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || 'Não foi possível criar o Ponto de Restauração.');
    } finally {
      setCreating(false);
    }
  };

  const handleRestartAdmin = async () => {
    setErrorMsg(null);
    try {
      await restartAsAdmin();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const recentPoints = restoreStatus?.points?.slice(0, 4) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#111318] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-800 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              {restoreStatus?.hasRecentRestorePoint ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Proteção Obrigatória — Ponto de Restauração do Sistema
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                RestorePointGuard • Segurança antes de alterar Registro, Serviços ou Presets
              </p>
            </div>
          </div>
          <button
            onClick={closeAll}
            disabled={creating}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {pendingProtectedAction && (
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
              Você solicitou <span className="font-semibold text-sky-400">{pendingProtectedAction.actionName}</span>, mas não foi detectado nenhum Ponto de Restauração criado nas últimas 24 horas. Por segurança máxima, crie um checkpoint antes de continuar.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Privilégios Admin</span>
              <span className={`font-semibold ${isAdmin ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isAdmin ? 'Elevado (Ativo)' : 'Usuário Padrão'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Trava 24h Windows</span>
              <span className="font-semibold text-sky-400">
                {restoreStatus?.frequencyUnlocked ? 'Destravada (=0)' : 'Será destravada'}
              </span>
            </div>
          </div>

          {creating && (
            <div className="space-y-2 p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
              <div className="flex items-center justify-between text-xs text-sky-300 font-medium">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {statusMsg}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {recentPoints.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <History className="w-3.5 h-3.5" />
                Pontos de Restauração Detectados ({restoreStatus?.points.length ?? 0})
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {recentPoints.map((pt) => (
                  <div
                    key={`${pt.sequenceNumber}-${pt.creationTime}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs"
                  >
                    <div className="truncate pr-3">
                      <span className="text-zinc-500 font-mono mr-2">#{pt.sequenceNumber}</span>
                      <span className="text-zinc-200 font-medium">{pt.description}</span>
                    </div>
                    <span className="text-zinc-400 font-mono shrink-0 text-[11px]">{pt.creationTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-950/60">
          <button
            onClick={closeAll}
            disabled={creating}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {!isAdmin ? (
            <button
              onClick={handleRestartAdmin}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              🛡️ Reiniciar como Administrador para Criar Ponto
            </button>
          ) : (
            <button
              onClick={handleCreateAndContinue}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 transition-colors cursor-pointer"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {pendingProtectedAction
                ? '🛡️ Criar Ponto de Restauração Automaticamente e Continuar'
                : '🛡️ Criar Ponto de Restauração Agora'}
              {!creating && pendingProtectedAction && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
