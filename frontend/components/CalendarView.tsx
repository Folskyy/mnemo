"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Star,
  Activity,
  Layers,
  Clock,
  Sparkles,
  BookOpen,
  Tag,
  AlertCircle,
  X,
  PlusCircle,
  CheckSquare,
  Square
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  color?: string;
  icon?: string;
}

interface CalendarEvent {
  id: number;
  category_id?: number;
  title: string;
  description?: string;
  type: "exam" | "deadline" | "goal" | "revision" | "other";
  date: string; // ISO string
  priority: number; // 1-5
  difficulty?: number; // 1-5
  done: boolean;
  category?: Category;
}

const API_BASE_URL = "http://localhost:8000";

const EVENT_TYPES = [
  { value: "exam", label: "Prova / Exame", color: "from-red-500 to-rose-600" },
  { value: "deadline", label: "Entrega / Prazo", color: "from-amber-500 to-orange-600" },
  { value: "goal", label: "Meta de Estudo", color: "from-blue-500 to-indigo-600" },
  { value: "revision", label: "Revisão Espaçada", color: "from-emerald-500 to-teal-600" },
  { value: "other", label: "Outro", color: "from-slate-500 to-slate-600" }
];

const PRESET_COLORS = [
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#6b7280"  // Gray
];

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"exam" | "deadline" | "goal" | "revision" | "other">("goal");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formPriority, setFormPriority] = useState(3);
  const [formDifficulty, setFormDifficulty] = useState(3);
  const [formCategoryId, setFormCategoryId] = useState<string>("");

  // Category creation inline state
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch categories
      const catRes = await fetch(`${API_BASE_URL}/categories/`);
      if (!catRes.ok) throw new Error("Falha ao carregar categorias.");
      const catData = await catRes.json();
      setCategories(catData);
      if (catData.length > 0) {
        setFormCategoryId(catData[0].id.toString());
      }

      // Fetch events
      const eventRes = await fetch(`${API_BASE_URL}/events/`);
      if (!eventRes.ok) throw new Error("Falha ao carregar tarefas.");
      const eventData = await eventRes.json();
      setEvents(eventData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão com a API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update form default date when selected date changes
  useEffect(() => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      setFormDate(`${year}-${month}-${day}`);
    }
  }, [selectedDate]);

  // Helper date checking
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  // Monthly Calendar Generator
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const gridCells = [];

  // Previous month padding
  for (let i = startWeekday - 1; i >= 0; i--) {
    gridCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i)
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Next month padding to fill a grid of 6 weeks (42 days)
  const totalCells = 42;
  const nextMonthPadding = totalCells - gridCells.length;
  for (let i = 1; i <= nextMonthPadding; i++) {
    gridCells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Get events on a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter(e => isSameDay(new Date(e.date), date));
  };

  // Form submission: Create Task
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      // Combine date and time
      const datetimeStr = `${formDate}T${formTime}:00`;
      const localDatetime = new Date(datetimeStr);

      const payload = {
        title: formTitle,
        description: formDescription.trim() || null,
        type: formType,
        date: localDatetime.toISOString(),
        priority: formPriority,
        difficulty: formDifficulty,
        category_id: formCategoryId ? parseInt(formCategoryId) : null
      };

      const res = await fetch(`${API_BASE_URL}/events/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Falha ao criar tarefa.");
      }

      const newEvent = await res.json();
      
      // Inject category object locally for rendering
      if (newEvent.category_id) {
        newEvent.category = categories.find(c => c.id === newEvent.category_id);
      }

      setEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      
      // Reset form
      setFormTitle("");
      setFormDescription("");
      setFormType("goal");
      setFormPriority(3);
      setFormDifficulty(3);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Ocorreu um erro ao criar a tarefa.");
    }
  };

  // Form submission: Create Custom Category
  const handleCreateCategory = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const payload = {
        name: newCatName,
        color: newCatColor,
        icon: "Tag"
      };

      const res = await fetch(`${API_BASE_URL}/categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Falha ao criar categoria.");
      }

      const newCat = await res.json();
      setCategories(prev => [...prev, newCat]);
      setFormCategoryId(newCat.id.toString());
      
      // Reset inline form
      setNewCatName("");
      setShowNewCatForm(false);
    } catch (err: any) {
      alert(err.message || "Erro ao criar categoria.");
    }
  };

  // Toggle Event status (done / undone)
  const handleToggleDone = async (event: CalendarEvent) => {
    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !event.done })
      });

      if (!res.ok) throw new Error("Falha ao atualizar tarefa.");

      const updated = await res.json();
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, done: updated.done } : e));
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar tarefa.");
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Falha ao deletar tarefa.");

      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert(err.message || "Erro ao deletar tarefa.");
    }
  };

  // Filter events by selected day
  const filteredEvents = selectedDate
    ? events.filter(e => isSameDay(new Date(e.date), selectedDate))
    : events;

  // Calculate stats
  const totalTasks = events.length;
  const completedTasks = events.filter(e => e.done).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Metrics Card Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total de Tarefas</span>
            <CalendarIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalTasks}</div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">no cronograma atual</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Pendentes</span>
            <AlertCircle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{pendingTasks}</div>
          <span className="text-[10px] text-amber-500/80 font-mono mt-1 block">estudos necessários</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Concluídas</span>
            <Check className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{completedTasks}</div>
          <span className="text-[10px] text-emerald-500/80 font-mono mt-1 block">metas alcançadas</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-200 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Progresso</span>
            <Activity className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <div className="text-2xl font-bold text-white">{completionPercent}%</div>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-800 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Calendar Panel */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800 bg-opacity-40 backdrop-blur-sm rounded-3xl p-6 shadow-2xl">
          {/* Header Month / Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-none">
                  {monthNames[month]} {year}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Cronograma de estudo planejado</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 transition-colors"
                title="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white border border-slate-800/80 transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 transition-colors"
                title="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-500 mb-2 border-b border-slate-800/50 pb-2">
            <div>D</div>
            <div>S</div>
            <div>T</div>
            <div>Q</div>
            <div>Q</div>
            <div>S</div>
            <div>S</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {gridCells.map((cell, idx) => {
              const dayEvents = getEventsForDay(cell.date);
              const cellIsToday = isToday(cell.date);
              const isSelected = selectedDate && isSameDay(cell.date, selectedDate);
              const uniqueCategories = Array.from(new Set(dayEvents.map(e => e.category_id).filter(id => id !== undefined)));

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(cell.date)}
                  className={`min-h-[72px] p-1.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all duration-200 relative group
                    ${cell.isCurrentMonth ? "text-slate-100" : "text-slate-600 bg-slate-950/20"}
                    ${isSelected 
                      ? "bg-blue-600/10 border-blue-500/60 shadow-lg shadow-blue-500/5 scale-[1.02] z-10" 
                      : "bg-slate-950/40 border-slate-800/50 hover:border-slate-700/80 hover:bg-slate-900/30"
                    }
                  `}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs h-5 w-5 flex items-center justify-center rounded-full font-mono
                      ${cellIsToday ? "bg-blue-600 text-white font-extrabold shadow-md shadow-blue-500/30" : ""}
                    `}>
                      {cell.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-mono font-bold bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-700/50">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Render tiny indicator lines/dots for tasks */}
                  <div className="flex flex-wrap gap-1 mt-auto pt-1.5 max-h-5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const categoryColor = categories.find(c => c.id === ev.category_id)?.color || "#6b7280";
                      return (
                        <div
                          key={ev.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: categoryColor }}
                          title={ev.title}
                        />
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[8px] leading-none font-bold text-slate-500">+</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-slate-950/30 border border-slate-900 flex justify-between items-center text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>Dica: Clique em qualquer dia para filtrar tarefas e planejar.</span>
            </div>
            <div className="flex space-x-3 items-center">
              {categories.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center space-x-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-[10px]">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Selected Date Tasks & Creation */}
        <div className="space-y-6">
          {/* Daily Schedule Box */}
          <div className="bg-slate-900/30 border border-slate-800 bg-opacity-40 backdrop-blur-sm rounded-3xl p-6 shadow-2xl flex flex-col max-h-[420px]">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/85">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-indigo-400" />
                  Agenda do Dia
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedDate 
                    ? selectedDate.toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long' })
                    : "Selecione um dia"
                  }
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors"
                title="Adicionar tarefa"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
                <svg className="animate-spin h-5 w-5 mb-2 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                Carregando agenda...
              </div>
            ) : error ? (
              <div className="py-8 text-center text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-xl p-3">
                <AlertCircle className="h-5 w-5 mx-auto mb-2 text-rose-400" />
                {error}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                Nenhuma tarefa para este dia.
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="block mx-auto mt-3 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-blue-400 hover:text-blue-300 border border-slate-800 rounded-lg text-[10px] font-semibold transition-all"
                >
                  Criar Tarefa
                </button>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-1 flex-grow scrollbar-thin">
                {filteredEvents.map((ev) => {
                  const category = categories.find(c => c.id === ev.category_id);
                  const typeObj = EVENT_TYPES.find(t => t.value === ev.type);
                  const formattedTime = new Date(ev.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div
                      key={ev.id}
                      className={`group p-3 rounded-xl border transition-all duration-200 flex items-start justify-between relative overflow-hidden
                        ${ev.done
                          ? "bg-slate-950/20 border-slate-900 text-slate-500 opacity-60"
                          : "bg-slate-950/50 border-slate-850 hover:border-slate-800 hover:bg-slate-900/20"
                        }
                      `}
                    >
                      {/* Left category indicator line */}
                      {category?.color && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1" 
                          style={{ backgroundColor: category.color }}
                        />
                      )}

                      <div className="flex items-start space-x-2.5 pl-1.5 flex-grow">
                        <button
                          onClick={() => handleToggleDone(ev)}
                          className="mt-0.5 text-slate-400 hover:text-white transition-colors"
                        >
                          {ev.done ? (
                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>

                        <div className="space-y-1 pr-2">
                          <span className={`text-xs font-bold block ${ev.done ? "line-through" : "text-slate-100"}`}>
                            {ev.title}
                          </span>
                          {ev.description && (
                            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                              {ev.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[9px] font-semibold font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/15">
                              {formattedTime}
                            </span>
                            {typeObj && (
                              <span className="text-[9px] font-semibold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                                {typeObj.label}
                              </span>
                            )}
                            {category && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                                style={{
                                  color: category.color,
                                  backgroundColor: (category.color || "#6b7280") + "15",
                                  borderColor: (category.color || "#6b7280") + "30"
                                }}
                              >
                                {category.name}
                              </span>
                            )}
                            <div className="flex items-center text-[9px] text-amber-400 font-mono">
                              <Star className="h-2.5 w-2.5 fill-amber-400 mr-0.5" />
                              <span>P{ev.priority}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Routine Linear Suggestion Box (Clean & Replaced inside Sidebar) */}
          <div className="bg-gradient-to-br from-indigo-950/25 to-blue-950/25 border border-indigo-900/40 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                <Sparkles className="h-4.5 w-4.5 text-blue-400 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Cronograma de IA</h4>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Nossos insights sugerem focar em revisões de <strong>Revisão Espaçada</strong> nos dias com mais de 3 tarefas, mantendo sua produtividade ativa por mais tempo.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-indigo-950 flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>Foco Estimado: 12h/semana</span>
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-4 flex items-center">
              <CalendarIcon className="h-4.5 w-4.5 text-blue-500 mr-2" />
              Adicionar Nova Tarefa
            </h3>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Estudar Machine Learning"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição (Opcional)</label>
                <textarea
                  placeholder="Ex: Ler capítulo 4 e fazer os exercícios"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade (1 a 5)</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="1">1 - Baixa</option>
                    <option value="2">2 - Normal</option>
                    <option value="3">3 - Média</option>
                    <option value="4">4 - Alta</option>
                    <option value="5">5 - Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Dificuldade (1 a 5)</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="1">1 - Muito Fácil</option>
                    <option value="2">2 - Fácil</option>
                    <option value="3">3 - Médio</option>
                    <option value="4">4 - Difícil</option>
                    <option value="5">5 - Muito Difícil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo da Tarefa</label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormType(t.value as any)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border text-left transition-all
                        ${formType === t.value 
                          ? "bg-blue-600/10 border-blue-500 text-blue-400" 
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }
                      `}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Categoria</label>
                  <button
                    type="button"
                    onClick={() => setShowNewCatForm(!showNewCatForm)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center"
                  >
                    {showNewCatForm ? "Escolher existente" : "+ Criar Categoria"}
                  </button>
                </div>

                {!showNewCatForm ? (
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Nome da categoria (ex: Redações)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500 transition-colors"
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewCatColor(color)}
                            className={`h-5 w-5 rounded-full border transition-all
                              ${newCatColor === color 
                                ? "ring-2 ring-white scale-110" 
                                : "border-transparent opacity-80 hover:opacity-100"
                              }
                            `}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={!newCatName.trim()}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold transition-all"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-semibold text-xs border border-slate-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/10 transition-all"
                >
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
