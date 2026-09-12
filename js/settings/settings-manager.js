/**
 * TempEd Pro - Settings Manager Module
 * Manages user preferences, Gemini API credentials, prompt templates, custom spam words, and signatures.
 */

import { GroqService } from '../editor/groq-service.js';

export class SettingsManager {
    constructor() {
        this.advancedTempFeatures = ['optimize', 'suggest', 'tone', 'subject', 'rewrite'];
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.initTempModeSelector();
    }

    loadSettings() {
        // AI Provider Mode
        const provider = localStorage.getItem('ai-provider') || 'auto';
        const providerRadio = document.querySelector(`input[name="ai-provider"][value="${provider}"]`);
        if (providerRadio) providerRadio.checked = true;
        this.updateProviderCardStyles(provider);

        // Groq API Configuration
        const groqApiKey = localStorage.getItem('groq-api-key') || '';
        const groqKeyEl = document.getElementById('groq-api-key');
        if (groqKeyEl) groqKeyEl.value = groqApiKey;

        const groqModel = localStorage.getItem('groq-model-name') || 'llama-3.3-70b-versatile';
        const cachedGroqModels = localStorage.getItem('groq-cached-models');
        if (cachedGroqModels) {
            try {
                const models = JSON.parse(cachedGroqModels);
                if (Array.isArray(models) && models.length > 0) {
                    this.populateGroqModelSelect(models, groqModel);
                } else {
                    const groqSelect = document.getElementById('groq-model-select');
                    if (groqSelect) groqSelect.value = groqModel;
                }
            } catch (_) {
                const groqSelect = document.getElementById('groq-model-select');
                if (groqSelect) groqSelect.value = groqModel;
            }
        } else {
            const groqSelect = document.getElementById('groq-model-select');
            if (groqSelect) groqSelect.value = groqModel;
        }

        const autoRotate = localStorage.getItem('ai-auto-rotate') !== 'false';
        const autoRotateEl = document.getElementById('ai-auto-rotate');
        if (autoRotateEl) autoRotateEl.checked = autoRotate;

        // Gemini API Configuration
        const geminiApiKey = localStorage.getItem('gemini-api-key') || '';
        const systemPrompt = localStorage.getItem('system-prompt') || 'You are an expert email marketing assistant. Help users create professional, engaging, and spam-filter-friendly emails.';
        
        const apiKeyEl = document.getElementById('gemini-api-key');
        if (apiKeyEl) apiKeyEl.value = geminiApiKey;

        const sysPromptEl = document.getElementById('system-prompt');
        if (sysPromptEl) sysPromptEl.value = systemPrompt;

        const aiModelKey = (typeof window !== 'undefined' && window.EMAIL_EDITOR_CONSTANTS?.STORAGE_KEYS?.AI_MODEL) || 'ai-model-name';
        const aiModel = localStorage.getItem(aiModelKey) || 'gemini-2.5-flash-lite';
        const aiModelEl = document.getElementById('ai-model');
        if (aiModelEl) aiModelEl.value = aiModel;

        const numSubjects = localStorage.getItem('num-subjects') || '10';
        const numSubjectsEl = document.getElementById('num-subjects');
        if (numSubjectsEl) numSubjectsEl.value = numSubjects;

        const tempMode = localStorage.getItem('ai-temperature-mode') || 'normal';
        const radio = document.querySelector(`input[name="temp-mode"][value="${tempMode}"]`);
        if (radio) radio.checked = true;
        this.toggleTempModeView(tempMode);

        const globalTemp = localStorage.getItem('ai-temperature') || '1.0';
        const globalTempEl = document.getElementById('ai-temperature');
        if (globalTempEl) globalTempEl.value = globalTemp;
        const tempValEl = document.getElementById('temperature-value');
        if (tempValEl) tempValEl.textContent = globalTemp;

        this.advancedTempFeatures.forEach(feature => {
            const temp = localStorage.getItem(`ai-temperature-${feature}`) || '1.0';
            const featureInput = document.getElementById(`ai-temperature-${feature}`);
            if (featureInput) featureInput.value = temp;
            const featureVal = document.getElementById(`temperature-value-${feature}`);
            if (featureVal) featureVal.textContent = temp;
        });

        this.loadCustomSpamWords();

        const signature = localStorage.getItem('email-signature') || '';
        const sigEl = document.getElementById('signature-html');
        if (sigEl) sigEl.value = signature;
        this.updateSignaturePreview();

        const defaults = this.getDefaultPromptTemplates();
        const promptOptimize = document.getElementById('prompt-optimize');
        if (promptOptimize) promptOptimize.value = localStorage.getItem('prompt-optimize') || defaults.optimize;
        const promptSuggest = document.getElementById('prompt-suggest');
        if (promptSuggest) promptSuggest.value = localStorage.getItem('prompt-suggest') || defaults.suggest;
        const promptTone = document.getElementById('prompt-tone');
        if (promptTone) promptTone.value = localStorage.getItem('prompt-tone') || defaults.tone;
        const promptSubject = document.getElementById('prompt-subject');
        if (promptSubject) promptSubject.value = localStorage.getItem('prompt-subject') || defaults.subject;
        const promptRewrite = document.getElementById('prompt-rewrite');
        if (promptRewrite) promptRewrite.value = localStorage.getItem('prompt-rewrite') || defaults.rewrite;
    }

    bindEvents() {
        const bindClick = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', handler);
        };

        bindClick('save-ai-config', () => this.saveAIConfig());
        bindClick('toggle-api-key', () => this.toggleApiKeyVisibility());
        bindClick('toggle-groq-api-key', () => this.toggleGroqApiKeyVisibility());
        bindClick('fetch-groq-models-btn', () => this.fetchLiveGroqModels());

        document.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.updateProviderCardStyles(e.target.value));
        });

        const aiTemp = document.getElementById('ai-temperature');
        if (aiTemp) {
            aiTemp.addEventListener('input', (e) => {
                const display = document.getElementById('temperature-value');
                if (display) display.textContent = e.target.value;
            });
        }

        this.advancedTempFeatures.forEach(feature => {
            const el = document.getElementById(`ai-temperature-${feature}`);
            if (el) {
                el.addEventListener('input', (e) => {
                    const display = document.getElementById(`temperature-value-${feature}`);
                    if (display) display.textContent = e.target.value;
                });
            }
        });

        bindClick('save-prompt-templates', () => this.savePromptTemplates());
        bindClick('reset-prompt-templates', () => this.resetPromptTemplates());
        bindClick('apply-bulk-prompts', () => this.applyBulkPrompts());
        bindClick('export-all-prompts', () => this.exportAllPrompts());

        const importPromptsFile = document.getElementById('import-prompts-file');
        bindClick('import-prompts', () => importPromptsFile && importPromptsFile.click());
        if (importPromptsFile) importPromptsFile.addEventListener('change', (e) => this.importPrompts(e));

        bindClick('copy-all-prompts', () => this.copyAllPromptsToClipboard());
        bindClick('add-spam-word-btn', () => this.addCustomSpamWord());
        bindClick('export-spam-words', () => this.exportSpamWords());

        const importSpamFile = document.getElementById('import-file');
        bindClick('import-spam-words', () => importSpamFile && importSpamFile.click());
        if (importSpamFile) importSpamFile.addEventListener('change', (e) => this.importSpamWords(e));

        const sigEl = document.getElementById('signature-html');
        if (sigEl) sigEl.addEventListener('input', () => this.updateSignaturePreview());

        bindClick('save-signature', () => this.saveSignature());
        bindClick('clear-signature', () => this.clearSignature());
        bindClick('insert-signature-to-editor', () => this.insertSignatureToEditor());
        bindClick('reset-all-settings', () => this.resetAllSettings());
    }

    initTempModeSelector() {
        document.querySelectorAll('input[name="temp-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.toggleTempModeView(e.target.value));
        });
    }

    toggleTempModeView(mode) {
        const normalContainer = document.getElementById('normal-temp-container');
        const advancedContainer = document.getElementById('advanced-temp-container');

        if (mode === 'advanced') {
            if (normalContainer) normalContainer.classList.add('hidden');
            if (advancedContainer) advancedContainer.classList.remove('hidden');
        } else {
            if (normalContainer) normalContainer.classList.remove('hidden');
            if (advancedContainer) advancedContainer.classList.add('hidden');
        }
    }

    getDefaultPromptTemplates() {
        return {
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

    savePromptTemplates() {
        const ids = ['prompt-optimize', 'prompt-suggest', 'prompt-tone', 'prompt-subject', 'prompt-rewrite'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value.trim()) {
                localStorage.setItem(id, el.value);
            }
        });
        this.showNotification('Prompt templates saved successfully!');
    }

    resetPromptTemplates() {
        if (typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm('Reset all AI prompt templates to the original defaults?')) return;
        const defaults = this.getDefaultPromptTemplates();
        ['optimize', 'suggest', 'tone', 'subject', 'rewrite'].forEach(key => {
            const el = document.getElementById(`prompt-${key}`);
            if (el) el.value = defaults[key];
            localStorage.setItem(`prompt-${key}`, defaults[key]);
        });
        this.showNotification('Prompt templates reset to defaults!');
    }

    applyBulkPrompts() {
        const bulkEl = document.getElementById('bulk-prompt-text');
        if (!bulkEl) return;
        const bulkText = bulkEl.value.trim();
        if (!bulkText) {
            this.showNotification('Please enter prompt text to apply to all templates', 'error');
            return;
        }

        if (bulkText.includes('=== SYSTEM PROMPT ===') || bulkText.includes('=== OPTIMIZE PROMPT ===')) {
            this.parseAndApplyStructuredPrompts(bulkText);
        } else {
            if (typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm('This will replace ALL prompt templates with the same text. Are you sure?')) {
                return;
            }

            ['prompt-optimize', 'prompt-suggest', 'prompt-tone', 'prompt-subject', 'prompt-rewrite'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = bulkText;
                localStorage.setItem(id, bulkText);
            });

            bulkEl.value = '';
            this.showNotification('All prompt templates updated successfully!');
        }
    }

    parseAndApplyStructuredPrompts(text) {
        try {
            const prompts = this.extractPromptsFromStructuredText(text);
            let updatedCount = 0;

            if (prompts.systemPrompt) {
                const sysEl = document.getElementById('system-prompt');
                if (sysEl) sysEl.value = prompts.systemPrompt;
                localStorage.setItem('system-prompt', prompts.systemPrompt);
                updatedCount++;
            }

            const promptMappings = {
                optimize: 'prompt-optimize',
                suggest: 'prompt-suggest',
                tone: 'prompt-tone',
                subject: 'prompt-subject',
                rewrite: 'prompt-rewrite'
            };

            Object.keys(promptMappings).forEach(key => {
                if (prompts[key]) {
                    const elementId = promptMappings[key];
                    const el = document.getElementById(elementId);
                    if (el) el.value = prompts[key];
                    localStorage.setItem(elementId, prompts[key]);
                    updatedCount++;
                }
            });

            if (updatedCount > 0) {
                const bulkEl = document.getElementById('bulk-prompt-text');
                if (bulkEl) bulkEl.value = '';
                this.showNotification(`Successfully updated ${updatedCount} prompt template(s)!`);
            } else {
                this.showNotification('No valid prompts found in the structured format', 'error');
            }
        } catch (_) {
            this.showNotification('Error parsing structured prompts. Please check the format.', 'error');
        }
    }

    extractPromptsFromStructuredText(text) {
        const prompts = {};
        const sections = [
            { key: 'systemPrompt', pattern: /=== SYSTEM PROMPT ===\s*\n(.*?)(?=\n===|$)/s },
            { key: 'optimize', pattern: /=== OPTIMIZE PROMPT ===\s*\n(.*?)(?=\n===|$)/s },
            { key: 'suggest', pattern: /=== SUGGEST PROMPT ===\s*\n(.*?)(?=\n===|$)/s },
            { key: 'tone', pattern: /=== TONE PROMPT ===\s*\n(.*?)(?=\n===|$)/s },
            { key: 'subject', pattern: /=== SUBJECT PROMPT ===\s*\n(.*?)(?=\n===|$)/s },
            { key: 'rewrite', pattern: /=== REWRITE PROMPT ===\s*\n(.*?)(?=\n===|$)/s }
        ];

        sections.forEach(section => {
            const match = text.match(section.pattern);
            if (match && match[1]) {
                prompts[section.key] = match[1].trim();
            }
        });

        return prompts;
    }

    exportAllPrompts() {
        const prompts = {
            optimize: localStorage.getItem('prompt-optimize') || this.getDefaultPromptTemplates().optimize,
            suggest: localStorage.getItem('prompt-suggest') || this.getDefaultPromptTemplates().suggest,
            tone: localStorage.getItem('prompt-tone') || this.getDefaultPromptTemplates().tone,
            subject: localStorage.getItem('prompt-subject') || this.getDefaultPromptTemplates().subject,
            rewrite: localStorage.getItem('prompt-rewrite') || this.getDefaultPromptTemplates().rewrite,
            systemPrompt: localStorage.getItem('system-prompt') || '',
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(prompts, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prompt-templates-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('All prompts exported successfully!');
    }

    importPrompts(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (typeof window !== 'undefined' && window.confirm && !window.confirm('This will replace all current prompt templates. Are you sure?')) {
                    event.target.value = '';
                    return;
                }

                ['optimize', 'suggest', 'tone', 'subject', 'rewrite'].forEach(key => {
                    if (importedData[key]) {
                        const el = document.getElementById(`prompt-${key}`);
                        if (el) el.value = importedData[key];
                        localStorage.setItem(`prompt-${key}`, importedData[key]);
                    }
                });

                if (importedData.systemPrompt) {
                    const sysEl = document.getElementById('system-prompt');
                    if (sysEl) sysEl.value = importedData.systemPrompt;
                    localStorage.setItem('system-prompt', importedData.systemPrompt);
                }

                this.showNotification('Prompts imported successfully!');
            } catch (_) {
                this.showNotification('Error importing prompts. Invalid file format.', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    copyAllPromptsToClipboard() {
        const prompts = {
            optimize: localStorage.getItem('prompt-optimize') || this.getDefaultPromptTemplates().optimize,
            suggest: localStorage.getItem('prompt-suggest') || this.getDefaultPromptTemplates().suggest,
            tone: localStorage.getItem('prompt-tone') || this.getDefaultPromptTemplates().tone,
            subject: localStorage.getItem('prompt-subject') || this.getDefaultPromptTemplates().subject,
            rewrite: localStorage.getItem('prompt-rewrite') || this.getDefaultPromptTemplates().rewrite,
            systemPrompt: localStorage.getItem('system-prompt') || ''
        };

        const textToCopy = `=== AI PROMPT TEMPLATES ===
Generated: ${new Date().toLocaleString()}

=== SYSTEM PROMPT ===
${prompts.systemPrompt}

=== OPTIMIZE PROMPT ===
${prompts.optimize}

=== SUGGEST PROMPT ===
${prompts.suggest}

=== TONE PROMPT ===
${prompts.tone}

=== SUBJECT PROMPT ===
${prompts.subject}

=== REWRITE PROMPT ===
${prompts.rewrite}`;

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.showNotification('All prompts copied to clipboard!');
            }).catch(() => {
                this.showNotification('Failed to copy to clipboard', 'error');
            });
        }
    }

    updateProviderCardStyles(selectedProvider) {
        ['auto', 'groq', 'gemini'].forEach(p => {
            const card = document.getElementById(`card-provider-${p}`);
            if (!card) return;
            if (p === selectedProvider) {
                card.style.borderColor = 'var(--color-blue-violet, #6366f1)';
                card.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
            } else {
                card.style.borderColor = 'var(--color-border, #e2e8f0)';
                card.style.backgroundColor = 'transparent';
            }
        });
    }

    populateGroqModelSelect(models, selectedValue) {
        const select = document.getElementById('groq-model-select');
        if (!select) return;

        select.innerHTML = '';
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name || m.id;
            select.appendChild(opt);
        });

        if (selectedValue && models.some(m => m.id === selectedValue)) {
            select.value = selectedValue;
        } else if (models.length > 0) {
            select.value = models[0].id;
        }
    }

    async fetchLiveGroqModels() {
        const apiKeyEl = document.getElementById('groq-api-key');
        const apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';

        if (!apiKey) {
            this.showNotification('Please enter your Groq API key first to discover live models.', 'error');
            return;
        }

        const btn = document.getElementById('fetch-groq-models-btn');
        const statusEl = document.getElementById('groq-models-status');
        const originalBtnHtml = btn ? btn.innerHTML : '';

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Discovering...</span>';
        }

        try {
            const models = await GroqService.fetchLiveModels(apiKey);
            const currentSelect = document.getElementById('groq-model-select');
            const currentVal = currentSelect ? currentSelect.value : null;

            this.populateGroqModelSelect(models, currentVal);

            if (statusEl) {
                statusEl.innerHTML = `<span class="text-emerald-600 font-semibold"><i class="fas fa-check-circle mr-1"></i> ${models.length} live models discovered from Groq API</span>`;
            }

            this.showNotification(`Discovered ${models.length} live Groq models!`);
        } catch (error) {
            if (statusEl) {
                statusEl.innerHTML = `<span class="text-rose-500"><i class="fas fa-exclamation-triangle mr-1"></i> ${this.escapeHtml(error.message || 'Failed to fetch models')}</span>`;
            }
            this.showNotification(`Could not fetch Groq models: ${error.message || 'Unknown error'}`, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnHtml;
            }
        }
    }

    toggleGroqApiKeyVisibility() {
        const apiKeyInput = document.getElementById('groq-api-key');
        const toggleBtn = document.getElementById('toggle-groq-api-key');
        if (!apiKeyInput || !toggleBtn) return;
        const icon = toggleBtn.querySelector('i');

        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            if (icon) icon.className = 'fas fa-eye-slash';
        } else {
            apiKeyInput.type = 'password';
            if (icon) icon.className = 'fas fa-eye';
        }
    }

    saveAIConfig() {
        const providerRadio = document.querySelector('input[name="ai-provider"]:checked');
        const provider = providerRadio ? providerRadio.value : 'auto';

        const groqKeyEl = document.getElementById('groq-api-key');
        const groqApiKey = groqKeyEl ? groqKeyEl.value.trim() : '';
        const groqSelect = document.getElementById('groq-model-select');
        const groqModel = groqSelect ? (groqSelect.value.trim() || 'llama-3.3-70b-versatile') : 'llama-3.3-70b-versatile';

        const autoRotateEl = document.getElementById('ai-auto-rotate');
        const autoRotate = autoRotateEl ? autoRotateEl.checked : true;

        const geminiApiKeyEl = document.getElementById('gemini-api-key');
        const geminiApiKey = geminiApiKeyEl ? geminiApiKeyEl.value.trim() : '';
        const promptEl = document.getElementById('system-prompt');
        const prompt = promptEl ? promptEl.value : '';

        // Validate key based on selected provider
        if (provider === 'groq' && !groqApiKey) {
            this.showNotification('Please enter your Groq API key.', 'error');
            return;
        }
        if (provider === 'gemini' && !geminiApiKey) {
            this.showNotification('Please enter your Gemini API key.', 'error');
            return;
        }
        if (provider === 'auto' && !groqApiKey && !geminiApiKey) {
            this.showNotification('Please enter at least one API key (Groq or Gemini) for Auto-Rotate mode.', 'error');
            return;
        }

        // Save AI settings
        localStorage.setItem('ai-provider', provider);
        if (groqApiKey) localStorage.setItem('groq-api-key', groqApiKey);
        else localStorage.removeItem('groq-api-key');

        localStorage.setItem('groq-model-name', groqModel);
        localStorage.setItem('ai-auto-rotate', autoRotate ? 'true' : 'false');

        if (geminiApiKey) localStorage.setItem('gemini-api-key', geminiApiKey);
        else localStorage.removeItem('gemini-api-key');

        localStorage.setItem('system-prompt', prompt);

        const aiModelEl = document.getElementById('ai-model');
        const aiModel = aiModelEl ? (aiModelEl.value.trim() || 'gemini-2.5-flash-lite') : 'gemini-2.5-flash-lite';
        const aiModelKey = (typeof window !== 'undefined' && window.EMAIL_EDITOR_CONSTANTS?.STORAGE_KEYS?.AI_MODEL) || 'ai-model-name';
        localStorage.setItem(aiModelKey, aiModel);

        const numSubjectsEl = document.getElementById('num-subjects');
        if (numSubjectsEl) {
            localStorage.setItem('num-subjects', numSubjectsEl.value);
        }

        const radioChecked = document.querySelector('input[name="temp-mode"]:checked');
        const tempMode = radioChecked ? radioChecked.value : 'normal';
        localStorage.setItem('ai-temperature-mode', tempMode);

        if (tempMode === 'normal') {
            const tempEl = document.getElementById('ai-temperature');
            if (tempEl) localStorage.setItem('ai-temperature', tempEl.value);
        } else {
            this.advancedTempFeatures.forEach(feature => {
                const tempEl = document.getElementById(`ai-temperature-${feature}`);
                if (tempEl) localStorage.setItem(`ai-temperature-${feature}`, tempEl.value);
            });
        }

        this.showNotification('AI configuration saved successfully!');
    }

    toggleApiKeyVisibility() {
        const apiKeyInput = document.getElementById('gemini-api-key');
        const toggleBtn = document.getElementById('toggle-api-key');
        if (!apiKeyInput || !toggleBtn) return;
        const icon = toggleBtn.querySelector('i');

        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            if (icon) icon.className = 'fas fa-eye-slash';
        } else {
            apiKeyInput.type = 'password';
            if (icon) icon.className = 'fas fa-eye';
        }
    }

    escapeHtml(s) {
        return window.EmailEditorUtils?.escapeHtml ?
            window.EmailEditorUtils.escapeHtml(s) :
            String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    loadCustomSpamWords() {
        const customWords = JSON.parse(localStorage.getItem('custom-spam-words') || '[]');
        const container = document.getElementById('custom-spam-words-list');
        if (!container) return;

        if (customWords.length === 0) {
            container.innerHTML = '<p class="text-slate-400 italic">No custom spam words added yet</p>';
            return;
        }

        container.innerHTML = customWords.map((word, index) => `
            <div class="spam-word-item">
                <div>
                    <span class="font-medium">${this.escapeHtml(word.keyword)}</span>
                    <span class="spam-word-category category-${this.escapeHtml(word.category)} ml-2">${this.escapeHtml(word.category)}</span>
                </div>
                <button class="text-red-600 hover:text-red-700 delete-spam-word-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.delete-spam-word-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                this.removeCustomSpamWord(idx);
            });
        });
    }

    addCustomSpamWord() {
        const wordEl = document.getElementById('new-spam-word');
        const categoryEl = document.getElementById('new-spam-category') || document.getElementById('spam-word-category');
        if (!wordEl) return;

        const word = wordEl.value.trim();
        const category = categoryEl ? categoryEl.value : 'urgency';

        if (!word) {
            this.showNotification('Please enter a spam word', 'error');
            return;
        }

        const customWords = JSON.parse(localStorage.getItem('custom-spam-words') || '[]');
        const regexObj = window.EmailEditorUtils?.buildWordRegex ?
            window.EmailEditorUtils.buildWordRegex(word) :
            new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');

        customWords.push({
            keyword: word,
            word: word,
            category: category,
            highlight: regexObj.source
        });

        localStorage.setItem('custom-spam-words', JSON.stringify(customWords));
        wordEl.value = '';
        this.loadCustomSpamWords();
        this.showNotification('Spam word added successfully!');
    }

    removeCustomSpamWord(index) {
        const customWords = JSON.parse(localStorage.getItem('custom-spam-words') || '[]');
        customWords.splice(index, 1);
        localStorage.setItem('custom-spam-words', JSON.stringify(customWords));
        this.loadCustomSpamWords();
        this.showNotification('Spam word removed successfully!');
    }

    exportSpamWords() {
        const customWords = JSON.parse(localStorage.getItem('custom-spam-words') || '[]');
        const dataStr = JSON.stringify(customWords, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'custom-spam-words.json';
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Spam words exported successfully!');
    }

    importSpamWords(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedWords = JSON.parse(e.target.result);
                if (!Array.isArray(importedWords)) {
                    throw new Error('Invalid format');
                }
                localStorage.setItem('custom-spam-words', JSON.stringify(importedWords));
                this.loadCustomSpamWords();
                this.showNotification('Spam words imported successfully!');
            } catch (_) {
                this.showNotification('Error importing spam words. Invalid file format.', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    updateSignaturePreview() {
        const sigEl = document.getElementById('signature-html');
        const preview = document.getElementById('signature-preview');
        if (!sigEl || !preview) return;
        const html = sigEl.value;
        if (html.trim()) {
            const sanitize = window.EmailEditorUtils?.sanitizeHtml || ((h) => h);
            preview.innerHTML = sanitize(html);
        } else {
            preview.innerHTML = '<p class="text-slate-400 italic">No signature set</p>';
        }
    }

    saveSignature() {
        const sigEl = document.getElementById('signature-html');
        const signature = sigEl ? sigEl.value : '';
        localStorage.setItem('email-signature', signature);
        this.showNotification('Signature saved successfully!');
    }

    clearSignature() {
        let confirmed = true;
        try {
            if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                confirmed = window.confirm('Are you sure you want to clear your signature?');
            }
        } catch (_) {
            confirmed = true;
        }
        if (!confirmed) return;

        const sigEl = document.getElementById('signature-html');
        if (sigEl) sigEl.value = '';
        localStorage.removeItem('email-signature');
        this.updateSignaturePreview();
        this.showNotification('Signature cleared successfully!');
    }

    insertSignatureToEditor() {
        const signature = localStorage.getItem('email-signature');
        if (!signature) {
            this.showNotification('No signature saved. Please save a signature first.', 'error');
            return;
        }
        localStorage.setItem('insert-signature-flag', 'true');
        if (typeof window !== 'undefined' && window.location) {
            window.location.href = 'index.html';
        }
    }

    resetAllSettings() {
        let confirmed = true;
        try {
            if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                confirmed = window.confirm('Are you sure you want to reset ALL settings? This cannot be undone.');
            }
        } catch (_) {
            confirmed = true;
        }
        if (!confirmed) return;
        
        localStorage.removeItem('ai-provider');
        localStorage.removeItem('groq-api-key');
        localStorage.removeItem('groq-model-name');
        localStorage.removeItem('groq-cached-models');
        localStorage.removeItem('groq-cached-models-timestamp');
        localStorage.removeItem('ai-auto-rotate');

        localStorage.removeItem('gemini-api-key');
        localStorage.removeItem('system-prompt');
        localStorage.removeItem('custom-spam-words');
        localStorage.removeItem('email-signature');
        localStorage.removeItem('num-subjects');
        const aiModelKey = (typeof window !== 'undefined' && window.EMAIL_EDITOR_CONSTANTS?.STORAGE_KEYS?.AI_MODEL) || 'ai-model-name';
        localStorage.removeItem(aiModelKey);

        localStorage.removeItem('ai-temperature-mode');
        localStorage.removeItem('ai-temperature');
        this.advancedTempFeatures.forEach(feature => {
            localStorage.removeItem(`ai-temperature-${feature}`);
        });

        this.loadSettings();
        this.showNotification('All settings have been reset to defaults!');
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        if (!notification) return;

        const icon = type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : '<i class="fas fa-check-circle"></i>';
        notification.innerHTML = `${icon} ${message}`;

        notification.className = 'fixed top-24 right-6 text-white px-6 py-3 rounded-xl shadow-2xl font-semibold flex items-center gap-2 transform transition-all duration-300 z-[60]';
        notification.style.display = 'flex';

        if (type === 'error') {
            notification.style.background = 'var(--color-poppy, #ef4444)';
        } else {
            notification.style.background = 'var(--color-carrot-orange, #4f46e5)';
        }

        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(12px)';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 3000);
    }
}

if (typeof window !== 'undefined') {
    window.SettingsManager = new SettingsManager();
}
