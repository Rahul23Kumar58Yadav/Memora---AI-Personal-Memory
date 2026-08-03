# Memora — Your AI Personal Memory & Commitment Assistant

**Memora** is an AI-powered personal memory layer that helps you remember **what you did, what you discussed, what you saved, and what you promised to do**.

Instead of searching through Gmail, Slack, meeting notes, documents, and calendars separately, Memora creates a unified, searchable memory of your digital life using **Retrieval-Augmented Generation (RAG)** and **LLM-powered AI agents**.

Memora doesn't just answer questions when you ask. It can also **proactively identify commitments, deadlines, follow-ups, and important information** and remind you before you forget.

---

## 🚨 The Problem

Modern work generates information across many different platforms:

* 📧 Emails
* 💬 Slack conversations
* 📅 Calendar events and meetings
* 📝 Meeting notes
* 📄 Documents and files
* 📋 Task and project management tools

Important information often gets buried inside these systems.

You may later wonder:

> "Where did I save that document?"

> "What exactly did I agree to in that meeting?"

> "Who was supposed to send me the report?"

> "Did I already promise to finish this task?"

> "When did we discuss this project?"

> "Did I already pay this bill?"

Traditional search can find matching keywords, but it doesn't understand the **context and relationships between your information**.

---

# 💡 The Solution

Memora acts as a **personal AI memory layer** over your existing digital information.

It collects information from connected sources, processes and indexes it, and makes it accessible through a conversational AI interface.

More importantly, Vowly can reason over your information to identify things such as:

* Commitments you made
* Tasks you agreed to complete
* Deadlines mentioned in conversations
* Follow-up actions
* Important decisions
* Pending responses
* Recurring responsibilities

The goal is simple:

**You shouldn't have to remember everything. Memora remembers it for you.**

---

## 🔍 1. Passive Recall

Ask Memora questions about your own information using natural language.

Examples:

* "What did I agree to do in yesterday's meeting?"
* "Find the document John sent me about the API."
* "What were the decisions from last week's project meeting?"
* "When did I last discuss the payment with the client?"
* "Show me all pending tasks related to Project X."

Memora retrieves the most relevant information from your connected data and generates a contextual answer using RAG.

---

## 🔔 2. Active Recall

Memora doesn't wait for you to remember something.

Its AI agent continuously analyzes relevant information to identify potential commitments and deadlines.

For example:

**Meeting conversation:**

> "I'll send the revised proposal to Sarah by Friday."

Memora can identify:

* **Commitment:** Send revised proposal
* **Person:** Sarah
* **Deadline:** Friday
* **Context:** Client proposal
* **Status:** Pending

It can then remind you before the deadline.

This transforms Memora from a simple **search assistant** into a **proactive personal memory agent**.

---

## 🧠 3. Context-Aware Memory

Memora doesn't treat every document, message, or email as an isolated piece of information.

Using embeddings, vector search, metadata, and LLM reasoning, it can connect related information across different sources.

For example:

**Slack:**
"Let's finalize the pricing next week."

**Meeting notes:**
"Rahul will prepare the revised pricing proposal."

**Email:**
"Please send the final pricing by Friday."

Memora can understand that these pieces of information are related to the **same task and context**.

---

## 🔌 4. Connect Your Digital Life

Memora is designed around a modular connector architecture.

Potential integrations include:

* 📧 Gmail
* 📅 Google Calendar
* 💬 Slack
* 📝 Notion
* 📄 Google Drive
* 💻 Microsoft Teams
* 📁 Local documents
* 🔗 Other productivity platforms

Each connector imports relevant information into Vowly's memory pipeline while preserving source metadata.

---

# ⚙️ How Memora Works

### 1. Connect

The user connects services such as Gmail, Slack, Calendar, or Notion.

↓

### 2. Ingest

Memora retrieves relevant emails, messages, notes, documents, and events.

↓

### 3. Process

The system cleans, chunks, normalizes, and enriches the information with metadata.

↓

### 4. Embed

Documents and chunks are converted into vector embeddings.

↓

### 5. Store

Vectors and metadata are stored using **MongoDB Atlas Vector Search**.

↓

### 6. Retrieve

When the user asks a question, Vowly performs semantic retrieval to find relevant information.

↓

### 7. Generate

An LLM uses the retrieved context to generate a grounded response.

↓

### 8. Reason

AI agents analyze information for commitments, deadlines, follow-ups, and important events.

↓

### 9. Remind

Memora proactively notifies the user when an important commitment or deadline requires attention.

---

# 🏗️ Technical Architecture

**Frontend**

* React.js
* Vite
* Modern responsive UI
* Conversational AI interface
* Memory timeline
* Reminder dashboard

**Backend**

* Node.js
* Express.js
* REST APIs
* Authentication
* Connector management
* User memory APIs

**Database & Retrieval**

* MongoDB
* MongoDB Atlas
* MongoDB Atlas Vector Search
* Semantic embeddings
* Metadata filtering

**AI Layer**

* OpenAI / Anthropic APIs
* LLM-based reasoning
* Retrieval-Augmented Generation (RAG)
* Prompt engineering
* Embeddings
* Commitment extraction
* Contextual summarization

**Agent & Automation Layer**

* AI agents
* BullMQ
* Redis
* Background workers
* Scheduled jobs
* Reminder generation
* Event processing

---

# 🤖 AI Agent Capabilities

Memora's agent layer can perform tasks such as:

### Commitment Detection

Identify statements such as:

> "I'll send it tomorrow."

> "I'll review the document."

> "Let's follow up next Monday."

### Deadline Extraction

Convert natural language into structured deadlines.

**"I'll send the report by Friday."**

→ Task: Send report
→ Deadline: Friday
→ Status: Pending

### Follow-Up Detection

Identify conversations where a response or action is expected.

### Memory Linking

Connect related emails, meetings, messages, documents, and tasks.

### Reminder Generation

Determine when a reminder should be triggered based on the importance and deadline of a commitment.

---

# 🔐 Privacy-Focused Personal Memory

Because Memora works with personal and potentially sensitive information, privacy is a core design consideration.

The system can be designed around:

* User-level data isolation
* Secure OAuth authentication
* Encrypted credentials/tokens
* Permission-based connectors
* Source-level access controls
* Minimal data retention
* Audit logs
* Ability to disconnect and delete connected data

---

# 📊 Example

### User

"I had a meeting with the client last Tuesday. What did I promise them?"

### Memora

**Client Meeting — July 28**

You committed to:

1. Send the revised proposal
2. Add the requested pricing breakdown
3. Share the updated document by Friday

**Status:** 2 completed, 1 pending

**Upcoming deadline:** Friday

> "Would you like me to remind you tomorrow morning?"

This is the difference between a traditional search system and an **AI-powered personal memory assistant**.

---

# 🎯 Target Users

Memora is initially designed for people who deal with large amounts of information and frequent commitments:

* Freelancers
* Consultants
* Software developers
* Founders
* Project managers
* Researchers
* Sales professionals
* Remote workers
* Students
* Small business owners

---

# 🚧 Current Status

**Early-stage MVP**

The initial version focuses on validating the core concept:

**Connect → Remember → Retrieve → Understand → Detect Commitments → Remind**

The MVP is being designed around real-world workflows of **freelancers and consultants**, where missed follow-ups and scattered information can directly affect productivity and client relationships.

---

# 🚀 Future Vision

Memora aims to evolve from a simple personal knowledge base into a **Personal AI Memory Agent**.

Future capabilities could include:

* Automatic meeting memory
* Cross-platform task tracking
* Smart daily briefings
* "What am I forgetting?" queries
* Relationship and project timelines
* Automatic follow-up suggestions
* Deadline prediction
* Personalized productivity insights
* Voice-based memory search
* Mobile notifications
* Multi-agent workflows

### Long-Term Vision

**Memora becomes the memory layer between you and your digital life.**

Instead of asking:

**"Where did I save it?"**

you ask:

**"Memora, what do I need to remember?"**
