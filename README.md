# TempEd — Email Template Pro

<div align="center">

![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Tests](https://img.shields.io/badge/tests-184%20passed-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-%3E=80%25-brightgreen.svg)
![AI Providers](https://img.shields.io/badge/AI-Groq%20%7C%20Gemini-orange.svg)
![Architecture](https://img.shields.io/badge/architecture-100%25%20client--side-blue.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

**A modern, production-ready email template editor, live responsive simulator, deliverability testing suite, and pre-flight inspector with ultra-fast client-side AI optimization (Groq Cloud & Google Gemini).**

[Live Demo](https://itsrohanpatel.github.io/temped/) · [Report Bug](https://github.com/itsrohanpatel/temped/issues) · [Feature Request](https://github.com/itsrohanpatel/temped/issues)

</div>

---

## 🚀 Overview

**TempEd Pro** is a zero-server, high-performance email authoring environment that replicates the most valuable features of industry leaders like Litmus, Mailmeteor, and Stripo directly in the browser. 

Craft beautiful emails, preview responsiveness across devices, simulate dark mode, run pre-flight clipping checks, inspect deliverability health scores in real time, auto-detect template variables with fallback support, and tap into blazing-fast LLM inference via Groq Cloud and Google Gemini — all while keeping your data 100% local and private.

---

## ✨ Key Features

### 🤖 1. Dual AI Engine (Groq Cloud + Google Gemini)
- **Groq Cloud Ultra-Fast Inference**: Near-instant LLM responses powered by OpenAI-compatible Groq Cloud endpoints.
  - Recommended models: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.6-27b`, `qwen/qwen3.8-27b`, `groq/compound`, `groq/compound-mini`, `allam-2-7b`, and `llama-3.3-70b-versatile`.
- **Live Model Auto-Discovery**: Fetch and rank all active models directly from Groq's `/models` API with one click.
- **Intelligent Auto-Rotation Fallback**:
  - Automatically switches to the next best model when primary models encounter rate limits (HTTP 429) or timeouts.
  - Dynamic cooldown tracking prevents hammering rate-limited endpoints.
  - Seamless failover from Groq to Google Gemini when configured.
- **5 Core AI Writing & Deliverability Capabilities**:
  1. **AI Subject Lines**: Generates 10+ high-converting subject lines with character counts and spam risk indicators. One-click "Use This" injection.
  2. **AI Optimize Content**: Rewrites email copy applying the AIDA framework (Attention, Interest, Desire, Action) to maximize engagement.
  3. **AI Deliverability & Content Suggestions**: Delivers structured feedback across Subject Line, Opening Hook, Call-to-Action, and Spam Avoidance.
  4. **AI Tone Adjustment**: Rewrites emails into Professional, Friendly, Urgent, or Casual tones while preserving HTML structure and dynamic variables.
  5. **AI Spam Word Rewriter**: Scans flagged spam terms and generates JSON replacement mappings to substitute risky words with deliverability-friendly alternatives.

### ✈️ 2. Pre-Flight Deliverability & Clipping Inspector
- **Gmail 102KB Clipping Alert**: Accurately calculates byte size to warn before Gmail clips your email with `[Message clipped] View entire message`. Displays real-time formatted size (e.g. `12.4 KB / 102.0 KB`).
- **CAN-SPAM & GDPR Compliance**: Validates opt-out unsubscribe links and physical postal mailing address presence.
- **Image Accessibility & Alt Text**: Scans all `<img>` tags for missing or blank alt attributes that degrade accessibility and trigger spam filters.
- **Insecure Link & Placeholder Audit**: Identifies unencrypted `http://` links and empty `href="#"` buttons.
- **Text-to-Code Ratio**: Analyzes markup density to flag image-heavy or markup-bloated templates.
- **Health Verdict Scorecard**: Consolidated modal report (`Ready to Send`, `Good with Warnings`, `Needs Attention`).

### 📦 3. Curated Responsive Starter Template Library
- **6 Production-Ready Templates**:
  - `Welcome & Onboarding` (SaaS activation flow with social links)
  - `Product Announcement` (Modern feature launch with badge and feature grid)
  - `Tech Newsletter / Digest` (Curated article layout with author avatar)
  - `Transactional Password Reset` (Clean security alert with action button and expiry notice)
  - `Order Receipt & Confirmation` (Itemized billing table with totals and delivery details)
  - `Webinar / Event Invitation` (Date pill, speaker callout, and calendar CTA)
- **One-Click Gallery & Seeding**: Load templates into the editor instantly or seed your personal library from `templates.html`.

### 🧩 4. Bulletproof Component Inserters
- **Outlook MSO Bulletproof Button**: Renders via VML `v:roundrect` with fallback CSS for 100% button consistency across Outlook 2016/2019/365.
- **Responsive 2-Column Grid**: Dual-stack layout tables that fluidly collapse to 100% width on mobile viewports.
- **Content Divider**: Borderless, client-safe separator line.
- **CAN-SPAM Compliance Footer**: Pre-configured unsubscribe mechanism and postal address layout.

### 💾 5. Production Export Suite
- **Download HTML**: Bundles sanitized email HTML with inbox preheader snippet.
- **Plain Text (`.txt`) Generator**: Strips tags while structuring headers, converting hyperlinks to `Text (URL)`, and formatting bullet points for text-only clients.
- **RFC-822 MIME Test Email (`.eml`)**: Exports ready-to-open test email files compatible with Apple Mail, Thunderbird, and Outlook.
- **Copy Rendered Text & Subject**: Instant clipboard tools for quick QA testing.

### 🛡️ 6. Deliverability Health Scorer (0–100)
- **Real-Time Score & Letter Grades**: Calculates health in real time (`Great` 80–100, `Okay` 50–79, `Poor` <50).
- **Interactive Diagnostics Modal**: Click the header score badge anytime to review exact penalties and optimization tips.
- **Curated Spam Trigger Analysis**: Powered by 820+ verified spam trigger patterns across Overpromise, Urgency, Shady, and Financial categories.
- **Diagnostic Breakdown**:
  - Subject line length validation (optimal 10–60 characters).
  - CAN-SPAM / GDPR compliance unsubscribe footer verification.
  - Insecure HTTP link detection.
  - Excessive capitalization detection (>5 all-caps words).
  - Excessive punctuation penalty (e.g. `!!!`, `???`, `$$$`).
  - Read time and word count estimators.

### 📱 7. Viewport Device Simulator & Dark Mode
- **Responsive Viewport Switcher**: Instant one-click preview frames:
  - **Desktop** (600px width — standard email layout width)
  - **Tablet** (768px width)
  - **Mobile** (375px width — iOS/Android viewport)
- **Dark Mode Simulation**: Toggle dark mode in the preview container to verify background contrast, button legibility, and text invertibility before sending.

### ✉️ 8. Inbox Preheader / Preview Text Injection
- Define preview text that displays next to or beneath your subject line in Gmail, Apple Mail, and Outlook.
- Automatically injected into copied HTML with zero-pixel hidden styling and unicode non-breaking space padding (`&#847;&zwnj;&nbsp;&#8199;&shy;`) to prevent email body content from leaking into the inbox preview snippet.

### 🔄 9. Dynamic Variables with Fallback Syntax & Auto-Discovery
- **Standard Syntax**: `{{variable_name}}` replaced dynamically in subject and body.
- **Fallback Syntax**: `{{first_name|there}}` or `{{company|your team}}` renders default values if recipient data is empty.
- **Auto-Detect Variables**: One-click scanner that extracts all `{{...}}` tokens from your subject line, preheader, and HTML body, automatically populating the variables manager.

### 🔒 10. Enterprise Security & Sanitization
- **100% Client-Side Architecture**: No template content or API keys are ever sent to a third-party server.
- **DOMPurify Sanitization**: Strict XSS prevention in template previews, settings signatures, and custom spam word managers.
- **Attribute Escaping**: Full escaping of dynamic attributes to prevent DOM injection vulnerabilities.

---

## 📊 Deliverability Scoring Rules

| Metric | Condition | Impact |
| :--- | :--- | :--- |
| **Spam Triggers** | Each hit on high-risk phrases | -4 to -8 pts |
| **Sensitive Categories** | High-risk financial (`money`) or shady triggers | -15 pts |
| **Urgency Triggers** | High-pressure urgency or overpromising | -10 pts |
| **Capitalization** | More than 5 all-caps words | -15 pts |
| **Punctuation** | Consecutive punctuation (`!!!`, `???`, `$$`) | -10 pts |
| **Subject Length** | Outside 10–60 characters | -5 pts |
| **Compliance Footer** | Missing unsubscribe / opt-out text | -10 pts |
| **Link Protocol** | Contains unencrypted `http://` links | -10 pts |

*Scores 80–100 receive a **Great** badge; 50–79 receive **Okay**; below 50 receive **Poor**.*

---

## 🛠️ Tech Stack

- **Core**: HTML5, Vanilla JavaScript (ES2022+), CSS3
- **Styling**: Tailwind CSS, FontAwesome 6, Google Fonts (Inter)
- **Sanitization**: DOMPurify 3.x
- **Build Tool**: Vite 6.x (Multi-Page Rollup)
- **Testing**: Vitest 3.x, JSDOM 26.x, @vitest/coverage-v8
- **AI Engines**:
  - **Groq Cloud API**: OpenAI-compatible ultra-fast inference (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen`, `allam`)
  - **Google Generative AI**: Gemini 2.5 Flash Lite (`@google/generative-ai`)

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 & 22)
- npm, pnpm, or bun

### 1. Installation
```bash
git clone https://github.com/itsrohanpatel/temped.git
cd temped
npm install
```

### 2. Development Server
Start the local Vite dev server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Running Tests
Run the full 184-test automated suite with Vitest:
```bash
npm test
```

### 4. Test Coverage Report
Generate the v8 code coverage report:
```bash
npm run test:coverage
```

### 5. Production Build
Build the multi-page static site to `dist/`:
```bash
npm run build
```
Preview the production build locally:
```bash
npm run preview
```

---

## 📁 Project Structure

```text
temped/
├── index.html                       # Main editor, simulator, preflight & AI Copilot
├── settings.html                    # Settings (Groq & Gemini API keys, models, thresholds)
├── templates.html                   # Template library with starter templates & preview
├── shared-utils.js                  # Root utility mirror (PreFlight, Starters, Export)
├── spam-filter.js                   # Root spam engine & deliverability triggers mirror
├── shared-styles.css                # Global styles, variables & animations
├── vite.config.ts                   # Multi-page build config & Rollup asset emitter
├── package.json                     # Scripts & dependencies
├── js/
│   ├── editor/
│   │   ├── editor-app.js            # Main email editor application orchestrator
│   │   ├── ai-assistant.js          # AI Assistant (Groq & Gemini, auto-rotation fallback)
│   │   ├── groq-service.js          # Groq Cloud API service (discovery & completions)
│   │   ├── modal-controller.js      # Modal management and backdrop listeners
│   │   ├── variable-manager.js      # Dynamic variable replacement and auto-discovery
│   │   └── wysiwyg-engine.js        # Contenteditable visual editor & sync engine
│   ├── settings/
│   │   └── settings-manager.js      # Settings controller (API keys, models, preferences)
│   ├── templates/
│   │   └── template-manager.js      # Template library cards, category filter & preview
│   └── shared/
│       ├── shared-utils.js          # PreFlightInspector, StarterTemplates, ExportTools
│       └── spam-filter.js           # Deliverability scoring engine & curated triggers
├── test/                            # Comprehensive Vitest Test Suite (184 tests)
│   ├── ai-assistant.test.js         # AI fallback, prompt rendering, temperatures (12 tests)
│   ├── groq-service.test.js         # Groq models discovery & completion (8 tests)
│   ├── preflight-inspector.test.js   # Gmail clipping, image alt, link security (26 tests)
│   ├── starter-templates.test.js     # 6 curated starter templates validation (8 tests)
│   ├── export-tools.test.js          # Plain text, RFC-822 .eml, MSO buttons (12 tests)
│   ├── integration-ui.test.js        # End-to-end DOM UI workflow tests (16 tests)
│   ├── utils.test.js                 # Core helpers, variables, viewports, storage (35 tests)
│   ├── spam-engine.test.js           # Deliverability engine & spam scoring (10 tests)
│   ├── preview-features.test.js      # Preheader, viewports & dark mode (7 tests)
│   ├── security-templates.test.js    # XSS sanitization & attribute escaping (11 tests)
│   ├── settings-manager.test.js      # Settings persistence & model dropdown (7 tests)
│   ├── template-manager.test.js      # Template gallery filtering & modal preview (5 tests)
│   ├── editor-app.test.js            # Editor orchestrator, health modal, replacers (11 tests)
│   ├── modal-controller.test.js      # Modal visibility & event wiring (5 tests)
│   ├── variable-manager.test.js      # Variable token substitution & fallback (5 tests)
│   └── wysiwyg-engine.test.js        # WYSIWYG commands, HTML synchronization (6 tests)
└── dist/                            # Production bundle output
```

---

## 🔑 Setting Up AI Providers (Optional)

### Option A: Groq Cloud (Recommended for Ultra-Fast Inference)
1. Get a free API key from [Groq Cloud Console](https://console.groq.com/keys).
2. Navigate to **Settings** in TempEd Pro.
3. Under **AI Provider**, select **Groq API**.
4. Enter your API Key (`gsk_...`) and click **Fetch Live Models** to discover available models.
5. Select your preferred model (e.g. `OpenAI GPT-OSS 120B`) and click **Save AI Configuration**.

### Option B: Google Gemini
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Under **AI Provider** in **Settings**, select **Google Gemini**.
3. Enter your Gemini API key and click **Save AI Configuration**.

> **Privacy Note**: All API keys and email templates are stored exclusively in your browser's private `localStorage`. No data is ever transmitted to intermediate proxy servers.

---

## 🧪 Quality & Test Standards

This project adheres to strict **Test-Driven Development (TDD)** principles:
- **184 automated unit and integration tests** passing with 0 failures across 16 test files.
- **>= 80% coverage** enforced across statements, branches, functions, and lines.
- Tested against Stored/DOM XSS, Unicode mojibake corruptions, attribute breakouts, RFC-822 MIME structure, Groq/Gemini API error handling, and regex boundary regressions.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

