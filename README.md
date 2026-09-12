# TempEd — Email Template Pro

<div align="center">

![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Tests](https://img.shields.io/badge/tests-121%20passed-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-99.27%25-brightgreen.svg)
![Branch Coverage](https://img.shields.io/badge/branches-96.00%25-brightgreen.svg)
![Architecture](https://img.shields.io/badge/architecture-100%25%20client--side-blue.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

**A modern, production-ready email template editor, live responsive simulator, deliverability testing suite, and pre-flight inspector with client-side AI optimization.**

[Live Demo](https://itsrohanpatel.github.io/temped/) · [Report Bug](https://github.com/itsrohanpatel/temped/issues) · [Feature Request](https://github.com/itsrohanpatel/temped/issues)

</div>

---

## 🚀 Overview

**TempEd** is a zero-server, high-performance email authoring environment that replicates the most valuable features of industry leaders like Litmus, Mailmeteor, and Stripo directly in the browser. 

Craft beautiful emails, preview responsiveness across devices, simulate dark mode, run pre-flight clipping checks, inspect deliverability health scores in real time, and auto-detect template variables with fallback support — all while keeping your data 100% local and private.

---

## ✨ Key Features

### ✈️ 1. Pre-Flight Deliverability & Clipping Inspector
- **Gmail 102KB Clipping Alert**: Accurately calculates byte size to warn before Gmail clips your email with `[Message clipped] View entire message`.
- **CAN-SPAM & GDPR Compliance**: Validates opt-out unsubscribe links and physical postal mailing address presence.
- **Image Accessibility & Alt Text**: Scans all `<img>` tags for missing or blank alt attributes that degrade accessibility and trigger spam filters.
- **Insecure Link & Placeholder Audit**: Identifies unencrypted `http://` links and empty `href="#"` buttons.
- **Text-to-Code Ratio**: Analyzes markup density to flag image-heavy or markup-bloated templates.
- **Health Verdict Scorecard**: Consolidated modal report (`Ready to Send`, `Good with Warnings`, `Needs Attention`).

### 📦 2. Curated Responsive Starter Template Library
- **6 Production-Ready Templates**:
  - `Welcome & Onboarding` (SaaS activation flow with social links)
  - `Product Announcement` (Modern feature launch with badge and feature grid)
  - `Tech Newsletter / Digest` (Curated article layout with author avatar)
  - `Transactional Password Reset` (Clean security alert with action button and expiry notice)
  - `Order Receipt & Confirmation` (Itemized billing table with totals and delivery details)
  - `Webinar / Event Invitation` (Date pill, speaker callout, and calendar CTA)
- **One-Click Gallery & Seeding**: Load templates into the editor instantly or seed your personal library from `templates.html`.

### 🧩 3. Bulletproof Component Inserters
- **Outlook MSO Bulletproof Button**: Renders via VML `v:roundrect` with fallback CSS for 100% button consistency across Outlook 2016/2019/365.
- **Responsive 2-Column Grid**: Dual-stack layout tables that fluidly collapse to 100% width on mobile viewports.
- **Content Divider**: Borderless, client-safe separator line.
- **CAN-SPAM Compliance Footer**: Pre-configured unsubscribe mechanism and postal address layout.

### 💾 4. Production Export Suite
- **Download HTML**: Bundles sanitized email HTML with inbox preheader snippet.
- **Plain Text (`.txt`) Generator**: Strips tags while structuring headers, converting hyperlinks to `Text (URL)`, and formatting bullet points for text-only clients.
- **RFC-822 MIME Test Email (`.eml`)**: Exports ready-to-open test email files compatible with Apple Mail, Thunderbird, and Outlook.
- **Copy Rendered Text & Subject**: Instant clipboard tools for quick QA testing.

### 🛡️ 5. Deliverability Health Scorer (0–100)
- **Real-Time Score & Letter Grades**: Calculates health in real time (`Great` 80–100, `Okay` 50–79, `Poor` <50).
- **Curated Spam Trigger Analysis**: Powered by 820+ verified spam trigger patterns, filtering out false-positive conversational terms.
- **Diagnostic Breakdown Modal**:
  - Subject line length validation (optimal 10–60 characters).
  - CAN-SPAM / GDPR compliance unsubscribe footer verification.
  - Insecure HTTP link detection.
  - Excessive capitalization detection (>5 all-caps words).
  - Excessive punctuation penalty (e.g. `!!!`, `???`, `$$$`).
  - Read time and word count estimators.

### 📱 6. Viewport Device Simulator & Dark Mode
- **Responsive Viewport Switcher**: Instant one-click preview frames:
  - **Desktop** (600px width — standard email layout width)
  - **Tablet** (768px width)
  - **Mobile** (375px width — iOS/Android viewport)
- **Dark Mode Simulation**: Toggle dark mode in the preview container to verify background contrast, button legibility, and text invertibility before sending.

### ✉️ 7. Inbox Preheader / Preview Text Injection
- Define preview text that displays next to or beneath your subject line in Gmail, Apple Mail, and Outlook.
- Automatically injected into copied HTML with zero-pixel hidden styling and unicode non-breaking space padding (`&#847;&zwnj;&nbsp;&#8199;&shy;`) to prevent email body content from leaking into the inbox preview snippet.

### 🔄 8. Dynamic Variables with Fallback Syntax & Auto-Discovery
- **Standard Syntax**: `{{variable_name}}` replaced dynamically in subject and body.
- **Fallback Syntax**: `{{first_name|there}}` or `{{company|your team}}` renders default values if the recipient data is empty.
- **Auto-Detect Variables**: One-click scanner that extracts all `{{...}}` tokens from your subject line, preheader, and HTML body, automatically populating the variables manager.

### 🤖 9. Google Gemini AI Enhancements
- **Content Optimization**: Rephrase emails for engagement, conversion, and clarity.
- **Deliverability Feedback**: Instant AI suggestions to improve open and click-through rates.
- **Tone Adjustment**: Switch between professional, casual, urgent, or friendly tones.
- **Subject Line Generator**: Generate 10+ high-converting subject line variations from your content.
- **Spam Keyword Rewriter**: Replace flagged phrases with inbox-safe alternatives.

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
- **AI Engine**: `@google/generative-ai` (Gemini 2.5 Flash Lite)

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 & 22)
- npm or pnpm / bun

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
Run the 121-test suite with Vitest:
```bash
npm test
```

### 4. Test Coverage Report
Generate the v8 code coverage report (enforces >= 80% coverage across statements, branches, functions, and lines):
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
├── index.html                  # Main editor, pre-flight inspector & component inserter
├── settings.html               # Configuration (API keys, custom spam words, signatures)
├── templates.html              # Template library with starter templates seed & export
├── shared-utils.js             # Core utilities: PreFlightInspector, StarterTemplates, ExportTools
├── spam-filter.js              # Deliverability scoring engine & curated spam triggers
├── shared-styles.css           # Core custom styles & color palette tokens
├── vite.config.ts              # Multi-page build config & standalone asset emitter
├── package.json                # Scripts & dependencies
├── test/                       # Test suites (121 tests)
│   ├── preflight-inspector.test.js  # Gmail clipping, CAN-SPAM, GDPR, images, links (25 tests)
│   ├── starter-templates.test.js    # 6 curated starter templates validation (8 tests)
│   ├── export-tools.test.js         # Plain text, RFC-822 .eml, Outlook MSO buttons (12 tests)
│   ├── integration-ui.test.js       # End-to-end DOM UI workflow tests (16 tests)
│   ├── utils.test.js                # Core helpers, variables, viewports, storage (34 tests)
│   ├── spam-engine.test.js          # Deliverability engine & spam scoring (9 tests)
│   ├── preview-features.test.js     # Preheader, viewports & dark mode (7 tests)
│   └── security-templates.test.js   # XSS sanitization & attribute escaping (10 tests)
└── dist/                       # Production bundle output
```

---

## 🔑 Setting Up Gemini AI (Optional)

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Settings** in the top navigation bar of TempEd.
3. Paste your API key and click **Save Gemini Configuration**.
4. Keys are stored strictly in your browser's private `localStorage`.

---

## 🧪 Quality & Test Standards

This project adheres to strict **Test-Driven Development (TDD)** principles:
- **121 automated unit and integration tests** passing with 0 failures.
- **99.27% statement coverage** (target: >= 80%).
- **96.00% branch coverage** (target: >= 80%).
- **100.00% function coverage** (target: >= 80%).
- **99.27% line coverage** (target: >= 80%).
- Tested against Stored/DOM XSS, Unicode mojibake corruptions, attribute breakouts, RFC-822 MIME structure, and regex boundary regressions.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.
