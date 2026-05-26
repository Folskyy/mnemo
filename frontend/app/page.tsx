"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileText,
  HelpCircle,
  Info,
  Layers,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  XCircle
} from "lucide-react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [apiHealth, setApiHealth] = useState<"loading" | "online" | "offline">("loading");
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "materials" | "calendar">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload states
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    id: string;
    filename: string;
    chunks_indexed: number;
    chars_extracted: number;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Check API health on load
  const checkHealth = async () => {
    try {
      const response = await fetch("http://localhost:8000/health");
      if (response.ok) {
        const data = await response.json();
        if (data.status === "ok") {
          setApiHealth("online");
          return;
        }
      }
      setApiHealth("offline");
    } catch (e) {
      setApiHealth("offline");
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Upload logic ────────────────────────────────────────────────────────────

  const uploadFile = async (file: File) => {
    if (!["application/pdf", "text/plain"].includes(file.type)) {
      setUploadStatus("error");
      setUploadError(`Tipo não suportado: ${file.type}. Use PDF ou TXT.`);
      return;
    }

    setSelectedFile(file);
    setUploadStatus("uploading");
    setUploadError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/materials/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
        throw new Error(err.detail ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setUploadResult(data);
      setUploadStatus("success");
    } catch (e: any) {
      setUploadStatus("error");
      setUploadError(e.message ?? "Falha ao enviar arquivo.");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const resetUpload = () => {
    setUploadStatus("idle");
    setUploadError(null);
    setUploadResult(null);
    setSelectedFile(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/75 border-b border-slate-800/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">MNEMO</span>
              <span className="text-[10px] block text-slate-500 font-mono -mt-1 tracking-widest">COGNITIVE CO-PROCESSOR</span>
            </div>
          </div>

          <nav className="hidden md:flex space-x-1 items-center">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "dashboard" ? "bg-slate-800/60 text-blue-400 shadow-inner" : "text-slate-400 hover:text-slate-200"}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("materials")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "materials" ? "bg-slate-800/60 text-blue-400 shadow-inner" : "text-slate-400 hover:text-slate-200"}`}
            >
              Materials & Ingestion
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "calendar" ? "bg-slate-800/60 text-blue-400 shadow-inner" : "text-slate-400 hover:text-slate-200"}`}
            >
              Study Planner
            </button>
            <Link
              href="/chat"
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 transition-all duration-200 flex items-center gap-1.5"
            >
              <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
              <span>Mnemo Chat</span>
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-sm ${apiHealth === "online"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : apiHealth === "offline"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}>
              <span className={`h-2 w-2 rounded-full ${apiHealth === "online" ? "bg-emerald-500 animate-ping" : apiHealth === "offline" ? "bg-rose-500" : "bg-amber-500 animate-pulse"}`} />
              <span className="font-mono uppercase tracking-wider text-[10px]">
                API: {apiHealth === "online" ? "online" : apiHealth === "offline" ? "offline" : "checking"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Section */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-8 sm:p-10 mb-8 shadow-2xl shadow-indigo-950/10">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
              <Cpu className="h-3.5 w-3.5" />
              <span>SaaS Cognitive Augmentation Platform</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
              Organize studies and augment memory using <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Local AI</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg mb-6 leading-relaxed">
              Mnemo is an adaptive learning system that tracks your focus metrics,
              creates semantic vector mappings of your upload materials using Local RAG, and generates custom revision loops.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab("materials")}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Injest Material
              </button>
              <Link
                href="/chat"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/35 to-blue-600/35 hover:from-indigo-600/50 hover:to-blue-600/50 text-slate-100 border border-slate-800 font-semibold text-sm shadow-lg shadow-indigo-500/5 hover:shadow-indigo-500/10 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
                <span>Abrir Chat de IA</span>
              </Link>
              <button
                onClick={() => setActiveTab("dashboard")}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                View Analytics
              </button>
            </div>
          </div>
        </section>

        {/* Tab Layout Container */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            {/* Quick Metrics */}
            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Estudo Focado</span>
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">12.5 hrs</div>
                  <span className="text-[10px] text-emerald-400 flex items-center mt-1 font-mono">
                    <TrendingUp className="h-3 w-3 mr-0.5" /> +15% vs semana anterior
                  </span>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Consistência</span>
                    <Activity className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">92%</div>
                  <span className="text-[10px] text-indigo-400 flex items-center mt-1 font-mono">
                    Meta semanal: 85%
                  </span>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Materiais RAG</span>
                    <Database className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">8 files</div>
                  <span className="text-[10px] text-slate-500 flex items-center mt-1 font-mono">
                    nomic-embed-text ativo
                  </span>
                </div>
              </div>

              {/* RAG Query Simulator */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-1 flex items-center">
                  <Search className="h-4 w-4 mr-2 text-blue-400" />
                  Busca Semântica & Chat Contextual
                </h3>
                <p className="text-xs text-slate-400 mb-4">Execute buscas baseadas em embeddings locais usando os materiais indexados.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      router.push(`/chat?q=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                  className="relative"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ex: 'Explique redes convolucionais com base nos meus slides de IA'"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-200 outline-none transition-all duration-200 placeholder:text-slate-600"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-2 h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors duration-200"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                </form>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    onClick={() => setSearchQuery("Explique redes neurais artificiais")}
                    className="text-[10px] bg-slate-950 px-2.5 py-1 rounded text-slate-400 hover:text-slate-200 cursor-pointer border border-slate-800/50"
                  >
                    #redes-neurais
                  </span>
                  <span
                    onClick={() => setSearchQuery("Resuma conceitos de estatística descritiva")}
                    className="text-[10px] bg-slate-950 px-2.5 py-1 rounded text-slate-400 hover:text-slate-200 cursor-pointer border border-slate-800/50"
                  >
                    #estatistica
                  </span>
                  <span
                    onClick={() => setSearchQuery("Qual foi o período da história romana clássica?")}
                    className="text-[10px] bg-slate-950 px-2.5 py-1 rounded text-slate-400 hover:text-slate-200 cursor-pointer border border-slate-800/50"
                  >
                    #historia-romana
                  </span>
                </div>
              </div>
            </div>

            {/* Cognitive Insights Panel */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white mb-1 flex items-center">
                  <Cpu className="h-4 w-4 mr-2 text-indigo-400" />
                  IA Adaptativa — Insights
                </h3>
                <p className="text-xs text-slate-400 mb-4">Métricas cognitivas geradas automaticamente por análise de hábitos.</p>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/40">
                    <div className="mt-0.5 rounded-full p-1 bg-amber-500/10 text-amber-400">
                      <Info className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Queda de Foco às 22h</p>
                      <p className="text-[10px] text-slate-500">Seu tempo de foco diminui 40% após as 22h. Recomendamos sessões curtas à noite.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/40">
                    <div className="mt-0.5 rounded-full p-1 bg-blue-500/10 text-blue-400">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Alta Retenção em Matemática</p>
                      <p className="text-[10px] text-slate-500">Sua retenção de exatas é 20% maior em sessões matinais de 40 minutos.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/40">
                    <div className="mt-0.5 rounded-full p-1 bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Revisão Espaçada Ativa</p>
                      <p className="text-[10px] text-slate-500">3 flashcards de IA pendentes para fixação da matéria de ontem.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Último update: Agora mesmo</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "materials" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* Upload Zone */}
            <div className="lg:col-span-2 space-y-6">

              {/* ── idle / uploading state ── */}
              {uploadStatus !== "success" && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`bg-slate-900/25 border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-200 ${dragActive
                      ? "border-blue-500 bg-blue-500/5"
                      : uploadStatus === "error"
                        ? "border-rose-500/60 bg-rose-500/5"
                        : "border-slate-800 hover:border-slate-700/80"
                    }`}
                >
                  <div className={`h-12 w-12 rounded-xl border flex items-center justify-center mb-4 shadow-lg transition-colors duration-200 ${uploadStatus === "error"
                      ? "bg-rose-950 border-rose-800 text-rose-400"
                      : uploadStatus === "uploading"
                        ? "bg-blue-950 border-blue-800 text-blue-400"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}>
                    {uploadStatus === "uploading"
                      ? <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                      : uploadStatus === "error"
                        ? <XCircle className="h-6 w-6" />
                        : <Upload className="h-6 w-6" />
                    }
                  </div>

                  {uploadStatus === "uploading" ? (
                    <>
                      <h4 className="text-sm font-bold text-white mb-1">Enviando arquivo...</h4>
                      <p className="text-xs text-slate-500">{selectedFile?.name}</p>
                    </>
                  ) : uploadStatus === "error" ? (
                    <>
                      <h4 className="text-sm font-bold text-rose-400 mb-1">Falha no envio</h4>
                      <p className="text-xs text-slate-500 mb-4 text-center max-w-xs">{uploadError}</p>
                      <button
                        onClick={resetUpload}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors duration-150"
                      >
                        Tentar novamente
                      </button>
                    </>
                  ) : (
                    <>
                      <h4 className="text-sm font-bold text-white mb-1">Arrastar e soltar arquivo</h4>
                      <p className="text-xs text-slate-500 mb-6">Suporta PDF e TXT para extração de texto (Max 10MB)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".pdf,.txt,application/pdf,text/plain"
                        onChange={handleFileInput}
                      />
                      <label
                        htmlFor="file-upload"
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors duration-150 cursor-pointer shadow-md shadow-blue-500/10"
                      >
                        Selecionar Arquivo
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* ── success state ── */}
              {uploadStatus === "success" && uploadResult && (
                <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-8 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 mb-4 shadow-lg">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Arquivo indexado com sucesso</h4>
                  <p className="text-xs text-slate-400 mb-5">{uploadResult.filename}</p>

                  <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
                    <div className="bg-slate-950/60 rounded-xl border border-slate-800/40 p-3">
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">CHUNKS</span>
                      <span className="text-lg font-bold text-white">{uploadResult.chunks_indexed}</span>
                    </div>
                    <div className="bg-slate-950/60 rounded-xl border border-slate-800/40 p-3">
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">CARACTERES</span>
                      <span className="text-lg font-bold text-white">{uploadResult.chars_extracted.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={resetUpload}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors duration-150"
                    >
                      Enviar outro arquivo
                    </button>
                    <Link
                      href="/chat"
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors duration-150 flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Ir para o Chat
                    </Link>
                  </div>
                </div>
              )}

              {/* API upload instructions */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center">
                  <Layers className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                  Instruções de Ingestão via Terminal (CURL)
                </h4>
                <p className="text-xs text-slate-500 mb-3">Você pode indexar arquivos na base de dados enviando chamadas diretamente para o container API:</p>
                <div className="bg-black/80 rounded-xl p-3 font-mono text-xs text-blue-300 border border-slate-800 overflow-x-auto whitespace-nowrap">
                  curl -X POST http://localhost:8000/materials/ -F &quot;file=@caminho/do/documento.pdf&quot;
                </div>
              </div>
            </div>

            {/* Configured Collection Statistics */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-2 flex items-center">
                <Database className="h-4 w-4 mr-2 text-purple-400" />
                Coleções ChromaDB
              </h3>
              <p className="text-xs text-slate-400 mb-5">Embeddings salvos em formato de alta dimensionalidade para RAG.</p>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-950/60 rounded-xl border border-slate-800/40">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-200">mnemo</span>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                    24 chunks
                  </span>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/40 space-y-2">
                  <span className="text-[10px] text-slate-500 font-mono block">MODELO DE EMBEDDINGS</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold">nomic-embed-text</span>
                    <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ATIVO
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/40 space-y-2">
                  <span className="text-[10px] text-slate-500 font-mono block">POSTGRES METADATA</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold">categories, materials</span>
                    <span className="text-slate-400 font-mono">Conectado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 animate-fadeIn">
            <div className="max-w-2xl">
              <h3 className="text-base font-bold text-white mb-1 flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2 text-blue-400" />
                Cronograma Inteligente
              </h3>
              <p className="text-xs text-slate-400 mb-6">Integra metas, datas de entrega e sua disponibilidade diária.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Meta Semanal (Horas)</label>
                  <input type="number" defaultValue="15" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-500 text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Frequência Pomodoro</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-200">
                    <option>25 min foco / 5 min pausa</option>
                    <option>50 min foco / 10 min pausa</option>
                    <option>Sem restrições (cronômetro corrido)</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 flex items-start space-x-3">
                <Sparkles className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Sugestão de Rotina Linear</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    Com base no seu histórico e nos 8 arquivos indexados, seu cronograma linear sugere focar em revisões de redes neurais no período da manhã (09:00 - 10:20), mantendo blocos curtos à noite para evitar estafa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-black/40 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono">
          <div>
            <span>© 2026 Mnemo Project. Cognitive augmentation.</span>
          </div>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <span className="hover:text-slate-400 cursor-pointer">FastAPI + PostgreSQL</span>
            <span className="hover:text-slate-400 cursor-pointer">ChromaDB + Ollama</span>
            <span className="hover:text-slate-400 cursor-pointer">Next.js</span>
          </div>
        </div>
      </footer>
    </div>
  );
}