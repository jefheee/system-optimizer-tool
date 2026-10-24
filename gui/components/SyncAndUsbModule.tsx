"use client";

import React, { useEffect, useState } from "react";
import {
  Usb,
  Palette,
  Trash2,
  RefreshCw,
  CheckSquare,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  getUsbDevices,
  removeGhostUsbDevices,
  getRgbStatus,
  applyRgbEffect,
  UsbScanResult,
  RgbStatusReport,
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";

interface SyncAndUsbModuleProps {
  subTab: string; // "sync-usb" | "sync-rgb"
  onChangeSubTab?: (sub: string) => void;
}

export default function SyncAndUsbModule({
  subTab,
  onChangeSubTab,
}: SyncAndUsbModuleProps) {
  const { lang } = useLanguage();

  // USB Cleaner state
  const [usbData, setUsbData] = useState<UsbScanResult | null>(null);
  const [usbLoading, setUsbLoading] = useState(true);
  const [selectedGhosts, setSelectedGhosts] = useState<string[]>([]);
  const [removingUsb, setRemovingUsb] = useState(false);
  const [usbFeedback, setUsbFeedback] = useState<string | null>(null);

  // RGB state
  const [rgbStatus, setRgbStatus] = useState<RgbStatusReport | null>(null);
  const [selectedEffect, setSelectedEffect] = useState("Static");
  const [selectedColor, setSelectedColor] = useState("#38BDF8");
  const [rgbApplying, setRgbApplying] = useState(false);
  const [rgbFeedback, setRgbFeedback] = useState<string | null>(null);

  const loadUsb = async () => {
    setUsbLoading(true);
    const res = await getUsbDevices();
    if (res.data) {
      setUsbData(res.data);
      const ghosts = res.data.devices
        .filter((d) => !d.connected)
        .map((d) => d.instanceId);
      setSelectedGhosts(ghosts);
    }
    setUsbLoading(false);
  };

  const loadRgb = async () => {
    const res = await getRgbStatus();
    if (res.data) {
      setRgbStatus(res.data);
      setSelectedEffect(res.data.activeEffect || "Static");
      setSelectedColor(res.data.activeColorHex || "#38BDF8");
    }
  };

  useEffect(() => {
    loadUsb();
    loadRgb();
  }, []);

  const toggleGhostItem = (id: string) => {
    setSelectedGhosts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCleanGhosts = async () => {
    if (selectedGhosts.length === 0) return;
    setRemovingUsb(true);
    setUsbFeedback(null);
    const res = await removeGhostUsbDevices(selectedGhosts);
    setUsbFeedback(res.message);
    await loadUsb();
    setRemovingUsb(false);
  };

  const handleApplyRgb = async () => {
    setRgbApplying(true);
    setRgbFeedback(null);
    const res = await applyRgbEffect(selectedEffect, selectedColor);
    if (res.data) setRgbStatus(res.data);
    setRgbFeedback(
      lang === "en"
        ? `RGB profile (${selectedEffect} • ${selectedColor}) applied successfully!`
        : `Perfil RGB (${selectedEffect} • ${selectedColor}) aplicado com sucesso!`
    );
    setRgbApplying(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Usb className="w-5 h-5 text-sky-400" />
            <span>
              {lang === "en"
                ? "SYS SYNC — Ghost USB Cleaner, COM Arbiter & RGB Lighting"
                : "SYS SYNC — Limpador de USB Fantasmas, Portas COM & RGB Sync"}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {lang === "en"
              ? "Remove disconnected PnP USB/COM devices that cause polling conflicts and synchronize Windows 11 Dynamic Lighting."
              : "Elimine entradas de dispositivos USB/COM desconectados que causam conflitos de driver e sincronize a iluminação RGB."}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChangeSubTab?.("sync-usb")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              subTab === "sync-usb"
                ? "bg-white text-zinc-950"
                : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>
              {lang === "en" ? "Ghost USB Cleaner" : "Limpador USB Fantasmas"}
            </span>
          </button>
          <button
            onClick={() => onChangeSubTab?.("sync-rgb")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              subTab === "sync-rgb"
                ? "bg-white text-zinc-950"
                : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "RGB Sync" : "Sincronização RGB"}</span>
          </button>
        </div>
      </div>

      {/* 1. GHOST USB CLEANER */}
      {subTab === "sync-usb" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <span className="text-[11px] uppercase text-zinc-400">
                Total USB / Seriais
              </span>
              <p className="text-2xl font-black font-mono text-zinc-100 mt-1">
                {usbData?.totalDevices ?? 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <span className="text-[11px] uppercase text-zinc-400">
                Conectados Agora
              </span>
              <p className="text-2xl font-black font-mono text-emerald-400 mt-1">
                {usbData?.connectedCount ?? 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <span className="text-[11px] uppercase text-zinc-400">
                USBs Fantasmas
              </span>
              <p className="text-2xl font-black font-mono text-amber-400 mt-1">
                {usbData?.ghostCount ?? 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <span className="text-[11px] uppercase text-zinc-400">
                Portas COM Reservadas
              </span>
              <p className="text-2xl font-black font-mono text-sky-400 mt-1">
                {usbData?.reservedComPorts ?? 0}
              </p>
            </div>
          </div>

          {usbFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {usbFeedback}
            </div>
          )}

          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const allGhosts = (usbData?.devices || [])
                      .filter((d) => !d.connected)
                      .map((d) => d.instanceId);
                    setSelectedGhosts(allGhosts);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Selecionar Fantasmas</span>
                </button>
                <button
                  onClick={loadUsb}
                  disabled={usbLoading}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${usbLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              <button
                onClick={handleCleanGhosts}
                disabled={removingUsb || selectedGhosts.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-xs transition-all cursor-pointer"
              >
                {removingUsb ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>
                  Remover {selectedGhosts.length} USB(s) Fantasma(s)
                </span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800 max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-[11px] uppercase text-zinc-400">
                    <th className="py-2.5 px-3 w-10">Sel.</th>
                    <th className="py-2.5 px-3">Dispositivo</th>
                    <th className="py-2.5 px-3">Classe</th>
                    <th className="py-2.5 px-3">Instance ID</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {(usbData?.devices || []).map((dev) => {
                    const checked = selectedGhosts.includes(dev.instanceId);
                    return (
                      <tr
                        key={dev.instanceId}
                        className="hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-2 px-3">
                          {!dev.connected && (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleGhostItem(dev.instanceId)}
                              className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
                            />
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-zinc-100">
                          {dev.name}
                        </td>
                        <td className="py-2 px-3 text-zinc-400">
                          {dev.className}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-zinc-400 truncate max-w-xs">
                          {dev.instanceId}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              dev.connected
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {dev.statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. RGB SYNC */}
      {subTab === "sync-rgb" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Efeito & Cor Global (Windows 11 Dynamic Lighting + OpenRGB)
            </h3>

            <div>
              <label className="text-xs text-zinc-400 block mb-2">
                Modo de Iluminação:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["Static", "Breathing", "Wave", "Spectrum", "Off"].map(
                  (eff) => (
                    <button
                      key={eff}
                      onClick={() => setSelectedEffect(eff)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedEffect === eff
                          ? "bg-white text-zinc-950 border-white"
                          : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
                      }`}
                    >
                      {eff}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-2">
                Cor Principal:
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {[
                  "#38BDF8",
                  "#10B981",
                  "#F59E0B",
                  "#EF4444",
                  "#A855F7",
                  "#FFFFFF",
                ].map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setSelectedColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                      selectedColor.toUpperCase() === hex
                        ? "border-white scale-110"
                        : "border-transparent"
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="font-mono text-xs text-zinc-300">
                  {selectedColor.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              onClick={handleApplyRgb}
              disabled={rgbApplying}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {rgbApplying
                ? "Sincronizando Iluminação..."
                : "Aplicar Sincronização RGB"}
            </button>

            {rgbFeedback && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {rgbFeedback}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Backends & Controladores Detectados
            </h3>
            <div className="space-y-2.5">
              {(rgbStatus?.backends || []).map((b) => (
                <div
                  key={b.name}
                  className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-zinc-200">{b.name}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      b.detected
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
