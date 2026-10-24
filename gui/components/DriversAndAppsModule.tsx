"use client";

import React, { useEffect, useState } from "react";
import {
  Wrench,
  Usb,
  PackagePlus,
  HardDriveDownload,
  RefreshCw,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  getDriverInventory,
  backupDrivers,
  getMakerDrivers,
  installMakerDriver,
  cleanArduinoCache,
  getWingetCatalog,
  installWingetBatch,
  openExternalUrl,
  DriverInventoryItem,
  MakerDriverInfo,
  WingetAppItem,
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";

interface DriversAndAppsModuleProps {
  subTab: string; // "drv-auditor" | "drv-maker" | "drv-winget"
  onChangeSubTab?: (sub: string) => void;
}

export default function DriversAndAppsModule({
  subTab,
  onChangeSubTab,
}: DriversAndAppsModuleProps) {
  const { lang } = useLanguage();

  // Driver Auditor state
  const [drivers, setDrivers] = useState<DriverInventoryItem[]>([]);
  const [drvLoading, setDrvLoading] = useState(true);
  const [drvCategory, setDrvCategory] = useState("ALL");
  const [backingUp, setBackingUp] = useState(false);
  const [drvFeedback, setDrvFeedback] = useState<string | null>(null);

  // Maker Drivers state
  const [makerList, setMakerList] = useState<MakerDriverInfo[]>([]);
  const [installingChip, setInstallingChip] = useState<string | null>(null);
  const [cleaningArduino, setCleaningArduino] = useState(false);
  const [makerFeedback, setMakerFeedback] = useState<string | null>(null);

  // Winget state
  const [wingetApps, setWingetApps] = useState<WingetAppItem[]>([]);
  const [selectedWinget, setSelectedWinget] = useState<string[]>([]);
  const [installingWinget, setInstallingWinget] = useState(false);
  const [wingetFeedback, setWingetFeedback] = useState<string | null>(null);

  const loadAll = async () => {
    setDrvLoading(true);
    const [dRes, mRes, wRes] = await Promise.all([
      getDriverInventory(),
      getMakerDrivers(),
      getWingetCatalog(),
    ]);
    if (dRes.data) setDrivers(dRes.data);
    if (mRes.data) setMakerList(mRes.data);
    if (wRes.data) setWingetApps(wRes.data);
    setDrvLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleBackupDrivers = async () => {
    setBackingUp(true);
    setDrvFeedback(null);
    const res = await backupDrivers();
    setDrvFeedback(res.message);
    setBackingUp(false);
  };

  const handleInstallMaker = async (chipId: string) => {
    setInstallingChip(chipId);
    setMakerFeedback(null);
    const res = await installMakerDriver(chipId);
    setMakerFeedback(res.message);
    const mRes = await getMakerDrivers();
    if (mRes.data) setMakerList(mRes.data);
    setInstallingChip(null);
  };

  const handleCleanArduino = async () => {
    setCleaningArduino(true);
    setMakerFeedback(null);
    const res = await cleanArduinoCache();
    setMakerFeedback(res.message);
    setCleaningArduino(false);
  };

  const toggleWingetSelection = (id: string) => {
    setSelectedWinget((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleInstallSelectedWinget = async () => {
    if (selectedWinget.length === 0) return;
    setInstallingWinget(true);
    setWingetFeedback(null);
    const res = await installWingetBatch(selectedWinget);
    setWingetFeedback(res.message);
    const wRes = await getWingetCatalog();
    if (wRes.data) setWingetApps(wRes.data);
    setSelectedWinget([]);
    setInstallingWinget(false);
  };

  const filteredDrivers =
    drvCategory === "ALL"
      ? drivers
      : drivers.filter((d) => d.category === drvCategory);

  return (
    <div className="space-y-6">
      {/* Header & Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-sky-400" />
            <span>
              {lang === "en"
                ? "SYS DRIVERS — Driver Auditor, Maker Serial & Winget Installer"
                : "SYS DRIVERS — Auditor de Drivers, Maker Serial & Instalador Winget"}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {lang === "en"
              ? "Audit WHQL drivers, install CH340/CP210x/FTDI/Arduino drivers offline, and batch-install essential post-format apps."
              : "Audite versões e assinaturas WHQL, instale drivers seriais CH340/CP210x/FTDI/Arduino offline e instale pacotes essenciais via Winget."}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChangeSubTab?.("drv-auditor")}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              subTab === "drv-auditor"
                ? "bg-white text-zinc-950"
                : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
            }`}
          >
            Auditor de Drivers
          </button>
          <button
            onClick={() => onChangeSubTab?.("drv-maker")}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              subTab === "drv-maker"
                ? "bg-white text-zinc-950"
                : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
            }`}
          >
            Drivers Maker (ESP32/Arduino)
          </button>
          <button
            onClick={() => onChangeSubTab?.("drv-winget")}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              subTab === "drv-winget"
                ? "bg-white text-zinc-950"
                : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
            }`}
          >
            Instalador Winget
          </button>
          <button
            onClick={() => onChangeSubTab?.("drv-hub")}
            className="px-3.5 py-2 rounded-full text-xs font-bold bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-all cursor-pointer"
          >
            Hub da Comunidade
          </button>
        </div>
      </div>

      {/* 1. DRIVER AUDITOR */}
      {subTab === "drv-auditor" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                "ALL",
                "Vídeo / GPU",
                "Rede / Wi-Fi",
                "Áudio",
                "Armazenamento",
                "Chipset / Sistema",
                "USB / Serial",
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => setDrvCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    drvCategory === c
                      ? "bg-sky-500 text-zinc-950 font-bold"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  {c === "ALL" ? "Todos" : c}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadAll}
                disabled={drvLoading}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 ${drvLoading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={handleBackupDrivers}
                disabled={backingUp}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs cursor-pointer"
              >
                {backingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <HardDriveDownload className="w-4 h-4" />
                )}
                <span>Exportar Backup DISM (C:\DriversBackup)</span>
              </button>
            </div>
          </div>

          {drvFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {drvFeedback}
            </div>
          )}

          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-[11px] uppercase text-zinc-400">
                    <th className="py-3 px-4">Dispositivo</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Versão</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredDrivers.map((d, idx) => (
                    <tr
                      key={`${d.deviceName}-${idx}`}
                      className="hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-bold text-zinc-100">
                        {d.deviceName}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-400">{d.category}</td>
                      <td className="py-2.5 px-4 text-zinc-300">{d.provider}</td>
                      <td className="py-2.5 px-4 font-mono text-sky-400">
                        {d.version}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-zinc-400">
                        {d.date}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === "OK"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : d.status === "Antigo"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAKER SERIAL DRIVERS */}
      {subTab === "drv-maker" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Pacotes INF Seriais Embarcados (Instalação Offline via PnPUtil)
              </h3>
              <p className="text-xs text-zinc-400">
                Instale os drivers de comunicação USB-UART para placas ESP32, ESP8266 e Arduino diretamente na DriverStore do Windows.
              </p>
            </div>
            <button
              onClick={handleCleanArduino}
              disabled={cleaningArduino}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
            >
              {cleaningArduino ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Limpar Cache Arduino15</span>
            </button>
          </div>

          {makerFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {makerFeedback}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {makerList.map((m) => {
              const busy = installingChip === m.id;
              return (
                <div
                  key={m.id}
                  className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300">
                        {m.chipFamily}
                      </span>
                      {m.installedInStore && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Na DriverStore
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-zinc-100">
                      {m.name}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {m.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleInstallMaker(m.id)}
                      disabled={busy}
                      className="flex-1 py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Usb className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {m.installedInStore
                          ? "Reinstalar Driver INF"
                          : "Instalar Driver INF"}
                      </span>
                    </button>
                    <button
                      onClick={() => openExternalUrl(m.vendorUrl)}
                      title="Site Oficial do Fabricante"
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. WINGET BATCH APP INSTALLER */}
      {subTab === "drv-winget" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Instalador Pós-Formatação em Lote (Microsoft Winget)
              </h3>
              <p className="text-xs text-zinc-400">
                Selecione os programas essenciais e instale tudo silenciosamente sem adwares e sem clicar em &quot;Next, Next, Finish&quot;.
              </p>
            </div>

            <button
              onClick={handleInstallSelectedWinget}
              disabled={installingWinget || selectedWinget.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {installingWinget ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PackagePlus className="w-4 h-4" />
              )}
              <span>
                Instalar {selectedWinget.length} Selecionado(s) via Winget
              </span>
            </button>
          </div>

          {wingetFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {wingetFeedback}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {wingetApps.map((app) => {
              const checked = selectedWinget.includes(app.id);
              return (
                <label
                  key={app.id}
                  className={`p-4 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${
                    checked
                      ? "bg-zinc-900 border-sky-500/80"
                      : "bg-zinc-900/75 border-zinc-800/90 hover:border-zinc-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleWingetSelection(app.id)}
                    className="mt-1 accent-sky-500 w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-zinc-100 truncate">
                        {app.name}
                      </span>
                      {app.installed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 shrink-0">
                          Instalado
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-sky-400 block">
                      {app.category} • {app.id}
                    </span>
                    <p className="text-xs text-zinc-400 mt-1">
                      {app.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
