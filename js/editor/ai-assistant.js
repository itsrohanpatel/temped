/**
 * TempEd Pro - AI Assistant Module
 * Integrates with Google Gemini API and Groq Cloud API for email optimization, suggestions,
 * tone changes, and spam rewrites, with live model auto-discovery and intelligent auto-rotate fallback.
 */

import { GroqService } from './groq-service.js';

export class AIAssistant {
    constructor() {
        this.cooldowns = new Map();
        this.defaultPromptTemplates = {
            optimize: `{systemPrompt}

### ROLE & GOAL
You are a world-class conversion copywriter and email deliverability specialist. Rewrite the user's email to maximize engagement, inbox deliverability, and click-through rate using AIDA (Attention, Interest, Desire, Action) and PAS (Problem, Agitate, Solution) principles.

### STRICT RULES & CONSTRAINTS
1. **HTML FORMAT ONLY:** Return ONLY valid HTML markup using clean email-safe tags (<p>, <strong>, <em>, <a>, <ul>, <li>). Do NOT use markdown syntax (like **bold** or # headings) inside or outside the HTML.
2. **NO CHATTER:** Do NOT include any introductory or concluding text, explanations, or labels (e.g., no "Here is the email:"). Start directly with the opening HTML tag.
3. **SPAM PREVENTION:** Avoid spam-trigger phrases (e.g., "100% free", "risk-free", "buy now", "click here", "guaranteed"). Never use ALL-CAPS words or excessive exclamation points.
4. **LENGTH:** Keep the rewritten email under 200 words.
5. **PRESERVE ESSENTIALS:** Retain all original URLs, links, dynamic merge variables (e.g. {{name}}, {{first_name}}), and core factual details.

### ORIGINAL EMAIL CONTENT
{content}`,
            suggest: `{systemPrompt}

### ROLE & GOAL
Analyze the provided email content and subject line, then provide a concise, high-impact list of the 4 most critical improvements.

### REQUIRED STRUCTURE
Provide your feedback in exactly these four numbered sections:
**1. Subject Line:** One compelling, high-converting alternative subject line.
**2. Opening Hook:** A revised first sentence that immediately captures interest or addresses a core problem.
**3. Call-to-Action (CTA):** A direct, value-focused CTA that replaces generic "click here" or "buy now" phrasing.
**4. Deliverability:** Specific changes to avoid spam filters and improve inbox placement.

### CONSTRAINTS
- Keep total response under 150 words.
- Be concise, direct, and actionable.
- Do not include conversational filler before or after the feedback.

### EMAIL TO ANALYZE
Subject: {subjectLine}
Content: {content}`,
            tone: `{systemPrompt}

### ROLE & GOAL
Rewrite the provided email content to match a {tone} tone while maintaining high inbox deliverability, persuasive clarity, and professional standards.

### STRICT RULES & CONSTRAINTS
1. **FORMAT:** Return ONLY the rewritten email in valid HTML (<p>, <strong>, <a>, etc.). No markdown syntax (**bold**, #).
2. **NO CHATTER:** Zero introductory text, commentary, or labels. Start directly with the HTML.
3. **SPAM SAFETY:** Even for urgent or excited tones, do NOT shout in ALL-CAPS, do not use multiple exclamation points (!!!), and do not use spam-flagged trigger words.
4. **PRESERVE DETAILS:** Keep all URLs, links, merge variables (e.g. {{name}}), and core facts intact.

### ORIGINAL CONTENT
{content}`,
            subject: `{systemPrompt}

### ROLE & GOAL
Generate {numSubjects} compelling, high-converting subject lines for the provided email.

### FORMULAS TO APPLY
Provide a mix of proven subject line styles:
- Curiosity / Intrigue
- Benefit / Outcome-driven
- Personal / Conversational
- Urgency / Time-sensitive (without spam trigger words)
- Question-based

### OUTPUT FORMAT
- Return EXACTLY {numSubjects} lines, one subject line per line.
- Do NOT use numbers (e.g. "1. "), bullet points, quotes, emojis, or markdown.
- Do NOT include any introductory or concluding text.
- If merge variables (e.g. {{first_name}}) fit naturally, you may use them.

### EMAIL CONTEXT
Current Subject: {subjectLine}
Email Content: {content}`,
            rewrite: `{systemPrompt}

### ROLE & GOAL
Analyze the provided email content and replace spam-trigger words and phrases from the TERMS list with safer, high-deliverability alternatives.

### CRITICAL RULES
1. **OUTPUT FORMAT:** Return ONLY a valid JSON array of replacement objects: [{"from": "original_term", "to": "safer_alternative"}].
2. **NO CODE FENCES OR TEXT:** Do NOT wrap in markdown code fences (no \`\`\`json). Do NOT add explanations, notes, or chit-chat. Output raw JSON only.
3. **BETTER ALTERNATIVE:** The "to" replacement MUST be a natural, deliverable, non-spam alternative. Never return the same word.
4. **STANDALONE ONLY:** Replace only standalone words and phrases. NEVER modify HTML tags, attribute names, href URLs, or template variables (e.g. {{name}}).
5. **OMIT UNNECESSARY:** If a term cannot be improved meaningfully, omit it from the array.

### TERMS TO REPLACE
{terms}

### EMAIL CONTENT
{content}`
        };
    }

    getDefaultPromptTemplates() {
        return { ...this.defaultPromptTemplates };
    }

    getPromptTemplate(key) {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(`prompt-${key}`);
            if (stored && stored.trim()) return stored;
        }
        return this.defaultPromptTemplates[key] || '';
    }

    formatPrompt(template, variables = {}) {
        let result = template;
        for (const [key, val] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), val !== undefined ? String(val) : '');
        }
        return result;
    }

    getTemperatureForFeature(feature) {
        if (typeof localStorage === 'undefined') return 1.0;
        const mode = localStorage.getItem('ai-temperature-mode') || 'normal';
        let tempVal;
        if (mode === 'advanced' && feature) {
            tempVal = localStorage.getItem(`ai-temperature-${feature}`);
        }
        if (tempVal === null || tempVal === undefined) {
            tempVal = localStorage.getItem('ai-temperature');
        }
        const parsed = parseFloat(tempVal);
        return isNaN(parsed) ? 1.0 : parsed;
    }

    getProvider() {
        if (typeof localStorage === 'undefined') return 'auto';
        const saved = localStorage.getItem('ai-provider');
        if (saved && ['groq', 'gemini', 'auto'].includes(saved)) {
            return saved;
        }
        const groqKey = this.getGroqApiKey();
        const geminiKey = this.getGeminiApiKey();
        if (groqKey && !geminiKey) return 'groq';
        if (geminiKey && !groqKey) return 'gemini';
        return 'auto';
    }

    getGeminiApiKey() {
        if (typeof localStorage === 'undefined') return '';
        return (localStorage.getItem('gemini-api-key') || '').trim();
    }

    getGroqApiKey() {
        if (typeof localStorage === 'undefined') return '';
        return (localStorage.getItem('groq-api-key') || '').trim();
    }

    getGeminiModelName() {
        if (typeof localStorage === 'undefined') return 'gemini-2.5-flash-lite';
        const key = (typeof window !== 'undefined' && window.EMAIL_EDITOR_CONSTANTS?.STORAGE_KEYS?.AI_MODEL) || 'ai-model-name';
        return localStorage.getItem(key) || 'gemini-2.5-flash-lite';
    }

    getGroqModelName() {
        if (typeof localStorage === 'undefined') return 'openai/gpt-oss-120b';
        return localStorage.getItem('groq-model-name') || 'openai/gpt-oss-120b';
    }

    isAutoRotateEnabled() {
        if (typeof localStorage === 'undefined') return true;
        return localStorage.getItem('ai-auto-rotate') !== 'false';
    }

    getSystemPrompt() {
        if (typeof localStorage === 'undefined') return 'You are an expert email marketing assistant.';
        return localStorage.getItem('system-prompt') || 'You are an expert email marketing assistant. Help users create professional, engaging, and spam-filter-friendly emails.';
    }

    setCooldown(modelOrKey, durationMs = 60000) {
        this.cooldowns.set(modelOrKey, Date.now() + durationMs);
    }

    isCooledDown(modelOrKey) {
        const until = this.cooldowns.get(modelOrKey);
        return typeof until === 'number' && until > Date.now();
    }

    /**
     * Build prioritized sequence of fallback model candidates.
     */
    getFallbackCandidates() {
        const provider = this.getProvider();
        const groqKey = this.getGroqApiKey();
        const geminiKey = this.getGeminiApiKey();
        const preferredGroqModel = this.getGroqModelName();
        const preferredGeminiModel = this.getGeminiModelName();

        let liveGroqModels = [];
        if (typeof localStorage !== 'undefined') {
            try {
                const cached = JSON.parse(localStorage.getItem('groq-cached-models') || '[]');
                if (Array.isArray(cached)) {
                    liveGroqModels = cached.map(m => m.id).filter(Boolean);
                }
            } catch (_) {}
        }

        const defaultGroqHierarchy = [
            preferredGroqModel,
            ...liveGroqModels,
            'openai/gpt-oss-120b',
            'openai/gpt-oss-20b',
            'qwen/qwen3.6-27b',
            'qwen/qwen3.8-27b',
            'groq/compound',
            'groq/compound-mini',
            'allam-2-7b'
        ];

        // Deduplicate groq hierarchy
        const uniqueGroqModels = Array.from(new Set(defaultGroqHierarchy));

        const defaultGeminiHierarchy = Array.from(new Set([
            preferredGeminiModel,
            'gemini-2.5-flash-lite',
            'gemini-1.5-flash',
            'gemini-1.5-pro'
        ]));

        const candidates = [];

        if (provider === 'groq' && groqKey) {
            uniqueGroqModels.forEach(model => {
                candidates.push({ provider: 'groq', model, apiKey: groqKey });
            });
        } else if (provider === 'gemini' && geminiKey) {
            defaultGeminiHierarchy.forEach(model => {
                candidates.push({ provider: 'gemini', model, apiKey: geminiKey });
            });
        } else {
            // 'auto' mode or hybrid fallback: prioritize Groq for speed, fall back to Gemini
            if (groqKey) {
                uniqueGroqModels.forEach(model => {
                    candidates.push({ provider: 'groq', model, apiKey: groqKey });
                });
            }
            if (geminiKey) {
                defaultGeminiHierarchy.forEach(model => {
                    candidates.push({ provider: 'gemini', model, apiKey: geminiKey });
                });
            }
        }

        return candidates;
    }

    /**
     * Generate content with intelligent model auto-rotation fallback.
     */
    async generateWithFallback({
        feature,
        prompt = null,
        content = '',
        subject = '',
        tone = 'professional',
        terms = [],
        temperature = null,
        clientClass = null,
        fetchFn = null,
        onModelRotated = null
    }) {
        const candidates = this.getFallbackCandidates();
        if (candidates.length === 0) {
            throw new Error('No AI API key found. Please configure your Groq or Gemini API key in Settings.');
        }

        const autoRotate = this.isAutoRotateEnabled();
        const template = this.getPromptTemplate(feature);
        const systemPrompt = this.getSystemPrompt();
        const formattedPrompt = prompt || this.formatPrompt(template, {
            systemPrompt,
            content,
            subjectLine: subject,
            subject,
            tone,
            numSubjects: (typeof localStorage !== 'undefined' && localStorage.getItem('num-subjects')) || '10',
            terms: Array.isArray(terms) ? JSON.stringify(terms) : String(terms || '[]')
        });
        const finalTemperature = (typeof temperature === 'number' && !isNaN(temperature))
            ? temperature
            : this.getTemperatureForFeature(feature);

        // Filter out candidates in active cooldown, but keep all if all are cooled
        let activeCandidates = candidates.filter(c => !this.isCooledDown(c.model));
        if (activeCandidates.length === 0) {
            activeCandidates = candidates;
        }

        let lastError = null;

        const featureMaxTokens = {
            optimize: 800,
            suggest: 500,
            tone: 800,
            subject: 250,
            rewrite: 500
        };
        const safeMaxTokens = featureMaxTokens[feature] || 800;

        for (let i = 0; i < activeCandidates.length; i++) {
            const candidate = activeCandidates[i];

            try {
                if (candidate.provider === 'groq') {
                    const messages = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: formattedPrompt }
                    ];
                    const rawOutput = await GroqService.generateChatCompletion({
                        apiKey: candidate.apiKey,
                        model: candidate.model,
                        messages,
                        temperature: finalTemperature,
                        maxTokens: safeMaxTokens,
                        fetchFn: fetchFn || (typeof fetch !== 'undefined' ? fetch : null)
                    });
                    return GroqService.cleanOutput(rawOutput);
                } else if (candidate.provider === 'gemini') {
                    const GoogleGenAI = clientClass || (typeof window !== 'undefined' ? window.GoogleGenerativeAI : null);
                    if (!GoogleGenAI) {
                        throw new Error('GoogleGenerativeAI library is not loaded.');
                    }
                    const genAI = new GoogleGenAI(candidate.apiKey);
                    const model = genAI.getGenerativeModel({
                        model: candidate.model,
                        generationConfig: {
                            temperature: finalTemperature,
                            maxOutputTokens: safeMaxTokens
                        }
                    });
                    const result = await model.generateContent(formattedPrompt);
                    return GroqService.cleanOutput(result.response.text());
                }
            } catch (err) {
                lastError = err;

                // Cooldown the failing model (60s for rate limit, 30s for other errors)
                const cooldownDuration = err.isRateLimit ? 60000 : 30000;
                this.setCooldown(candidate.model, cooldownDuration);

                if (!autoRotate) {
                    throw err;
                }

                // If another candidate exists, trigger rotation callback and continue
                const nextCandidate = activeCandidates[i + 1];
                if (nextCandidate && typeof onModelRotated === 'function') {
                    onModelRotated({
                        fromModel: candidate.model,
                        fromProvider: candidate.provider,
                        toModel: nextCandidate.model,
                        toProvider: nextCandidate.provider,
                        reason: err.message || 'Error occurred'
                    });
                }
            }
        }

        throw lastError || new Error('All candidate AI models failed.');
    }

    /**
     * Backward-compatible generate method.
     */
    async generate(options) {
        return this.generateWithFallback(options);
    }
}

if (typeof window !== 'undefined') {
    window.AIAssistant = AIAssistant;
}
