# Mnemo
**key-words**: cognitive augmentation; personal knowledge systems; semantic memory systems; adaptive learning systems.

> uma extensão cognitiva pessoal.

# Índice
1.1 [Objetivo do projeto](#objetivo-do-projeto)
1.2 [Arquitetura](#visão-macro-da-arquitetura)
1.3 [Features](#features)
2 [Ordem ideal de implementação](#ordem-ideal-de-implementação)
3. [Como executar](#como-executar)

---

# Informações do projeto

---

## Objetivo
Desenvolver um sistema que:

* organiza estudos automaticamente,
* acompanha métricas cognitivas,
* processa materiais,
* utiliza RAG local,
* utiliza IA para adaptação,
* gera insights e revisões.

---

## Visão macro da arquitetura

---

### frontend
- Next.js (App Router)
- Tailwind
- shadcn/ui
- Recharts
- ESLint + Prettier

---

### Backend
- FastAPI
- PostgreSQL local
- SQLModel
- ChromaDB
- Ollama

*Por enquanto, nenhum Processamento assíncrono nem deploy*

---

### Estrutura do projeto

```txt id="ew1ku6"
/frontend
  /app
  /components
  /features

/backend
  /api
  /services
  /rag
  /agents
  /analytics
  /parsers

/data
  /documents
  /embeddings
  /metrics
  /database

/models
```
---

### Estrutura inicial de banco
```sql
categories        -- árvore hierárquica livre (auto-referência)
study_sessions    -- sessões com timer, duração, produtividade
calendar_events   -- provas, metas, entregas
materials         -- arquivos e links taggeados
metrics           -- dados derivados das sessões
```
**Métricas iniciais**:
* tempo estudado,
* frequência,
* consistência,
* sessões concluídas.

---

## Features

---

### O que eu faço agora?
- Sugerir tarefas/atividades rapidamente com base nas prioridades descritas
    - auxilia o usuário a ter um norte do que fazer (muito útil em tempos caóticos)
- sugestões de inicio de tarefas
    - Normalmente é a trava mais marcante
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

### Métricas derivadas

* horários mais produtivos,
* tempo médio foco,
* consistência.

---

### Chat contextual

Usuário pergunta:

> “Explique convolução usando meus materiais.”

---

### Geração contextual

* resumos,
* flashcards,
* questões,
* revisões.

---

### Busca semântica

* localizar conceitos,
* relacionar conteúdos.

---

### Grafo de conhecimento

Conectar:

* disciplinas,
* ideias,
* conceitos.

---

### IA adaptativa
- Transformar analytics em adaptação.

**Inputs**:
* desempenho,
* frequência,
* revisões,
* tempo real,
* horário.

**Outputs**:
* reorganização de agenda,
* alertas,
* recomendações.

**Exemplos**:

```txt id="1g8ap8"
Seu foco cai após 90 minutos contínuos.

Você revisa pouco conteúdos de alta dificuldade.

Seu desempenho cai após 22h.

Você mantém maior retenção em sessões curtas.

Você retém melhor conteúdos matemáticos pela manhã.

Você revisa pouco tópicos abstratos.
```
---

### Sistema de revisão espaçada

- Criar retenção de longo prazo.

**Funcionalidades**:
* revisão automática,
* flashcards,
* repetição espaçada.

**Algoritmos possíveis**:
* SM-2,
* FSRS futuramente.

---

## Ordem ideal de implementação

---
**Prioridade alta**:
1. Auth
2. Dashboard
3. Calendário
4. Sessões
5. Métricas

---

**Prioridade média**:
6. Upload
7. Parsing
8. RAG
9. IA contextual

---

**Prioridade futura**:
10. Adaptação inteligente
11. Revisão espaçada avançada
12. Multiagentes

---

## Como executar?
```sh
make up
```