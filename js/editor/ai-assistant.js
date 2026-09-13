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

### GOAL
Rewrite the user's email content to be more professional, engaging, and effective, maximizing both deliverability and conversion potential.

### INSTRUCTIONS
1.  **Analyze the original email:** Internally, evaluate the email against the AIDA framework (Attention, Interest, Desire, Action). Identify its weakest points.
2.  **Rewrite for Impact:** Revise the email to strengthen each AIDA stage. Improve the opening hook, clarify the value proposition, create a stronger desire for the offer, and write a clearer, more compelling call-to-action.
3.  **Ensure Professionalism:** Refine the language to be professional and persuasive. Eliminate spam trigger words and awkward phrasing.

### CONSTRAINTS
- The rewritten content must remain under 200 words.
- Preserve the original intent and key information (company names, links, contact details).
- Do not add any commentary or explanation.

### OUTPUT FORMAT
Return only the rewritten email content in its original HTML format.

### ORIGINAL EMAIL CONTENT
{content}`,
            suggest: `{systemPrompt}

### GOAL
Analyze the provided email content and subject line, then provide a concise list of the most critical, actionable suggestions for improvement.

### INSTRUCTIONS
Structure your feedback into the following four sections, using the exact markdown format shown in the example below:
1.  **Subject Line:** Suggest one powerful alternative.
2.  **Opening:** Recommend a change to the first sentence to make it more compelling.
3.  **Call-to-Action (CTA):** Propose a more direct and persuasive CTA.
4.  **Deliverability:** Identify one key change to avoid spam filters.

### CONSTRAINTS
- Your entire response must be under 150 words.
- Be extremely specific and actionable.

### EXAMPLE
**Input Content:** "Hello, check out our new product. It's on sale for a limited time only! Click here to buy now."
**Perfect Output:**
**1. Subject Line:** Instead of "New Product," try "Your Exclusive First Look at [Product Name]."
**2. Opening:** Start with the main benefit, such as "Solve [Problem] in minutes with our new..."
**3. Call-to-Action (CTA):** Change "Click here" to a value-focused CTA like "Get Your [Product Name] Now."
**4. Deliverability:** Avoid the phrase "limited time only," as it can trigger spam filters. Use "offer ends Friday" instead.

### EMAIL TO ANALYZE
Subject: {subjectLine}
Content: {content}`,
            tone: `{systemPrompt}

### GOAL
Rewrite the provided email content to match a {tone} tone, ensuring the core message, structure, and all details (links, variables) remain intact.

### CONSTRAINTS
- Return only the rewritten email content.
- Do not include any introductory text, explanations, or labels.

### ORIGINAL CONTENT
{content}`,
            subject: `{systemPrompt}

### GOAL
Generate {numSubjects} compelling, high-converting subject lines for the provided email content.

### INSTRUCTIONS
- Analyze the email's core value proposition.
- Create subject lines that are intriguing, benefit-oriented, and personalized.
- If the original subject uses variables like {{company_name}}, you may use them in your suggestions.

### OUTPUT FORMAT
Return only the {numSubjects} subject lines, one per line. Do not use numbers, bullets, or any extra text.

### EMAIL CONTEXT
Current Subject: {subjectLine}
Email Content: {content}`,
            rewrite: `{systemPrompt}

### GOAL
Analyze the provided EMAIL_HTML and replace specific spam-trigger words/phrases from the TERMS list with safer, more professional alternatives.

### CRITICAL RULES
1.  **Format:** Your output MUST be a valid JSON array of objects with the shape: [{"from": "original_word", "to": "replacement_word"}].
2.  **Replacements:** NEVER suggest the same word as a replacement. The "to" value must be a meaningful improvement.
3.  **Safety:** The "to" value must be a natural, non-spammy alternative.
4.  **Precision:** Replace ONLY the provided words when they appear as standalone text. Do NOT alter HTML tags, attributes, links, or variables (e.g., {{name}}). Match case where sensible.
5.  **Omission:** If you cannot find a genuinely better replacement for a term, OMIT it from the final JSON array.

### EXAMPLE
**TERMS:** ["free gift", "act now"]
**Perfect Output:** [{"from":"free gift","to":"complimentary gift"},{"from":"act now","to":"get started"}]

### TERMS TO REPLACE
{terms}

### EMAIL_HTML
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
        content = '',
        subject = '',
        tone = 'professional',
        terms = [],
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
        const formattedPrompt = this.formatPrompt(template, {
            systemPrompt,
            content,
            subjectLine: subject,
            subject,
            tone,
            numSubjects: (typeof localStorage !== 'undefined' && localStorage.getItem('num-subjects')) || '10',
            terms: JSON.stringify(terms)
        });
        const temperature = this.getTemperatureForFeature(feature);

        // Filter out candidates in active cooldown, but keep all if all are cooled
        let activeCandidates = candidates.filter(c => !this.isCooledDown(c.model));
        if (activeCandidates.length === 0) {
            activeCandidates = candidates;
        }

        let lastError = null;

        for (let i = 0; i < activeCandidates.length; i++) {
            const candidate = activeCandidates[i];

            try {
                if (candidate.provider === 'groq') {
                    const messages = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: formattedPrompt }
                    ];
                    return await GroqService.generateChatCompletion({
                        apiKey: candidate.apiKey,
                        model: candidate.model,
                        messages,
                        temperature,
                        maxTokens: 2048,
                        fetchFn: fetchFn || (typeof fetch !== 'undefined' ? fetch : null)
                    });
                } else if (candidate.provider === 'gemini') {
                    const GoogleGenAI = clientClass || (typeof window !== 'undefined' ? window.GoogleGenerativeAI : null);
                    if (!GoogleGenAI) {
                        throw new Error('GoogleGenerativeAI library is not loaded.');
                    }
                    const genAI = new GoogleGenAI(candidate.apiKey);
                    const model = genAI.getGenerativeModel({
                        model: candidate.model,
                        generationConfig: {
                            temperature,
                            maxOutputTokens: 2048
                        }
                    });
                    const result = await model.generateContent(formattedPrompt);
                    return result.response.text();
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
