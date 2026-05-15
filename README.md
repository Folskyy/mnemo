# Roadmap — SaaS de Organização de Estudos + Dashboard Inteligente

## Objetivo do projeto

Desenvolver um SaaS que:

* organiza estudos automaticamente,
* acompanha métricas pessoais,
* utiliza IA para adaptação,
* processa materiais de estudo,
* gera insights e revisões.

Arquitetura inicialmente orientada para:

* desenvolvimento rápido,
* vibe coding,
* modularidade,
* futura integração com RAG e agentes.

---

# Visão macro da arquitetura

## Frontend

* Next.js
* Tailwind
* shadcn/ui
* Recharts

## Backend

* Supabase

  * Auth
  * PostgreSQL
  * Storage
  * Edge Functions

## IA

* OpenAI API
* embeddings
* RAG

## Processamento assíncrono

* Trigger.dev
  ou
* BullMQ + Redis

## Deploy

* Vercel

---

# Roadmap geral

# Fase 0 — Definição do produto

## Objetivos

Definir:

* público-alvo,
* funcionalidades centrais,
* escopo do MVP,
* diferenciais.

---

## Entregáveis

### Documento de visão

Definir:

* problema resolvido,
* personas,
* fluxo principal,
* proposta de valor.

---

## Definir MVP

MVP deve conter apenas:

* autenticação,
* dashboard,
* disciplinas,
* calendário,
* cronograma automático,
* métricas básicas.

---

## Definir arquitetura inicial

### Estrutura sugerida

```txt
/apps
  /web

/packages
  /ui
  /ai
  /db
  /core
```

---

# Fase 1 — Fundação do projeto

## Objetivos

Criar infraestrutura base.

---

## Tasks

### Setup do frontend

* Next.js
* Tailwind
* shadcn/ui
* ESLint
* Prettier

---

### Setup backend

* Supabase project
* PostgreSQL schema
* Auth

---

### Setup ambiente

* variáveis de ambiente,
* CI/CD,
* deploy Vercel.

---

## Estrutura inicial de banco

### Usuários

```sql
users
```

### Disciplinas

```sql
subjects
```

### Sessões de estudo

```sql
study_sessions
```

### Eventos

```sql
calendar_events
```

### Materiais

```sql
materials
```

### Métricas

```sql
metrics
```

---

# Fase 2 — Sistema de autenticação

## Objetivos

Permitir onboarding completo.

---

## Tasks

### Auth

* login,
* signup,
* reset password,
* OAuth Google.

---

### Perfil

* curso,
* semestre,
* metas,
* disponibilidade semanal.

---

## Fluxo esperado

```txt
Cadastro
→ onboarding
→ criação de matérias
→ geração inicial do cronograma
```

---

# Fase 3 — Dashboard base

## Objetivos

Criar visualização principal do sistema.

---

## Componentes

### Dashboard principal

* horas estudadas,
* progresso semanal,
* próximas provas,
* tarefas pendentes.

---

### Gráficos

* heatmap,
* evolução,
* distribuição por matéria.

---

## Métricas iniciais

* tempo estudado,
* frequência,
* consistência,
* sessões concluídas.

---

# Fase 4 — Calendário e planejamento

## Objetivos

Construir sistema de organização.

---

## Funcionalidades

### Calendário

* eventos,
* provas,
* tarefas,
* revisões.

---

### Cronograma automático

Inputs:

* disponibilidade,
* prioridade,
* dificuldade,
* data da prova.

Outputs:

* plano semanal.

---

## Algoritmo inicial

Começar simples:

```txt
peso = urgência × dificuldade × prioridade
```

---

# Fase 5 — Sistema de sessões de estudo

## Objetivos

Instrumentar comportamento real.

---

## Funcionalidades

### Timer

* pomodoro,
* tracking,
* pausa,
* interrupções.

---

### Sessões

Registrar:

* duração,
* matéria,
* produtividade percebida,
* horário.

---

## Métricas derivadas

* horários mais produtivos,
* tempo médio foco,
* consistência.

---

# Fase 6 — Upload e processamento de materiais

## Objetivos

Transformar PDFs em dados utilizáveis.

---

## Funcionalidades

### Upload

* PDF,
* DOCX,
* slides.

---

### Parsing

Extrair:

* texto,
* tópicos,
* capítulos,
* palavras-chave.

---

## Pipeline

```txt
upload
→ extração
→ chunking
→ embeddings
→ storage vetorial
```

---

# Fase 7 — Integração RAG

## Objetivos

Criar sistema contextual inteligente.

---

# Arquitetura RAG

## Ingestão

* chunking semântico,
* embeddings,
* metadata.

---

## Metadata importante

```json
{
  "subject": "",
  "difficulty": "",
  "source": "",
  "created_at": "",
  "tags": []
}
```

---

## Banco vetorial

Sugestões:

* pgvector,
* Pinecone,
* Weaviate.

pgvector provavelmente basta inicialmente.

---

# Funcionalidades RAG

## Chat contextual

Usuário pergunta:

> “Explique convolução usando meus materiais.”

---

## Geração contextual

* resumos,
* flashcards,
* questões,
* revisões.

---

## Busca semântica

* localizar conceitos,
* relacionar conteúdos.

---

# Fase 8 — IA adaptativa

## Objetivos

Transformar analytics em adaptação.

---

## Inputs

* desempenho,
* frequência,
* revisões,
* tempo real,
* horário.

---

## Outputs

* reorganização de agenda,
* alertas,
* recomendações.

---

## Exemplos

```txt
Você revisa pouco conteúdos de alta dificuldade.

Seu desempenho cai após 22h.

Você mantém maior retenção em sessões curtas.
```

---

# Fase 9 — Sistema de revisão espaçada

## Objetivos

Criar retenção de longo prazo.

---

## Funcionalidades

* revisão automática,
* flashcards,
* repetição espaçada.

---

## Algoritmos possíveis

* SM-2,
* FSRS futuramente.

---

# Fase 10 — Observabilidade

## Objetivos

Entender comportamento do sistema.

---

## Logs

* prompts,
* geração IA,
* erros,
* tempo resposta.

---

## Métricas

* custo IA,
* latência,
* uso funcionalidades.

---

# Fase 11 — Monetização

## Modelo simples

Freemium.

---

## Free

* dashboard básico,
* poucas gerações IA.

---

## Premium

* RAG completo,
* revisões avançadas,
* analytics adaptativo,
* upload expandido.

---

# Estrutura ideal para alimentar RAG

Você pode estruturar documentos internos assim:

```txt
/docs
  /vision
  /architecture
  /database
  /features
  /flows
  /prompts
  /agents
  /rag
  /ui
```

---

# Documentos importantes para o RAG

## 1. Product Vision

Objetivo do produto.

---

## 2. Architecture

Fluxos e componentes.

---

## 3. Database Schema

Tabelas e relações.

---

## 4. Feature Specs

Cada funcionalidade separada.

---

## 5. Prompt Engineering

Prompts reutilizáveis.

---

## 6. Agent Behaviors

Regras dos agentes.

---

## 7. UI Patterns

Padronização visual.

---

# Ordem ideal de implementação

## Prioridade alta

1. Auth
2. Dashboard
3. Calendário
4. Sessões
5. Métricas

---

## Prioridade média

6. Upload
7. Parsing
8. RAG
9. IA contextual

---

## Prioridade futura

10. Adaptação inteligente
11. Revisão espaçada avançada
12. Multiagentes

---

# Meta realista

## Em 30 dias

MVP funcional.

---

## Em 60–90 dias

Produto já tecnicamente impressionante.

---

## Em 6 meses

Sistema realmente competitivo se:

* UX for boa,
* insights forem úteis,
* adaptação funcionar bem.
