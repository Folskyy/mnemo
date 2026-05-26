"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Flame, 
  Coffee, 
  Save, 
  CheckCircle,
  Award,
  AlertTriangle
} from "lucide-react";
import { usePomodoroTimer, TimerMode } from "@/lib/usePomodoroTimer";
import { Button } from "@/components/ui/button";

export default function PomodoroPage() {
  const {
    state,
    startTimer,
    pauseTimer,
    resetTimer,
    switchMode,
    clearTimerState,
    isLoaded,
  } = usePomodoroTimer();

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [productivityLevel, setProductivityLevel] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    mode,
    isRunning,
    remainingSeconds,
    accumulatedStudyTime,
    accumulatedPauseTime,
  } = state;

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Format accumulated seconds to hours/minutes/seconds
  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  // Toggle Play / Pause
  const handlePlayPause = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  // Skip cycle
  const handleSkip = () => {
    const nextMode: TimerMode = mode === "focus" ? "pause" : "focus";
    if (confirm(`Quer mesmo pular para o modo de ${nextMode === "focus" ? "foco" : "pausa"}?`)) {
      switchMode(nextMode);
    }
  };

  // End Session: opens rating modal
  const handleEndSession = () => {
    pauseTimer();
    setShowRatingModal(true);
    setProductivityLevel(null);
    setSaveStatus("idle");
    setErrorMessage("");
  };

  // Save session payload to database
  const handleSaveSession = async () => {
    if (productivityLevel === null) return;
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/sessions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          study_time: accumulatedStudyTime,
          pause_time: accumulatedPauseTime,
          productivity_level: productivityLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Erro desconhecido ao salvar sessão." }));
        throw new Error(errorData.detail ?? `HTTP ${response.status}`);
      }

      setSaveStatus("success");
      
      // Clear timer states in hook
      setTimeout(() => {
        clearTimerState();
        setShowRatingModal(false);
      }, 1500);

    } catch (error: any) {
      console.error("Error saving session:", error);
      setSaveStatus("error");
      setErrorMessage(error.message ?? "Falha ao se conectar com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-xs font-mono text-slate-500 tracking-wider">LOADING TIMER ENGINE...</p>
      </div>
    );
  }

  // Calculate progress percentage
  const totalDuration = mode === "focus" ? 25 * 60 : 5 * 60;
  const progressPercent = ((totalDuration - remainingSeconds) / totalDuration) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 selection:bg-blue-600 selection:text-white">
      
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/75 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center space-x-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-300 ${
                mode === "focus" 
                  ? "bg-gradient-to-tr from-orange-600 to-amber-500 shadow-orange-500/20" 
                  : "bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/20"
              }`}>
                {mode === "focus" 
                  ? <Flame className="h-5 w-5 text-white animate-pulse" /> 
                  : <Coffee className="h-5 w-5 text-white" />
                }
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">MNEMO FOCUS</span>
                <span className="text-[10px] block text-slate-500 font-mono -mt-1 tracking-widest">COGNITIVE INTERVAL TIMER</span>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800 font-mono">
            Modo: <span className={mode === "focus" ? "text-orange-400 font-bold" : "text-blue-400 font-bold"}>{mode === "focus" ? "FOCO" : "PAUSA"}</span>
          </div>
        </div>
      </header>

      {/* Main Page Layout */}
      <main className="flex-grow flex flex-col items-center justify-center max-w-lg w-full mx-auto px-4 py-8 relative">
        
        {/* Decorative background glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[120px] pointer-events-none opacity-20 transition-all duration-700 ${
          mode === "focus" ? "bg-orange-500" : "bg-blue-500"
        }`} />

        {/* Timer Container Card */}
        <div className="w-full bg-slate-900/35 border border-slate-800/80 rounded-3xl backdrop-blur-md p-8 shadow-2xl flex flex-col items-center relative z-10">
          
          {/* Mode Badge */}
          <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider mb-6 ${
            mode === "focus" 
              ? "bg-orange-500/10 border-orange-500/25 text-orange-400" 
              : "bg-blue-500/10 border-blue-500/25 text-blue-400"
          }`}>
            {mode === "focus" ? (
              <>
                <Flame className="h-3.5 w-3.5" />
                <span>Focus Session</span>
              </>
            ) : (
              <>
                <Coffee className="h-3.5 w-3.5" />
                <span>Relax Break</span>
              </>
            )}
          </div>

          {/* Large Clock Display */}
          <div className="relative w-64 h-64 flex items-center justify-center mb-8 select-none">
            {/* SVG Circular Progress Bar */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="116"
                strokeWidth="6"
                stroke="#1e293b"
                fill="transparent"
              />
              <circle
                cx="128"
                cy="128"
                r="116"
                strokeWidth="6"
                stroke={mode === "focus" ? "#ea580c" : "#2563eb"}
                fill="transparent"
                strokeDasharray="728"
                strokeDashoffset={728 - (728 * progressPercent) / 100}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            
            {/* Countdown Text */}
            <div className="text-center">
              <span className="text-5xl font-black font-mono tracking-tight text-white block">
                {formatTime(remainingSeconds)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-1 block">
                {isRunning ? "Ticking" : "Paused"}
              </span>
            </div>
          </div>

          {/* Clock Control Buttons */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            {/* Reset Button */}
            <button
              onClick={resetTimer}
              title="Recomeçar Ciclo"
              className="h-11 w-11 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 flex items-center justify-center transition-all duration-200"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              title={isRunning ? "Pausar" : "Iniciar"}
              className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 ${
                mode === "focus"
                  ? isRunning 
                    ? "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-orange-500/20" 
                    : "bg-orange-600 hover:bg-orange-500 shadow-orange-500/20"
                  : isRunning 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20"
                    : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
              }`}
            >
              {isRunning ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white ml-1" />}
            </button>

            {/* Skip Button */}
            <button
              onClick={handleSkip}
              title="Pular Ciclo"
              className="h-11 w-11 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 flex items-center justify-center transition-all duration-200"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Stats & Session Summary */}
          <div className="w-full bg-slate-950/50 border border-slate-800/60 rounded-2xl p-4 space-y-3 mb-6">
            <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center border-b border-slate-800/40 pb-2">
              SESSÃO DE HOJE (ACUMULADO)
            </h4>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Tempo Focado</span>
                <span className="text-sm font-bold text-orange-400 font-mono">
                  {formatDuration(accumulatedStudyTime)}
                </span>
              </div>
              
              <div>
                <span className="text-[10px] text-slate-400 block">Tempo Pausado</span>
                <span className="text-sm font-bold text-blue-400 font-mono">
                  {formatDuration(accumulatedPauseTime)}
                </span>
              </div>
            </div>
          </div>

          {/* End & Submit Button */}
          <button
            onClick={handleEndSession}
            disabled={accumulatedStudyTime === 0}
            className={`w-full py-3.5 rounded-xl border font-bold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
              accumulatedStudyTime > 0
                ? "bg-slate-100 hover:bg-white text-slate-950 border-slate-200 shadow-lg cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                : "bg-slate-950/20 border-slate-800 text-slate-600 cursor-not-allowed"
            }`}
          >
            <Save className="h-4 w-4" />
            <span>Encerrar & Salvar Sessão</span>
          </button>
          
          {accumulatedStudyTime === 0 && (
            <span className="text-[10px] text-slate-600 mt-2 font-mono">
              Inicie e estude para conseguir salvar uma sessão.
            </span>
          )}
        </div>
      </main>

      {/* Productivity Feedback Overlay Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-fadeIn">
            
            {/* Success Animation */}
            {saveStatus === "success" ? (
              <div className="text-center py-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-6 w-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sessão Salva!</h3>
                  <p className="text-xs text-slate-400 mt-1">Seus dados cognitivos foram gravados com sucesso.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
                    <Award className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Avalie seu Foco</h3>
                  <p className="text-xs text-slate-400 mt-1">Como você avalia o seu nível de produtividade nesta sessão?</p>
                </div>

                {/* Rating selection (1 to 5) */}
                <div className="flex justify-center space-x-3 mb-6">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setProductivityLevel(num)}
                      className={`h-12 w-12 rounded-xl border text-base font-bold transition-all duration-200 ${
                        productivityLevel === num
                          ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 scale-105"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="text-center text-[10px] text-slate-500 font-mono mb-6">
                  {productivityLevel === 1 && "1 - Muito disperso / Distraído"}
                  {productivityLevel === 2 && "2 - Pouco focado"}
                  {productivityLevel === 3 && "3 - Produtividade razoável"}
                  {productivityLevel === 4 && "4 - Bom foco, rendeu bem"}
                  {productivityLevel === 5 && "5 - Foco impecável / Flow"}
                  {!productivityLevel && "Selecione uma nota de 1 a 5"}
                </div>

                {/* Error Banner */}
                {saveStatus === "error" && (
                  <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Modal Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowRatingModal(false)}
                    disabled={isSaving}
                    className="flex-1 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-colors duration-150"
                  >
                    Voltar
                  </button>
                  
                  <button
                    onClick={handleSaveSession}
                    disabled={productivityLevel === null || isSaving}
                    className={`flex-1 py-3 rounded-xl font-semibold text-xs transition-all duration-150 flex items-center justify-center space-x-1.5 ${
                      productivityLevel !== null && !isSaving
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg cursor-pointer"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750"
                    }`}
                  >
                    {isSaving ? (
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Salvar</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-black/40 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono">
          <div>
            <span>© 2026 Mnemo Project. Spaced study engine.</span>
          </div>
          <div className="flex space-x-4 mt-2 sm:mt-0 text-[10px]">
            <span>Estudo Focado: {formatDuration(accumulatedStudyTime)}</span>
            <span>Pausas: {formatDuration(accumulatedPauseTime)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
