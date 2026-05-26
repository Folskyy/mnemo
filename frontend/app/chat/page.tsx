"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Send, Sparkles, Bot, User, Trash2 } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"

type Message = {
  role: "user" | "assistant"
  content: string
}

// ── Markdown component map ────────────────────────────────────────────────────
// Estilizado para o tema dark do Mnemo

const markdownComponents: Components = {
  // Parágrafos
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),

  // Headings
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-white mt-4 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1 first:mt-0">{children}</h3>
  ),

  // Listas
  ul: ({ children }) => (
    <ul className="my-2 space-y-1 pl-4 list-disc marker:text-blue-400">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-blue-400">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-slate-200 leading-relaxed">{children}</li>
  ),

  // Código inline
  code: ({ children, className }) => {
    const isBlock = !!className  // react-markdown passa className só em blocos
    if (isBlock) return null     // tratado no `pre`
    return (
      <code className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-blue-300 font-mono text-[0.8em]">
        {children}
      </code>
    )
  },

  // Blocos de código
  pre: ({ children }) => (
    <pre className="my-3 p-3 rounded-xl bg-black/60 border border-slate-800 overflow-x-auto font-mono text-xs text-blue-300 leading-relaxed">
      {children}
    </pre>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="my-2 pl-3 border-l-2 border-blue-500/50 text-slate-400 italic">
      {children}
    </blockquote>
  ),

  // Negrito / itálico
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-300">{children}</em>
  ),

  // Tabelas (remark-gfm)
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-800/60 text-slate-300 font-semibold">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-800/60">{children}</tbody>
  ),
  tr: ({ children }) => <tr className="hover:bg-slate-800/20">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-slate-300">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-slate-400">{children}</td>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
    >
      {children}
    </a>
  ),

  // Separador
  hr: () => <hr className="my-3 border-slate-800" />,
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou o seu assistente de estudos Mnemo. Faça qualquer pergunta sobre os materiais que você enviou e eu responderei usando o contexto deles.",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendQuery = async (queryText: string, currentHistory: Message[]) => {
    const userMessage: Message = { role: "user", content: queryText }
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }])
    setIsLoading(true)

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: currentHistory,
        }),
      })

      if (!response.ok) throw new Error(`Error: ${response.statusText}`)
      if (!response.body) throw new Error("ReadableStream not supported.")

      setIsLoading(false)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        assistantText += decoder.decode(value)

        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === "assistant") last.content = assistantText
          return updated
        })

        scrollToBottom()
      }
    } catch (error) {
      console.error("Streaming error:", error)
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === "assistant" && !last.content) {
          last.content = "Erro de conexão. Verifique se o servidor backend está ativo e o modelo local carregado."
        }
        return updated
      })
      setIsLoading(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input
    setInput("")
    await sendQuery(text, messages)
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const q = params.get("q")
      if (q?.trim()) {
        window.history.replaceState({}, "", window.location.pathname)
        sendQuery(q, messages)
      }
    }
  }, [])

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Histórico limpo. Faça uma nova pergunta sobre seus materiais de estudo.",
      },
    ])
  }

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/75 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">MNEMO CHAT</span>
                <span className="text-[10px] block text-slate-500 font-mono -mt-1 tracking-widest">COGNITIVE ASSISTANT</span>
              </div>
            </div>
          </div>

          <button
            onClick={clearChat}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 text-xs transition-all duration-200 font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Limpar Chat</span>
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-grow flex flex-col justify-between max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 overflow-hidden">

        {/* Messages */}
        <ScrollArea
          viewportRef={viewportRef}
          className="flex-grow h-[calc(100vh-14rem)] pr-2 mb-4 rounded-2xl border border-slate-800/40 bg-slate-950/20 backdrop-blur-sm p-4"
        >
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start space-x-3 ${msg.role === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${msg.role === "user"
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                  : "bg-blue-600/10 border-blue-500/30 text-blue-400"
                  }`}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[85%] rounded-2xl p-4 text-sm border ${msg.role === "user"
                  ? "bg-indigo-600/15 border-indigo-500/25 text-slate-100 rounded-tr-none"
                  : "bg-slate-900/40 border-slate-800/80 text-slate-200 rounded-tl-none shadow-lg shadow-indigo-950/5"
                  }`}>
                  {msg.content ? (
                    msg.role === "assistant" ? (
                      // ── Markdown só nas mensagens do assistente ──
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      // ── Usuário: texto simples ──
                      <p className="leading-relaxed">{msg.content}</p>
                    )
                  ) : (
                    // ── Streaming: dots ──
                    <span className="inline-flex space-x-1 items-center py-1">
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border bg-blue-600/10 border-blue-500/30 text-blue-400">
                  <Bot className="h-4 w-4 animate-pulse" />
                </div>
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl rounded-tl-none p-4 shadow-lg shadow-indigo-950/5">
                  <span className="inline-flex space-x-1 items-center py-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSend} className="space-y-2">
          <div className="relative flex items-center">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre seus materiais de estudo..."
              className="pr-12 h-12 bg-slate-950/60 border-slate-800/80 focus:border-blue-500/80 focus:ring-blue-500/35 placeholder:text-slate-600 text-slate-100 rounded-xl"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-1.5 h-9 w-9 rounded-lg bg-blue-600 hover:bg-blue-500 p-0 flex items-center justify-center transition-all duration-200"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-2">
            <span>RAG local ativo: nomic-embed-text</span>
            <span>Modelo: llama3</span>
          </div>
        </form>
      </main>
    </div>
  )
}