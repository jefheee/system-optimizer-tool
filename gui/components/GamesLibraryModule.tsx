"use client";

import React, { useEffect, useState } from "react";
import {
  Gamepad2,
  Rocket,
  RefreshCw,
  FolderOpen,
  Search,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  scanInstalledGames,
  launchGameOptimized,
  InstalledGame,
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";

export default function GamesLibraryModule() {
  const { lang } = useLanguage();
  const [games, setGames] = useState<InstalledGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadGames = async () => {
    setLoading(true);
    const res = await scanInstalledGames();
    if (res.data) setGames(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleLaunchOptimized = async (game: InstalledGame) => {
    setLaunchingId(game.id);
    setFeedback(null);
    const res = await launchGameOptimized({
      name: game.name,
      platform: game.platform,
      exePath: game.exePath,
      launchUri: game.launchUri,
    });
    setFeedback(res.message);
    setLaunchingId(null);
  };

  const filteredGames = games.filter((g) => {
    const matchesPlatform =
      platformFilter === "ALL" || g.platform === platformFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-sky-400" />
            <span>
              {lang === "en"
                ? "SYS JOGOS — Automatic Game Library & Booster Launcher"
                : "SYS JOGOS — Biblioteca Automática (VDF/Manifests) & Game Booster"}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {lang === "en"
              ? "Auto-detects installed Steam, Epic, Riot, GOG, and Xbox games and launches them with 0.5ms Kernel Timer + RAM flush + DirectX High-Performance GPU."
              : "Detecta automaticamente jogos instalados na Steam (.vdf/.acf), Epic Games, Riot, GOG e Xbox e inicia com Timer 0.5ms + Flush de RAM + GPU de Alto Desempenho."}
          </p>
        </div>

        <button
          onClick={loadGames}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{lang === "en" ? "Rescan Drives" : "Reescanear Discos"}</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "Steam", "Epic Games", "Riot Games", "Xbox", "GOG"].map(
            (plat) => (
              <button
                key={plat}
                onClick={() => setPlatformFilter(plat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  platformFilter === plat
                    ? "bg-white text-zinc-950"
                    : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
                }`}
              >
                {plat === "ALL" ? (lang === "en" ? "All" : "Todos") : plat}
              </button>
            )
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === "en" ? "Filter installed games..." : "Buscar jogo instalado..."
            }
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Games Grid */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGames.map((game) => {
            const isLaunching = launchingId === game.id;
            return (
              <div
                key={game.id}
                className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 flex flex-col justify-between gap-4 hover:border-zinc-700 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      {game.platform}
                    </span>
                    {game.sizeGb > 0 && (
                      <span className="font-mono text-xs text-zinc-400">
                        {game.sizeGb} GB
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-zinc-100 truncate">
                    {game.name}
                  </h3>
                  <p
                    title={game.installDir}
                    className="text-[11px] font-mono text-zinc-500 truncate flex items-center gap-1"
                  >
                    <FolderOpen className="w-3 h-3 shrink-0" />
                    <span className="truncate">{game.installDir}</span>
                  </p>
                </div>

                <button
                  onClick={() => handleLaunchOptimized(game)}
                  disabled={isLaunching}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                >
                  {isLaunching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  <span>
                    {isLaunching
                      ? lang === "en"
                        ? "Boosting & Launching..."
                        : "Otimizando e Iniciando..."
                      : lang === "en"
                      ? "Launch Optimized (0.5ms)"
                      : "Jogar Otimizado (0.5ms)"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center space-y-2">
          <Gamepad2 className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-300">
            {lang === "en"
              ? "No games found matching the current filter."
              : "Nenhum jogo encontrado com o filtro atual."}
          </p>
          <p className="text-xs text-zinc-500">
            {lang === "en"
              ? "Steam (libraryfolders.vdf), Epic Games, Riot Games, GOG, and Xbox libraries are scanned automatically."
              : "As bibliotecas da Steam (libraryfolders.vdf), Epic Games, Riot Games, GOG e Xbox são escaneadas automaticamente."}
          </p>
        </div>
      )}
    </div>
  );
}
