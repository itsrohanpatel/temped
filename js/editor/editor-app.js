/**
 * TempEd Pro - Email Editor Application Orchestrator
 * Assembles WYSIWYG Engine, Variable Manager, Modal Controller, and AI Assistant.
 */
    document.addEventListener('DOMContentLoaded', () => {
        const EmailEditor = {
            nodes: {},
            state: { savedSelection: null },
            defaultPromptTemplates: {
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
            },
            aiReady() {
                if (!navigator.onLine) {
                    this.showAIError('You are offline. Check your internet connection.');
                    return false;
                }
                const provider = localStorage.getItem('ai-provider') || 'auto';
                const groqKey = (localStorage.getItem('groq-api-key') || '').trim();
                const geminiKey = (localStorage.getItem('gemini-api-key') || '').trim();

                if (provider === 'groq') {
                    if (!groqKey) {
                        this.showAIError('No Groq API key found. Please add your Groq API key in Settings.');
                        return false;
                    }
                } else if (provider === 'gemini') {
                    if (!geminiKey) {
                        this.showAIError('No Gemini API key found. Please add your Gemini API key in Settings.');
                        return false;
                    }
                    if (!window.GoogleGenerativeAI) {
                        this.showAIError('Gemini AI library is not loaded. Please refresh the page.');
                        return false;
                    }
                } else {
                    // 'auto' mode
                    if (!groqKey && !geminiKey) {
                        this.showAIError('No AI API key found. Please configure a Groq or Gemini API key in Settings.');
                        return false;
                    }
                }
                return true;
            },

            getAIAssistant() {
                if (!this.aiAssistant) {
                    const AIAssistantClass = window.AIAssistant;
                    if (AIAssistantClass) {
                        this.aiAssistant = new AIAssistantClass();
                    }
                }
                return this.aiAssistant;
            },

            async callAIAssistant(featureKey, variables = {}) {
                const systemPrompt = localStorage.getItem('system-prompt') || '';
                const tpl = this.getPromptTemplate(featureKey);
                const fullPrompt = this.renderPrompt(tpl, { systemPrompt, ...variables });

                const mode = localStorage.getItem('ai-temperature-mode') || 'normal';
                let tempKey;
                if (mode === 'advanced' && featureKey) {
                    tempKey = `ai-temperature-${featureKey}`;
                } else {
                    tempKey = 'ai-temperature';
                }
                const temperature = parseFloat(
                    localStorage.getItem(tempKey) || localStorage.getItem('ai-temperature') || '1.0'
                );

                const assistant = this.getAIAssistant();
                if (assistant) {
                    return await assistant.generateWithFallback({
                        feature: featureKey,
                        prompt: fullPrompt,
                        temperature: temperature,
                        onModelRotated: (details) => {
                            this.showNotification(`Rotated AI model: ${details.fromModel} failed. Switched to ${details.toModel}.`, 'info');
                        }
                    });
                }

                // Fallback to legacy Gemini client if AIAssistant is not yet initialized
                const model = this.initGeminiClient(featureKey);
                const result = await model.generateContent(fullPrompt);
                const text = this.extractAIText(result);
                if (!text) throw new Error('Invalid response format from AI');
                return text;
            },

            getPromptTemplate(key) {
                const stored = localStorage.getItem(`prompt-${key}`);
                if (stored && stored.trim()) return stored;
                return this.defaultPromptTemplates[key] || '';
            },

            initGeminiClient(featureKey) {
                const apiKey = localStorage.getItem('gemini-api-key');
                if (!apiKey) throw new Error('No Gemini API key found');

                const genAI = new window.GoogleGenerativeAI(apiKey);

                const mode = localStorage.getItem('ai-temperature-mode') || 'normal';
                let tempKey;
                if (mode === 'advanced' && featureKey) {
                    tempKey = `ai-temperature-${featureKey}`;
                } else {
                    tempKey = 'ai-temperature';
                }

                // Fallback chain: specific advanced temp -> global temp -> default 1.0
                const temperature = parseFloat(
                    localStorage.getItem(tempKey) || localStorage.getItem('ai-temperature') || '1.0'
                );

                // Use custom model from storage if available
                const aiModelKey = window.EMAIL_EDITOR_CONSTANTS?.STORAGE_KEYS?.AI_MODEL || 'ai-model-name';
                const aiModel = localStorage.getItem(aiModelKey) || (window.EMAIL_EDITOR_CONSTANTS?.DEFAULT_AI_MODEL || "gemini-2.5-flash-lite");

                return genAI.getGenerativeModel({
                    model: aiModel,
                    generationConfig: {
                        temperature: temperature,
                    }
                });
            },

            renderPrompt(template, variables) {
                if (!template) return '';
                let result = template.replace(/\{(\w+)\}/g, (m, k) => {
                    const val = Object.prototype.hasOwnProperty.call(variables, k) ? variables[k] : '';
                    return val == null ? '' : String(val);
                });
                
                // Add subjectLine support if not already provided
                // Use raw subject line with variables for AI context
                if (this.nodes.subjectLineInput && !variables.hasOwnProperty('subjectLine')) {
                    result = result.replace(/\{subjectLine\}/g, this.nodes.subjectLineInput.value || '');
                }
                
                return result;
            },

            extractAIText(response) {
                try {
                    if (!response) return null;
                    
                    // Gemini response format
                    if (response.response && response.response.text) {
                        return response.response.text();
                    }
                    
                    // Fallback for other formats
                    if (typeof response === 'string') return response;
                    
                    return null;
                } catch (error) {
                    console.error('Error extracting AI text:', error);
                    return null;
                }
            },

            init() {
                this.queryNodes();
                this.bindEvents();
                this.initAutoSave();
                this.initKeyboardShortcuts();
                this.initHelpModal();
                this.loadCustomSpamWords();
                this.initRequestCounter();
                try {
                    document.execCommand('defaultParagraphSeparator', false, 'p');
                } catch (_) {}
                
                // Load previous work or use defaults
                this.loadFromLocalStorage();
                
                // Check if no saved data exists (no HTML content and no variables loaded)
                if (!this.nodes.htmlInput.value && this.nodes.variablesContainer.children.length === 0) {
                    // Add default variables
                    this.addVariableRow('full_name', 'Rahul');
                    this.addVariableRow('company_name', 'Infosys');
                    this.addVariableRow('Date', '16/01/2024');
                    this.addVariableRow('other_locations', 'Delhi, Gurgaon, Mumbai, Lucknow');
                    this.addVariableRow('location', 'Ahmedabad');
                    this.addVariableRow('clients', 'Tavant Technologies, ICICI, KENT RO, Mapro Foods, NP Digital');
                    this.nodes.htmlInput.value = this.getDefaultHtml();
                    this.nodes.htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (!this.nodes.htmlInput.value) {
                    // Only set default HTML if no content exists but variables might be loaded
                    this.nodes.htmlInput.value = this.getDefaultHtml();
                    this.nodes.htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                // Initialize subject line preview
                this.renderSubjectLine();
                
                // Check if signature should be inserted
                if (localStorage.getItem('insert-signature-flag') === 'true') {
                    this.insertSignature();
                    localStorage.removeItem('insert-signature-flag');
                }
                
                // Add event delegation for AI action buttons
                document.addEventListener('click', (e) => {
                    const btn = e.target.closest('[data-action]');
                    if (!btn) return;
                    
                    const action = btn.dataset.action;
                    const contentId = btn.dataset.contentId;
                    const content = window.aiContentCache?.[contentId];
                    
                    if (!content) return;
                    
                    switch (action) {
                        case 'copy':
                            this.copyToClipboard(content);
                            break;
                        case 'apply':
                            this.applyToEditor(content);
                            break;
                        case 'use':
                            this.useSubject(content);
                            break;
                    }
                });

                this.updateWordCount();
                
                // Initialize spam highlights if keywords are ready
                if (window.spamKeywords && typeof $(this.nodes.htmlInput).highlightWithinTextarea === 'function') {
                    $(this.nodes.htmlInput).highlightWithinTextarea({ highlight: window.spamKeywords });
                }
            },

            showNotification(message, type = 'success') {
                if (window.EmailEditorUtils?.showNotification) {
                    window.EmailEditorUtils.showNotification(message, type);
                }
            },

            queryNodes() {
                this.nodes = {
                    variablesContainer: document.getElementById('variables-container'),
                    addVariableBtn: document.getElementById('add-variable-btn'),
                    htmlInput: document.getElementById('spam-checker--textarea'),
                    emailPreview: document.getElementById('email-preview'),
                    subjectLineInput: document.getElementById('subject-line-input'),
                    subjectPreviewText: document.getElementById('subject-preview-text'),
                    recipientEmail: document.getElementById('recipient-email'),
                    copyHtmlBtn: document.getElementById('copy-html-btn'),
                    copyFeedback: document.getElementById('copy-feedback'),
                    senderInitial: document.getElementById('sender-initial'),
                    toolbar: document.getElementById('toolbar'),
                    insertComponentSelect: document.getElementById('insert-component-select'),
                    starterTemplatesBtn: document.getElementById('starter-templates-btn'),
                    starterGalleryBtn: document.getElementById('starter-gallery-btn'),
                    preflightBtn: document.getElementById('preflight-inspector-btn'),
                    exportMenuBtn: document.getElementById('export-menu-btn'),
                    exportDropdownMenu: document.getElementById('export-dropdown-menu'),
                    cleanPastedHtmlBtn: document.getElementById('clean-pasted-html-btn'),
                };
            },

            bindEvents() {
                // Existing events
                this.nodes.addVariableBtn.addEventListener('click', () => this.addVariableRow());

                // Clean pasted HTML button
                if (this.nodes.cleanPastedHtmlBtn) {
                    this.nodes.cleanPastedHtmlBtn.addEventListener('click', () => this.cleanEditorHtml());
                }

                // Auto-detect and clean dirty web/AI paste
                this.nodes.htmlInput.addEventListener('paste', (e) => {
                    const text = (e.clipboardData || window.clipboardData)?.getData('text');
                    if (text && (text.includes('_ngcontent') || text.includes('ms-cmark-node') || text.includes('ng-star-inserted') || text.includes('rgb(38, 45, 61)'))) {
                        setTimeout(() => {
                            this.cleanEditorHtml();
                        }, 50);
                    }
                });
                
                // Debounce heavy operations on input
                const debouncedRender = window.EmailEditorUtils?.debounce(() => {
                    this.renderPreview();
                }, 300) || (() => this.renderPreview());
                
                this.nodes.htmlInput.addEventListener('input', () => {
                    debouncedRender();
                    this.updateWordCount();
                    this.saveToLocalStorage();
                    
                    // Update spam highlighter
                    if (typeof $(this.nodes.htmlInput).highlightWithinTextarea === 'function') {
                        $(this.nodes.htmlInput).highlightWithinTextarea('update');
                    }
                });
                this.nodes.subjectLineInput.addEventListener('input', () => {
                    this.renderSubjectLine();
                    this.saveToLocalStorage();
                });
                this.nodes.emailPreview.addEventListener('input', () => {
                    this.styleAllLinks();
                    this.updateSourceFromPreview();
                });
                this.nodes.emailPreview.addEventListener('blur', () => {
                    this.renderPreview(true);
                });
                this.nodes.copyHtmlBtn.addEventListener('click', () => this.copyHtmlToClipboard());

                // Toolbar events
                this.nodes.toolbar.addEventListener('click', e => {
                    const commandElement = e.target.closest('[data-command]');
                    if (commandElement) this.applyCommand(commandElement);
                });
                this.nodes.toolbar.addEventListener('change', e => {
                    const commandElement = e.target.closest('[data-command]');
                    if (commandElement) this.applyCommand(commandElement);
                });

                // Component Inserter
                if (this.nodes.insertComponentSelect) {
                    this.nodes.insertComponentSelect.addEventListener('change', (e) => {
                        this.insertComponent(e.target.value);
                    });
                }

                // Export Suite Events
                if (this.nodes.exportMenuBtn) {
                    this.nodes.exportMenuBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.nodes.exportDropdownMenu?.classList.toggle('hidden');
                    });
                }
                document.getElementById('export-html-btn')?.addEventListener('click', () => this.exportHtmlFile());
                document.getElementById('export-txt-btn')?.addEventListener('click', () => this.exportTxtFile());
                document.getElementById('export-eml-btn')?.addEventListener('click', () => this.exportEmlFile());
                document.getElementById('copy-rendered-btn')?.addEventListener('click', () => this.copyRenderedToClipboard());
                window.addEventListener('click', (e) => {
                    if (!e.target.closest('#export-dropdown-container')) {
                        this.nodes.exportDropdownMenu?.classList.add('hidden');
                    }
                });

                // Starter Templates Gallery Events
                this.nodes.starterTemplatesBtn?.addEventListener('click', () => this.showStarterTemplatesModal());
                this.nodes.starterGalleryBtn?.addEventListener('click', () => this.showStarterTemplatesModal());
                document.getElementById('close-starters-modal')?.addEventListener('click', () => this.hideStarterTemplatesModal());
                document.getElementById('close-starters-btn')?.addEventListener('click', () => this.hideStarterTemplatesModal());
                document.getElementById('starter-templates-modal')?.addEventListener('click', (e) => {
                    if (e.target.id === 'starter-templates-modal') this.hideStarterTemplatesModal();
                });

                // Pre-Flight Inspector Events
                this.nodes.preflightBtn?.addEventListener('click', () => this.showPreflightModal());
                document.getElementById('close-preflight-modal')?.addEventListener('click', () => this.hidePreflightModal());
                document.getElementById('preflight-close-btn')?.addEventListener('click', () => this.hidePreflightModal());
                document.getElementById('preflight-rerun-btn')?.addEventListener('click', () => this.runPreflightInspection());
                document.getElementById('preflight-insert-footer-btn')?.addEventListener('click', () => this.insertComplianceFooter());
                document.getElementById('preflight-modal')?.addEventListener('click', (e) => {
                    if (e.target.id === 'preflight-modal') this.hidePreflightModal();
                });

                // New template management events
                document.getElementById('save-template-btn').addEventListener('click', () => this.saveTemplate());
                document.getElementById('load-template-btn').addEventListener('click', () => this.loadTemplate());
                document.getElementById('clear-all-btn').addEventListener('click', () => this.clearAll());
                document.getElementById('settings-btn').addEventListener('click', () => window.location.href = 'settings.html');

                // AI enhancement events
                document.getElementById('ai-optimize-btn').addEventListener('click', () => this.optimizeWithAI());
                document.getElementById('ai-suggest-btn').addEventListener('click', () => this.getAISuggestions());
                document.getElementById('ai-tone-btn').addEventListener('click', () => this.adjustTone());
                document.getElementById('ai-subject-btn').addEventListener('click', () => this.generateSubject());
                document.getElementById('ai-rewrite-spam-btn').addEventListener('click', () => this.rewriteSpamWords());
                document.getElementById('copy-ai-response').addEventListener('click', () => {
                    const aiContent = document.getElementById('ai-content').textContent;
                    navigator.clipboard.writeText(aiContent);
                    this.showNotification('AI response copied to clipboard!');
                });

                // Undo/Redo buttons
                document.getElementById('undo-btn').addEventListener('click', () => this.undo());
                document.getElementById('redo-btn').addEventListener('click', () => this.redo());

                // Link modal events
                document.getElementById('insert-link-btn').addEventListener('click', () => this.insertLink());
                document.getElementById('cancel-link-btn').addEventListener('click', () => this.hideLinkModal());
                
                // Close modal on Enter key in URL input
                document.getElementById('link-url-input').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.insertLink();
                    }
                });
                
                // Close modal on Escape key
                document.getElementById('link-modal').addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.hideLinkModal();
                    }
                });
                
                // Close modal when clicking backdrop
                document.getElementById('link-modal').addEventListener('click', (e) => {
                    if (e.target.id === 'link-modal') {
                        this.hideLinkModal();
                    }
                });
                
                // Help modal events
                document.getElementById('help-btn').addEventListener('click', () => {
                    document.getElementById('help-modal').classList.remove('hidden');
                });
                document.getElementById('close-help').addEventListener('click', () => {
                    document.getElementById('help-modal').classList.add('hidden');
                });
                document.getElementById('help-modal').addEventListener('click', (e) => {
                    if (e.target.id === 'help-modal') {
                        document.getElementById('help-modal').classList.add('hidden');
                    }
                });
                
                // Tone modal events
                document.getElementById('apply-tone-btn').addEventListener('click', () => this.applyToneAdjustment());
                document.getElementById('cancel-tone-btn').addEventListener('click', () => this.hideToneModal());
                document.getElementById('tone-input').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.applyToneAdjustment();
                    }
                });
                document.querySelectorAll('.tone-preset').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        document.getElementById('tone-input').value = e.target.dataset.tone;
                    });
                });
                document.getElementById('tone-modal').addEventListener('click', (e) => {
                    if (e.target.id === 'tone-modal') this.hideToneModal();
                });
                
                // Save template modal events
                document.getElementById('confirm-save-template-btn').addEventListener('click', () => this.confirmSaveTemplate());
                document.getElementById('cancel-save-template-btn').addEventListener('click', () => this.hideSaveTemplateModal());
                document.getElementById('template-name-input').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.confirmSaveTemplate();
                    }
                });
                document.getElementById('save-template-modal').addEventListener('click', (e) => {
                    if (e.target.id === 'save-template-modal') this.hideSaveTemplateModal();
                });
                
                // Load template modal events
                document.getElementById('cancel-load-template-btn').addEventListener('click', () => this.hideLoadTemplateModal());
                document.getElementById('load-template-modal').addEventListener('click', (e) => {
                    if (e.target.id === 'load-template-modal') this.hideLoadTemplateModal();
                });
                
                // Spam rewrite modal events
                document.getElementById('confirm-spam-rewrite-btn').addEventListener('click', () => this.confirmSpamRewrite());
                document.getElementById('cancel-spam-rewrite-btn').addEventListener('click', () => this.hideSpamRewriteModal());
                document.getElementById('spam-rewrite-modal').addEventListener('click', (e) => {
                    if (e.target.id === 'spam-rewrite-modal') this.hideSpamRewriteModal();
                });

                // Deliverability health modal events
                const healthBadge = document.getElementById('health-score-badge');
                if (healthBadge) healthBadge.addEventListener('click', () => this.showHealthModal());
                const closeHealthBtn = document.getElementById('close-health-modal');
                if (closeHealthBtn) closeHealthBtn.addEventListener('click', () => this.hideHealthModal());
                const okHealthBtn = document.getElementById('health-modal-ok-btn');
                if (okHealthBtn) okHealthBtn.addEventListener('click', () => this.hideHealthModal());
                const healthModal = document.getElementById('health-modal');
                if (healthModal) {
                    healthModal.addEventListener('click', (e) => {
                        if (e.target.id === 'health-modal') this.hideHealthModal();
                    });
                }

                // If spam keywords load after initial render, re-highlight preview
                document.addEventListener('spamKeywordsReady', () => {
                    this.highlightSpamInPreview();
                });
            },
            
            updateHealthBadgeAndModal() {
                const html = this.nodes.htmlInput?.value || '';
                const subject = this.nodes.subjectLineInput?.value || '';
                const plainText = this.nodes.emailPreview?.innerText || '';
                const spamHits = window.currentSpamHits || 0;
                
                const healthResult = window.EmailEditorUtils?.calculateHealthScore ? 
                    window.EmailEditorUtils.calculateHealthScore(html, subject, spamHits) : 
                    (window.SpamEngine?.calculateHealthScore ? window.SpamEngine.calculateHealthScore(html, subject, spamHits) : { score: 100, grade: 'Great', findings: [] });

                const scoreValEl = document.getElementById('health-score-val');
                const scoreGradeEl = document.getElementById('health-score-grade');
                if (scoreValEl) scoreValEl.textContent = `${healthResult.score}/100`;
                if (scoreGradeEl) scoreGradeEl.textContent = healthResult.grade;

                const modalScore = document.getElementById('health-modal-score');
                const modalGrade = document.getElementById('health-modal-grade-badge');
                const modalSpamHits = document.getElementById('health-modal-spam-hits');
                const modalReadTime = document.getElementById('health-modal-read-time');
                const modalWordCount = document.getElementById('health-modal-word-count');
                const modalFindings = document.getElementById('health-modal-findings');

                if (modalScore) modalScore.textContent = `${healthResult.score} / 100`;
                if (modalGrade) modalGrade.textContent = healthResult.grade;
                if (modalSpamHits) modalSpamHits.textContent = spamHits;
                
                const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
                if (modalWordCount) modalWordCount.textContent = words;
                const readMinutes = Math.max(1, Math.ceil(words / 200));
                if (modalReadTime) modalReadTime.textContent = `${readMinutes} min`;

                if (modalFindings) {
                    modalFindings.innerHTML = '';
                    if (healthResult.findings && healthResult.findings.length > 0) {
                        healthResult.findings.forEach(f => {
                            const item = document.createElement('div');
                            item.className = 'flex items-center gap-2 p-2 rounded-lg text-xs bg-slate-50 border border-slate-200';
                            item.innerHTML = `<i class="fas fa-exclamation-circle text-amber-500"></i><span>${window.EmailEditorUtils?.escapeHtml ? window.EmailEditorUtils.escapeHtml(f) : f}</span>`;
                            modalFindings.appendChild(item);
                        });
                    } else {
                        const item = document.createElement('div');
                        item.className = 'flex items-center gap-2 p-2 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-700';
                        item.innerHTML = `<i class="fas fa-check-circle text-emerald-500"></i><span>No deliverability warnings found. Ready to send!</span>`;
                        modalFindings.appendChild(item);
                    }
                }
            },

            insertComponent(componentKey) {
                if (!componentKey || !window.EmailComponentSnippets) return;
                const snippet = window.EmailComponentSnippets[componentKey];
                if (!snippet) return;
                
                const textarea = this.nodes.htmlInput;
                const startPos = textarea.selectionStart ?? textarea.value.length;
                const endPos = textarea.selectionEnd ?? textarea.value.length;
                const currentVal = textarea.value;
                
                textarea.value = currentVal.substring(0, startPos) + '\n' + snippet + '\n' + currentVal.substring(endPos);
                textarea.selectionStart = textarea.selectionEnd = startPos + snippet.length + 2;
                textarea.focus();
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                
                if (this.nodes.insertComponentSelect) {
                    this.nodes.insertComponentSelect.value = '';
                }
                this.showNotification('Inserted email component!');
            },

            insertComplianceFooter() {
                if (!window.EmailComponentSnippets?.complianceFooter) return;
                const footer = window.EmailComponentSnippets.complianceFooter;
                const textarea = this.nodes.htmlInput;
                textarea.value = (textarea.value.trim() + '\n\n' + footer).trim();
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                this.showNotification('Added compliance footer!');
                if (document.getElementById('preflight-modal') && !document.getElementById('preflight-modal').classList.contains('hidden')) {
                    this.runPreflightInspection();
                }
            },

            cleanEditorHtml() {
                const raw = this.nodes.htmlInput ? this.nodes.htmlInput.value : '';
                if (!raw || !raw.trim()) {
                    this.showNotification('Editor is empty.', 'info');
                    return;
                }
                const cleaned = window.EmailEditorUtils?.cleanPastedHtml ? 
                    window.EmailEditorUtils.cleanPastedHtml(raw) : raw;
                if (cleaned !== raw) {
                    this.nodes.htmlInput.value = cleaned;
                    this.renderPreview();
                    this.updateWordCount();
                    this.saveToLocalStorage();
                    this.showNotification('Cleaned web and AI markup artifacts!');
                } else {
                    this.showNotification('HTML is already clean and email-ready.', 'info');
                }
            },

            getRenderedHtmlWithPreheader() {
                const preheader = this.nodes.preheaderInput ? this.nodes.preheaderInput.value.trim() : '';
                let html = this.nodes.htmlInput.value;
                
                const variables = this.getVariables();
                for (const [key, value] of variables) {
                    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                    html = html.replace(regex, value);
                }
                
                if (preheader && !html.includes(preheader)) {
                    const safePreheader = window.EmailEditorUtils?.escapeAttr ? window.EmailEditorUtils.escapeAttr(preheader) : preheader;
                    const preheaderSnippet = `\n<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${safePreheader}</div>\n`;
                    html = preheaderSnippet + html;
                }
                return html;
            },

            exportHtmlFile() {
                const html = this.getRenderedHtmlWithPreheader();
                const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'email-template.html';
                a.click();
                URL.revokeObjectURL(url);
                this.showNotification('Downloaded HTML file!');
                document.getElementById('export-dropdown-menu')?.classList.add('hidden');
            },

            exportTxtFile() {
                const html = this.getRenderedHtmlWithPreheader();
                const txt = window.EmailExportTools ? window.EmailExportTools.generatePlainText(html) : (this.nodes.emailPreview?.innerText || '');
                const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'email-template.txt';
                a.click();
                URL.revokeObjectURL(url);
                this.showNotification('Downloaded plain text version!');
                document.getElementById('export-dropdown-menu')?.classList.add('hidden');
            },

            exportEmlFile() {
                const html = this.getRenderedHtmlWithPreheader();
                const subject = this.getRenderedSubjectLine() || 'Test Email';
                const recipient = this.nodes.recipientEmail?.textContent?.trim() || 'recipient@example.com';
                const emlContent = window.EmailExportTools ? 
                    window.EmailExportTools.generateEml({
                        from: 'sender@example.com',
                        to: recipient,
                        subject: subject,
                        html: html
                    }) : '';
                const blob = new Blob([emlContent], { type: 'message/rfc822;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${subject.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'email'}.eml`;
                a.click();
                URL.revokeObjectURL(url);
                this.showNotification('Downloaded RFC-822 test email (.eml)!');
                document.getElementById('export-dropdown-menu')?.classList.add('hidden');
            },

            copyRenderedToClipboard() {
                const text = this.nodes.emailPreview?.innerText || '';
                navigator.clipboard.writeText(text).then(() => {
                    this.showNotification('Rendered text copied to clipboard!');
                    document.getElementById('export-dropdown-menu')?.classList.add('hidden');
                }).catch(() => {
                    this.showNotification('Failed to copy text', 'error');
                });
            },

            showPreflightModal() {
                this.runPreflightInspection();
                document.getElementById('preflight-modal')?.classList.remove('hidden');
            },

            hidePreflightModal() {
                document.getElementById('preflight-modal')?.classList.add('hidden');
            },

            runPreflightInspection() {
                if (!window.PreFlightInspector) return;
                const html = this.nodes.htmlInput?.value || '';
                const subject = this.nodes.subjectLineInput?.value || '';
                const plainText = this.nodes.emailPreview?.innerText || '';
                
                const report = window.PreFlightInspector.runAllChecks(html, {
                    subject: subject,
                    plainText: plainText
                });

                const checksRatio = document.getElementById('preflight-checks-ratio');
                const sizeDisplay = document.getElementById('preflight-size-display');
                const overallBadge = document.getElementById('preflight-overall-badge');

                if (checksRatio) {
                    checksRatio.textContent = `${report.passedCount}/${report.totalCount} Passed`;
                }
                if (sizeDisplay) {
                    const sizeStr = report.checks?.size?.formattedSize || (report.checks?.size?.sizeKb !== undefined ? `${report.checks.size.sizeKb}KB` : '0KB');
                    sizeDisplay.textContent = `(${sizeStr})`;
                }
                if (overallBadge) {
                    if (report.overallStatus === 'ready') {
                        overallBadge.className = 'px-3 py-1 rounded-full text-xs font-bold status-pill-pass';
                        overallBadge.textContent = 'Ready to Send';
                    } else if (report.overallStatus === 'warning') {
                        overallBadge.className = 'px-3 py-1 rounded-full text-xs font-bold status-pill-warn';
                        overallBadge.textContent = 'Review Warnings';
                    } else {
                        overallBadge.className = 'px-3 py-1 rounded-full text-xs font-bold status-pill-fail';
                        overallBadge.textContent = 'Action Required';
                    }
                }

                const updateCard = (key, badgeId, msgId, cardId) => {
                    const check = report.checks[key];
                    if (!check) return;
                    const badge = document.getElementById(badgeId);
                    const msg = document.getElementById(msgId);
                    const card = document.getElementById(cardId);
                    
                    if (badge) {
                        badge.textContent = check.status.toUpperCase();
                        badge.className = `status-pill px-2 py-0.5 rounded text-[11px] font-semibold ${
                            check.status === 'pass' ? 'status-pill-pass' : (check.status === 'warn' ? 'status-pill-warn' : 'status-pill-fail')
                        }`;
                    }
                    if (msg) msg.textContent = check.message;
                    if (card) {
                        card.className = `p-3.5 rounded-xl border ${
                            check.status === 'pass' ? 'border-slate-200 bg-white' : (check.status === 'warn' ? 'border-amber-200 bg-amber-50/30' : 'border-rose-200 bg-rose-50/30')
                        }`;
                    }
                };

                updateCard('size', 'preflight-badge-size', 'preflight-msg-size', 'preflight-check-size');
                updateCard('altText', 'preflight-badge-alt', 'preflight-msg-alt', 'preflight-check-alt');
                updateCard('links', 'preflight-badge-links', 'preflight-msg-links', 'preflight-check-links');
                updateCard('ratio', 'preflight-badge-ratio', 'preflight-msg-ratio', 'preflight-check-ratio');
            },

            showStarterTemplatesModal() {
                this.renderStarterTemplatesModal();
                document.getElementById('starter-templates-modal')?.classList.remove('hidden');
            },

            hideStarterTemplatesModal() {
                document.getElementById('starter-templates-modal')?.classList.add('hidden');
            },

            renderStarterTemplatesModal() {
                const container = document.getElementById('starter-templates-grid');
                if (!container || !window.StarterTemplates) return;
                
                const starters = window.StarterTemplates.getAll();
                const escapeHtml = s => (window.EmailEditorUtils ? window.EmailEditorUtils.escapeHtml(s) : s);
                const escapeAttr = s => (window.EmailEditorUtils ? window.EmailEditorUtils.escapeAttr(s) : s);
                
                container.innerHTML = starters.map(tpl => `
                    <div class="card p-4 flex flex-col justify-between border border-slate-200 hover:border-indigo-300 transition-all shadow-xs">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    ${escapeHtml(tpl.category)}
                                </span>
                                <span class="text-[11px] text-slate-400 font-medium">${tpl.variables.length} vars</span>
                            </div>
                            <h3 class="font-bold text-sm text-slate-900 mb-1">${escapeHtml(tpl.name)}</h3>
                            <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">${escapeHtml(tpl.description)}</p>
                            
                            <div class="p-2 bg-slate-50 rounded-lg border border-slate-100 mb-3 text-[11px] text-slate-600">
                                <div class="font-semibold text-slate-500 uppercase text-[9px] mb-0.5">Subject:</div>
                                <div class="truncate italic font-medium">${escapeHtml(tpl.subject)}</div>
                            </div>
                        </div>

                        <div>
                            <div class="flex flex-wrap gap-1 mb-3">
                                ${tpl.variables.slice(0, 3).map(v => `
                                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-mono">
                                        {{${escapeHtml(v.name)}}}
                                    </span>
                                `).join('')}
                                ${tpl.variables.length > 3 ? `<span class="text-[10px] text-slate-400 self-center">+${tpl.variables.length - 3}</span>` : ''}
                            </div>
                            <button class="btn btn-primary w-full text-xs py-1.5 cursor-pointer" data-starter-id="${escapeAttr(tpl.id)}">
                                <i class="fas fa-arrow-right mr-1.5"></i> Load Template
                            </button>
                        </div>
                    </div>
                `).join('');

                container.querySelectorAll('[data-starter-id]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = e.currentTarget.getAttribute('data-starter-id');
                        this.loadStarterTemplate(id);
                    });
                });
            },

            loadStarterTemplate(templateId) {
                if (!window.StarterTemplates) return;
                const template = window.StarterTemplates.getById(templateId);
                if (!template) return;
                
                this.nodes.variablesContainer.innerHTML = '';
                this.nodes.subjectLineInput.value = template.subject;
                if (this.nodes.preheaderInput) {
                    this.nodes.preheaderInput.value = template.preheader || '';
                }
                this.nodes.htmlInput.value = template.html;
                
                (template.variables || []).forEach(v => {
                    this.addVariableRow(v.name, v.defaultValue || '');
                });
                
                this.hideStarterTemplatesModal();
                this.renderSubjectLine();
                this.renderPreview();
                this.saveToLocalStorage();
                this.showNotification(`Loaded "${template.name}" starter template!`);
            },

            cleanHTML(html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Helper to clean attributes
                const cleanElement = (el) => {
                    // 1. Handle Variables (preserve them)
                    if (el.hasAttribute('data-variable')) {
                        const varName = el.getAttribute('data-variable');
                        // Remove all attributes
                        while (el.attributes.length > 0) {
                            el.removeAttribute(el.attributes[0].name);
                        }
                        // Restore essential variable attributes
                        el.setAttribute('data-variable', varName);
                        el.className = 'font-semibold text-blue-600';
                        el.setAttribute('contenteditable', 'false');
                        return; // Done with this element
                    }

                    const tag = el.tagName.toLowerCase();

                    // 2. Handle Anchors (Links)
                    if (tag === 'a') {
                        const href = el.getAttribute('href');
                        const target = el.getAttribute('target');
                        // Strip all attributes
                        while (el.attributes.length > 0) {
                            el.removeAttribute(el.attributes[0].name);
                        }
                        // Restore href/target
                        if (href) el.setAttribute('href', href);
                        if (target) el.setAttribute('target', target);
                        return;
                    }

                    // 3. Handle Images
                    if (tag === 'img') {
                        const src = el.getAttribute('src');
                        const alt = el.getAttribute('alt');
                        const width = el.getAttribute('width');
                        const height = el.getAttribute('height');
                        while (el.attributes.length > 0) {
                            el.removeAttribute(el.attributes[0].name);
                        }
                        if (src) el.setAttribute('src', src);
                        if (alt) el.setAttribute('alt', alt);
                        if (width) el.setAttribute('width', width);
                        if (height) el.setAttribute('height', height);
                        return;
                    }

                    // 4. Strip ALL attributes from everything else (p, div, span, etc.)
                    // This removes style, class, id, _ngcontent, etc.
                    while (el.attributes.length > 0) {
                        el.removeAttribute(el.attributes[0].name);
                    }
                };

                // Apply attribute cleaning to ALL elements
                doc.body.querySelectorAll('*').forEach(cleanElement);

                // Unwrap Logic
                doc.body.querySelectorAll('*').forEach(el => {
                    if (!el.parentNode) return;
                    const tag = el.tagName.toLowerCase();

                    // Remove scripts/styles
                    if (['script', 'style', 'meta', 'link', 'title', 'xml', 'o:p'].includes(tag)) {
                        el.remove();
                        return;
                    }

                    // Unwrap specific tags that are just containers
                    // span (without variable), font, ms-cmark-node, center
                    if (['span', 'font', 'ms-cmark-node', 'center'].includes(tag)) {
                        // Double check it's not a variable (already handled in cleanAttributes but safe to check)
                        if (el.hasAttribute('data-variable')) return;

                        // Unwrap: move children to parent
                        const parent = el.parentNode;
                        while (el.firstChild) {
                            parent.insertBefore(el.firstChild, el);
                        }
                        parent.removeChild(el);
                    }
                });

                // Handle Divs -> P conversion
                // This flattens structure which is good for email
                doc.body.querySelectorAll('div').forEach(div => {
                    if (!div.parentNode) return;
                    
                    // If it contains block elements, it's a wrapper -> unwrap
                    if (div.querySelector('p, div, h1, h2, h3, h4, h5, h6, ul, ol, table, blockquote')) {
                        const parent = div.parentNode;
                        while (div.firstChild) parent.insertBefore(div.firstChild, div);
                        parent.removeChild(div);
                    } else {
                        // It contains only inline content -> convert to P
                        const p = doc.createElement('p');
                        while (div.firstChild) p.appendChild(div.firstChild);
                        div.parentNode.replaceChild(p, div);
                    }
                });

                // Cleanup Empty Paragraphs
                doc.body.querySelectorAll('p').forEach(p => {
                    if (!p.textContent.trim() && !p.querySelector('img') && !p.querySelector('br') && !p.querySelector('[data-variable]')) {
                        p.remove();
                    }
                });

                return doc.body.innerHTML;
            },

            applyCommand(element) {
                const { command } = element.dataset;
                let value = element.value || null;

                if (command === 'createLink') {
                    this.state.savedSelection = this.saveSelection(this.nodes.emailPreview);
                    this.showLinkModal();
                    return;
                }
                
                // Custom Clear Formatting Logic
                if (command === 'removeFormat') {
                     this.nodes.emailPreview.focus();
                     const selection = window.getSelection();
                     const html = this.nodes.emailPreview.innerHTML;
                     // Detect common messy patterns from pasted content (Angular, Word, etc.)
                     const isMessy = html.includes('ms-cmark-node') || html.includes('_ngcontent') || html.includes('bis_skin_checked') || html.includes('mso-');

                     if (selection.rangeCount > 0 && !selection.isCollapsed) {
                         // Clean specific selection
                         const range = selection.getRangeAt(0);
                         const content = range.extractContents();
                         const tempDiv = document.createElement('div');
                         tempDiv.appendChild(content);
                         const cleaned = this.cleanHTML(tempDiv.innerHTML);
                         document.execCommand('insertHTML', false, cleaned);
                     } else {
                         // If no selection, but document is messy, prompt to clean all
                         if (isMessy) {
                             if (confirm('Messy formatting detected (e.g., from pasted content). Clean entire email to fix issues?')) {
                                 const cleaned = this.cleanHTML(html);
                                 this.nodes.emailPreview.innerHTML = cleaned;
                             }
                         } else {
                             // Fallback to native behavior which usually clears style at cursor
                             document.execCommand('removeFormat', false, value);
                         }
                     }
                     this.updateSourceFromPreview();
                     return;
                }
                
                this.nodes.emailPreview.focus();

                if (this.state.savedSelection) {
                    this.restoreSelection(this.nodes.emailPreview, this.state.savedSelection);
                }

                document.execCommand(command, false, value);
                this.state.savedSelection = null;
                this.updateSourceFromPreview();
            },
            
            showLinkModal() {
                const linkModal = document.getElementById('link-modal');
                const linkUrlInput = document.getElementById('link-url-input');
                const linkTextInput = document.getElementById('link-text-input');
                
                // Get selected text if any
                const selection = window.getSelection();
                const selectedText = selection.toString();
                
                // Pre-fill link text with selected text
                linkTextInput.value = selectedText;
                linkUrlInput.value = 'https://';
                
                linkModal.classList.remove('hidden');
                setTimeout(() => linkUrlInput.focus(), 100);
            },
            
            hideLinkModal() {
                const linkModal = document.getElementById('link-modal');
                linkModal.classList.add('hidden');
            },
            
            insertLink() {
                const linkUrlInput = document.getElementById('link-url-input');
                const linkTextInput = document.getElementById('link-text-input');
                const url = linkUrlInput.value.trim();
                
                // Validate URL
                const validation = window.EmailEditorUtils?.validateUrl(url) || 
                    { isValid: url && url !== 'https://', error: 'Invalid URL' };
                
                if (!validation.isValid) {
                    this.showNotification(validation.error, 'error');
                    linkUrlInput.style.borderColor = 'var(--color-poppy)';
                    const flashDuration = window.EMAIL_EDITOR_CONSTANTS?.BORDER_FLASH_DURATION_MS || 1500;
                    setTimeout(() => {
                        linkUrlInput.style.borderColor = 'var(--color-platinum)';
                    }, flashDuration);
                    return;
                }
                
                this.nodes.emailPreview.focus();
                
                if (this.state.savedSelection) {
                    this.restoreSelection(this.nodes.emailPreview, this.state.savedSelection);
                }
                
                // If custom text is provided, replace selection with it first
                const linkText = linkTextInput.value.trim();
                if (linkText && window.getSelection().toString() !== linkText) {
                    document.execCommand('insertText', false, linkText);
                    // Re-select the inserted text
                    const selection = window.getSelection();
                    const range = document.createRange();
                    const textNode = selection.anchorNode;
                    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                        range.setStart(textNode, textNode.textContent.length - linkText.length);
                        range.setEnd(textNode, textNode.textContent.length);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
                
                document.execCommand('createLink', false, url);
                
                // Apply custom styling to the newly created link
                setTimeout(() => {
                    const selection = window.getSelection();
                    if (selection.anchorNode) {
                        let element = selection.anchorNode.parentElement;
                        // Find the anchor tag
                        while (element && element.tagName !== 'A' && element !== this.nodes.emailPreview) {
                            element = element.parentElement;
                        }
                        if (element && element.tagName === 'A') {
                            element.style.color = '#0400ff';
                            element.style.textDecoration = 'underline';
                            // Wrap content in font tag with color for better email client compatibility
                            if (element.innerHTML && !element.querySelector('font[color="#0400ff"]')) {
                                element.innerHTML = `<font color="#0400ff"><u>${element.textContent}</u></font>`;
                            }
                        }
                    }
                    this.updateSourceFromPreview();
                }, 50);
                
                this.state.savedSelection = null;
                this.hideLinkModal();
                
                // Clear inputs
                linkUrlInput.value = '';
                linkTextInput.value = '';
            },

            renderPreview(force = false) {
                const isPreviewFocused = !force && (document.activeElement === this.nodes.emailPreview || 
                                         (this.nodes.emailPreview && this.nodes.emailPreview.contains(document.activeElement)));
                if (isPreviewFocused) {
                    this.renderSubjectLine();
                    this.updateHealthBadgeAndModal();
                    return;
                }

                let template = this.nodes.htmlInput.value;
                const variables = this.getVariables();

                variables.forEach((value, name) => {
                    const escaped = window.EmailEditorUtils ? window.EmailEditorUtils.escapeRegex(name) : name;
                    const regex = new RegExp(`{{\\s*${escaped}\\s*}}`, 'g');
                    template = template.replace(regex, `<span class="font-semibold text-blue-600" data-variable="${name}" contenteditable="false">${value}</span>`);
                });

                this.nodes.recipientEmail.textContent = `${(variables.get('full_name') || 'recipient').split(' ')[0].toLowerCase()}@example.com`;
                
                // Render subject line preview with variable replacement
                this.renderSubjectLine();
                
                const isFocused = document.activeElement === this.nodes.emailPreview || 
                                  (this.nodes.emailPreview && this.nodes.emailPreview.contains(document.activeElement));
                const selection = isFocused ? this.saveSelection(this.nodes.emailPreview) : null;
                const safeTemplate = window.EmailEditorUtils ? window.EmailEditorUtils.sanitizeHtml(template) : template;
                this.nodes.emailPreview.innerHTML = safeTemplate;
                // Apply spam highlights in the preview before restoring selection
                this.highlightSpamInPreview();
                // Apply link styling to all links
                this.styleAllLinks();
                if (isFocused && selection) {
                    this.restoreSelection(this.nodes.emailPreview, selection);
                }
                this.updateHealthBadgeAndModal();
            },
            
            styleAllLinks() {
                // Find all anchor tags in the email preview and apply styling
                const links = this.nodes.emailPreview.querySelectorAll('a');
                links.forEach(link => {
                    link.style.color = '#0400ff';
                    link.style.textDecoration = 'underline';
                    // Ensure proper HTML structure for email clients
                    if (link.innerHTML && !link.querySelector('font[color="#0400ff"]')) {
                        const text = link.textContent;
                        link.innerHTML = `<font color="#0400ff"><u>${text}</u></font>`;
                    }
                });
            },

            renderSubjectLine() {
                if (!this.nodes.subjectLineInput) return;

                const renderedSubject = this.getRenderedSubjectLine();

                // Update the preview text with rendered variables
                if (this.nodes.subjectPreviewText) {
                    this.nodes.subjectPreviewText.textContent = renderedSubject;
                }
            },

            getRenderedSubjectLine() {
                if (!this.nodes.subjectLineInput) return '';
                
                let subjectLine = this.nodes.subjectLineInput.value;
                const variables = this.getVariables();

                variables.forEach((value, name) => {
                    const escaped = window.EmailEditorUtils ? window.EmailEditorUtils.escapeRegex(name) : name;
                    const regex = new RegExp(`{{\\s*${escaped}\\s*}}`, 'g');
                    subjectLine = subjectLine.replace(regex, value);
                });

                return subjectLine;
            },

            updateSourceFromPreview() {
                const tempDiv = this.nodes.emailPreview.cloneNode(true);

                tempDiv.querySelectorAll('span[data-variable]').forEach(span => {
                    const name = span.getAttribute('data-variable');
                    span.replaceWith(`{{${name}}}`);
                });
                // Remove spam highlight marks before syncing back to source
                tempDiv.querySelectorAll('mark').forEach(mark => {
                    mark.replaceWith(mark.textContent);
                });
                
                const newHtml = tempDiv.innerHTML;
                if (this.nodes.htmlInput.value !== newHtml) {
                    this.nodes.htmlInput.value = newHtml;
                    if (typeof $(this.nodes.htmlInput).highlightWithinTextarea === 'function') {
                        $(this.nodes.htmlInput).highlightWithinTextarea('update');
                    }
                    this.updateWordCount();
                    this.saveToLocalStorage();
                    this.updateHealthBadgeAndModal();
                }
            },

            getVariables() {
                const variables = new Map();
                this.nodes.variablesContainer.querySelectorAll('.variable-row').forEach(row => {
                    const name = row.querySelector('.variable-name').value.trim();
                    const value = row.querySelector('.variable-value').value;
                    if (name) variables.set(name, value);
                });
                return variables;
            },

            addVariableRow(name = '', value = '') {
                const safeName = window.EmailEditorUtils ? window.EmailEditorUtils.escapeAttr(name) : String(name).replace(/"/g, '&quot;');
                const safeValue = window.EmailEditorUtils ? window.EmailEditorUtils.escapeAttr(value) : String(value).replace(/"/g, '&quot;');
                const row = document.createElement('div');
                row.className = 'flex items-center space-x-2 variable-row';
                row.innerHTML = `
                    <input type="text" value="${safeName}" placeholder="Variable Name" class="variable-name input-field w-1/3 text-sm">
                    <span class="text-slate-400">=</span>
                    <input type="text" value="${safeValue}" placeholder="Value" class="variable-value input-field flex-grow text-sm">
                    <button class="remove-variable-btn text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full">
                        <i class="fas fa-trash-alt fa-sm"></i>
                    </button>
                `;
                this.nodes.variablesContainer.appendChild(row);

                const updateHandler = () => {
                    this.nodes.htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                };
                row.querySelector('.variable-name').addEventListener('input', updateHandler);
                row.querySelector('.variable-value').addEventListener('input', updateHandler);
                row.querySelector('.remove-variable-btn').addEventListener('click', () => {
                    row.remove();
                    updateHandler();
                });
            },

            copyHtmlToClipboard() {
                navigator.clipboard.writeText(this.nodes.htmlInput.value).then(() => {
                    this.nodes.copyFeedback.classList.remove('opacity-0');
                    setTimeout(() => this.nodes.copyFeedback.classList.add('opacity-0'), 2000);
                }).catch(err => console.error('Failed to copy text: ', err));
            },

            saveSelection(containerEl) {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return null;
                const range = selection.getRangeAt(0);
                if (!containerEl.contains(range.commonAncestorContainer)) return null;

                let charCount = 0;
                let start = 0;
                let end = 0;
                let foundStart = false;
                let foundEnd = false;

                const walker = document.createTreeWalker(
                    containerEl,
                    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
                    {
                        acceptNode: (node) => {
                            if (node.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
                            if (node.nodeName === 'BR') return NodeFilter.FILTER_ACCEPT;
                            return NodeFilter.FILTER_SKIP;
                        }
                    }
                );

                let currentNode = walker.nextNode();
                while (currentNode) {
                    if (currentNode === range.startContainer) {
                        start = charCount + range.startOffset;
                        foundStart = true;
                    } else if (currentNode.nodeType === 1 && currentNode === range.startContainer.childNodes[range.startOffset]) {
                        start = charCount;
                        foundStart = true;
                    }

                    if (currentNode === range.endContainer) {
                        end = charCount + range.endOffset;
                        foundEnd = true;
                    } else if (currentNode.nodeType === 1 && currentNode === range.endContainer.childNodes[range.endOffset]) {
                        end = charCount;
                        foundEnd = true;
                    }

                    if (currentNode.nodeType === 3) {
                        charCount += currentNode.nodeValue.length;
                    } else if (currentNode.nodeName === 'BR') {
                        charCount += 1;
                    }

                    if (foundStart && foundEnd) break;
                    currentNode = walker.nextNode();
                }

                if (!foundStart) {
                    const preSelectionRange = range.cloneRange();
                    preSelectionRange.selectNodeContents(containerEl);
                    preSelectionRange.setEnd(range.startContainer, range.startOffset);
                    start = preSelectionRange.toString().length;
                    end = start + range.toString().length;
                }

                return { start, end };
            },

            restoreSelection(containerEl, savedSel) {
                if (!savedSel || typeof savedSel.start !== 'number') return;
                let charIndex = 0;
                const range = document.createRange();
                let foundStart = false;
                let foundEnd = false;
                let lastNode = containerEl;

                const walker = document.createTreeWalker(
                    containerEl,
                    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
                    {
                        acceptNode: (node) => {
                            if (node.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
                            if (node.nodeName === 'BR') return NodeFilter.FILTER_ACCEPT;
                            return NodeFilter.FILTER_SKIP;
                        }
                    }
                );

                let currentNode = walker.nextNode();
                while (currentNode) {
                    lastNode = currentNode;
                    const len = currentNode.nodeType === 3 ? currentNode.nodeValue.length : 1;
                    const nextCharIndex = charIndex + len;

                    if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
                        if (currentNode.nodeType === 3) {
                            range.setStart(currentNode, Math.min(savedSel.start - charIndex, currentNode.nodeValue.length));
                        } else {
                            range.setStartBefore(currentNode);
                        }
                        foundStart = true;
                    }

                    if (!foundEnd && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
                        if (currentNode.nodeType === 3) {
                            range.setEnd(currentNode, Math.min(savedSel.end - charIndex, currentNode.nodeValue.length));
                        } else {
                            range.setEndAfter(currentNode);
                        }
                        foundEnd = true;
                        break;
                    }

                    charIndex = nextCharIndex;
                    currentNode = walker.nextNode();
                }

                // Safety fallback: if target position was beyond content, place at end — NEVER at 0 (top)!
                if (!foundStart) {
                    if (lastNode && lastNode !== containerEl) {
                        if (lastNode.nodeType === 3) {
                            range.setStart(lastNode, lastNode.nodeValue.length);
                            range.setEnd(lastNode, lastNode.nodeValue.length);
                        } else {
                            range.setStartAfter(lastNode);
                            range.setEndAfter(lastNode);
                        }
                    } else {
                        range.selectNodeContents(containerEl);
                        range.collapse(false);
                    }
                } else if (!foundEnd) {
                    range.collapse(true);
                }

                try {
                    const sel = window.getSelection();
                    if (sel) {
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                } catch (e) {
                    console.warn('Could not restore selection:', e);
                }
            },
            
            // Highlight spam keywords inside the preview (text nodes only)
            highlightSpamInPreview() {
                const container = this.nodes.emailPreview;
                if (!window.spamKeywords || !container) return;
                this.clearSpamMarks(container);

                const textNodes = [];
                const walker = document.createTreeWalker(
                    container,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: (node) => {
                            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                            const parent = node.parentElement;
                            if (!parent) return NodeFilter.FILTER_REJECT;
                            const tag = parent.tagName;
                            if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    }
                );
                let node;
                while ((node = walker.nextNode())) textNodes.push(node);

                textNodes.forEach(textNode => {
                    const text = textNode.nodeValue;
                    const ranges = [];
                    window.spamKeywords.forEach(k => {
                        if (!(k.highlight instanceof RegExp)) return;
                        const flags = k.highlight.flags.includes('g') ? k.highlight.flags : (k.highlight.flags + 'g');
                        const r = new RegExp(k.highlight.source, flags);
                        r.lastIndex = 0;
                        let m;
                        while ((m = r.exec(text)) !== null) {
                            ranges.push({ start: m.index, end: m.index + m[0].length, category: k.category, keyword: k.keyword });
                            if (!r.global) break;
                            if (m.index === r.lastIndex) r.lastIndex++; // avoid zero-length loops
                        }
                    });
                    if (ranges.length === 0) return;

                    ranges.sort((a,b) => (a.start - b.start) || (b.end - a.end));
                    const nonOverlapping = [];
                    let lastEnd = -1;
                    for (const rg of ranges) {
                        if (rg.start >= lastEnd) {
                            nonOverlapping.push(rg);
                            lastEnd = rg.end;
                        }
                    }

                    const frag = document.createDocumentFragment();
                    let idx = 0;
                    nonOverlapping.forEach(rg => {
                        if (rg.start > idx) frag.appendChild(document.createTextNode(text.slice(idx, rg.start)));
                        const mark = document.createElement('mark');
                        mark.className = `spam-category-${rg.category}`;
                        mark.setAttribute('data-spam-keyword', rg.keyword);
                        mark.setAttribute('title', `${rg.keyword} (${rg.category})`);
                        mark.textContent = text.slice(rg.start, rg.end);
                        frag.appendChild(mark);
                        idx = rg.end;
                    });
                    if (idx < text.length) frag.appendChild(document.createTextNode(text.slice(idx)));
                    textNode.parentNode.replaceChild(frag, textNode);
                });
            },

            clearSpamMarks(container) {
                container.querySelectorAll('mark').forEach(mark => {
                    const text = document.createTextNode(mark.textContent || '');
                    mark.replaceWith(text);
                });
            },
            
            getDefaultHtml() {
                return `Hello {{full_name}},<br><br>My name is Rohan from TIGI HR.<br><br>I noticed you're hiring for key AI roles and thought I'd share how leaders like <b>Quest Global, PubMatic, and Shadi.com</b> are accelerating their AI hiring.<br><br>Instead of spending weeks filtering through candidates who only have buzzwords on their resumes, they receive a pre-vetted shortlist of top-tier AI/ML professionals from us in just <b>48-72 hours</b>.<br><br>This allows them to focus their time on what matters: conducting high-quality technical interviews.<br><br>Would you be open to a brief chat about adopting this strategy at {{company_name}}?<br><br>For more details:<br>Our Company Profile: <a href="http://tigihr.com/company_profile" style="color: #3b82f6; text-decoration: underline;">tigihr.com/company_profile</a><br>Our Service Charges: <a href="http://tigihr.com/charges" style="color: #3b82f6; text-decoration: underline;">tigihr.com/charges</a><br><br>Best,<br><br><b>Rohan Patel | +91 7490017176</b><br><b>Business Development Manager</b><br><br><b>TIGI HR SOLUTION PVT. LTD.</b><br><b>Website:</b> <a href="http://www.tigihr.com/" style="color: #3b82f6; text-decoration: underline;">http://www.tigihr.com/</a>`;
            },
            
            // AI Request Counter
            getRequestCounterKey() {
                // Use local date to ensure reset happens at midnight in the user's timezone
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0'); // JS months are 0-indexed
                const day = String(now.getDate()).padStart(2, '0');
                return `ai-request-count-${year}-${month}-${day}`;
            },
            getRequestCount() {
                return parseInt(localStorage.getItem(this.getRequestCounterKey()) || '0', 10);
            },
            incrementRequestCount() {
                const key = this.getRequestCounterKey();
                const currentCount = this.getRequestCount();
                localStorage.setItem(key, currentCount + 1);
                this.updateRequestCounterDisplay();
            },
            resetRequestCount() {
                if (confirm('Are you sure you want to reset the daily AI request counter?')) {
                    const key = this.getRequestCounterKey();
                    localStorage.setItem(key, 0);
                    this.updateRequestCounterDisplay();
                    this.showNotification('Request counter has been reset.');
                }
            },
            updateRequestCounterDisplay() {
                const count = this.getRequestCount();
                const counterElement = document.getElementById('ai-request-count');
                if (counterElement) {
                    counterElement.textContent = count;
                }
            },
            initRequestCounter() {
                this.updateRequestCounterDisplay();
                const resetButton = document.getElementById('reset-request-count');
                if (resetButton) {
                    resetButton.addEventListener('click', () => this.resetRequestCount());
                }
            },

            // AI Enhancement Methods
            async optimizeWithAI() {
                const content = this.nodes.htmlInput.value;
                if (!content.trim()) {
                    this.showNotification('Please add some content to optimize', 'warning');
                    return;
                }

                if (!this.aiReady()) return;
                this.incrementRequestCount();
                this.showAILoading();
                try {
                    const text = await this.callAIAssistant('optimize', { content });
                    this.showAIResponse(text, 'optimize');
                } catch (error) {
                    const errorMsg = error.message?.includes('API') || error.message?.includes('key')
                        ? 'Invalid API key or quota exceeded. Please check your AI API key in Settings.'
                        : error.message?.includes('network') || error.message?.includes('fetch')
                        ? 'Network error. Please check your internet connection and try again.'
                        : `Failed to optimize content: ${error.message || 'Unknown error'}`;
                    this.showAIError(errorMsg, error);
                }
            },

            async getAISuggestions() {
                const content = this.nodes.htmlInput.value;
                if (!content.trim()) {
                    this.showNotification('Please add some content to get suggestions', 'warning');
                    return;
                }

                if (!this.aiReady()) return;
                this.incrementRequestCount();
                this.showAILoading();
                try {
                    const text = await this.callAIAssistant('suggest', { content });
                    this.showAIResponse(text, 'suggest');
                } catch (error) {
                    const errorMsg = error.message?.includes('API') || error.message?.includes('key')
                        ? 'Invalid API key or quota exceeded. Please check your AI API key in Settings.'
                        : error.message?.includes('network') || error.message?.includes('fetch')
                        ? 'Network error. Please check your internet connection and try again.'
                        : `Failed to get suggestions: ${error.message || 'Unknown error'}`;
                    this.showAIError(errorMsg, error);
                }
            },

            async adjustTone() {
                const content = this.nodes.htmlInput.value;
                if (!content.trim()) {
                    this.showNotification('Please add some content to adjust tone');
                    return;
                }

                this.showToneModal();
            },
            
            showToneModal() {
                const toneModal = document.getElementById('tone-modal');
                const toneInput = document.getElementById('tone-input');
                toneInput.value = '';
                toneModal.classList.remove('hidden');
                setTimeout(() => toneInput.focus(), 100);
            },
            
            hideToneModal() {
                document.getElementById('tone-modal').classList.add('hidden');
            },
            
            async applyToneAdjustment() {
                const toneInput = document.getElementById('tone-input');
                const tone = toneInput.value.trim();
                
                if (!tone) {
                    this.showNotification('Please enter a tone style', 'warning');
                    toneInput.style.borderColor = 'var(--color-poppy)';
                    const flashDuration = window.EMAIL_EDITOR_CONSTANTS?.BORDER_FLASH_DURATION_MS || 1500;
                    setTimeout(() => {
                        toneInput.style.borderColor = 'var(--color-platinum)';
                    }, flashDuration);
                    return;
                }
                
                this.hideToneModal();
                const content = this.nodes.htmlInput.value;

                if (!this.aiReady()) return;
                this.incrementRequestCount();
                this.showAILoading();
                try {
                    const text = await this.callAIAssistant('tone', { content, tone });
                    this.showAIResponse(text, 'tone');
                } catch (error) {
                    const errorMsg = error.message?.includes('API') || error.message?.includes('key')
                        ? 'Invalid API key or quota exceeded. Please check your AI API key in Settings.'
                        : error.message?.includes('network') || error.message?.includes('fetch')
                        ? 'Network error. Please check your internet connection and try again.'
                        : `Failed to adjust tone: ${error.message || 'Unknown error'}`;
                    this.showAIError(errorMsg, error);
                }
            },

            async generateSubject() {
                const content = this.nodes.htmlInput.value;
                if (!content.trim()) {
                    this.showNotification('Please add some content to generate subject lines', 'warning');
                    return;
                }

                if (!this.aiReady()) return;
                this.incrementRequestCount();
                this.showAILoading();
                try {
                    const currentSubject = this.nodes.subjectLineInput ? this.nodes.subjectLineInput.value : '';
                    const numSubjects = localStorage.getItem('num-subjects') || '10';
                    const text = await this.callAIAssistant('subject', { content, subjectLine: currentSubject, numSubjects });
                    this.showAIResponse(text, 'subject');
                } catch (error) {
                    const errorMsg = error.message?.includes('API') || error.message?.includes('key')
                        ? 'Invalid API key or quota exceeded. Please check your AI API key in Settings.'
                        : error.message?.includes('network') || error.message?.includes('fetch')
                        ? 'Network error. Please check your internet connection and try again.'
                        : `Failed to generate subject lines: ${error.message || 'Unknown error'}`;
                    this.showAIError(errorMsg, error);
                }
            },

            showAILoading() {
                document.getElementById('ai-loading').classList.remove('hidden');
                document.getElementById('ai-response').classList.add('hidden');
            },

            hideAILoading() {
                const el = document.getElementById('ai-loading');
                if (el) el.classList.add('hidden');
            },

            showAIResponse(content, type = 'general') {
                const formatters = {
                    optimize: this.formatOptimizeResponse,
                    suggest: this.formatSuggestionsResponse,
                    tone: this.formatToneResponse,
                    subject: this.formatSubjectResponse,
                    replacement: this.formatReplacementResponse,
                    general: this.formatGeneralResponse
                };
                
                const formatter = formatters[type] || formatters.general;
                const formattedHTML = formatter.call(this, content);
                
                document.getElementById('ai-loading').classList.add('hidden');
                const sanitizedHTML = window.EmailEditorUtils ? window.EmailEditorUtils.sanitizeHtml(formattedHTML) : formattedHTML;
                document.getElementById('ai-content').innerHTML = sanitizedHTML;
                document.getElementById('ai-response').classList.remove('hidden');
            },

            showAIError(message, error = null) {
                // Log error for debugging
                if (error) {
                    console.error('AI Error Details:', error);
                }
                
                document.getElementById('ai-loading').classList.add('hidden');
                const errorHtml = `
                    <div class="p-4 rounded-xl border-2" style="background: rgba(223, 41, 53, 0.1); border-color: var(--color-poppy);">
                        <div class="flex items-start">
                            <i class="fas fa-exclamation-circle text-2xl mr-3" style="color: var(--color-poppy);"></i>
                            <div class="flex-1">
                                <h4 class="font-semibold mb-2" style="color: var(--color-poppy);">Error</h4>
                                <p class="text-sm" style="color: var(--color-text);">${message}</p>
                            </div>
                        </div>
                    </div>
                `;
                document.getElementById('ai-content').innerHTML = errorHtml;
                document.getElementById('ai-response').classList.remove('hidden');
                this.showNotification(message, 'error');
            },

            // AI Response Formatters
            formatOptimizeResponse(content) {
                const optimizedContent = this.parseMarkdown(content);
                const contentId = 'opt-' + Date.now();
                
                // Store content for copying
                window.aiContentCache = window.aiContentCache || {};
                window.aiContentCache[contentId] = content;
                
                return `
                    <div class="ai-response-optimize">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-lg font-semibold text-green-800 flex items-center">
                                <i class="fas fa-magic mr-2"></i>Optimized Content
                            </h4>
                            <div class="flex gap-2">
                                <button data-action="copy" data-content-id="${contentId}" class="ai-action-btn ai-btn-copy">
                                    <i class="fas fa-copy mr-1"></i>Copy
                                </button>
                                <button data-action="apply" data-content-id="${contentId}" class="ai-action-btn ai-btn-apply">
                                    <i class="fas fa-check mr-1"></i>Apply to Editor
                                </button>
                            </div>
                        </div>
                        <div class="ai-content-card">
                            ${optimizedContent}
                        </div>
                    </div>
                `;
            },

            formatSuggestionsResponse(content) {
                const sections = this.parseSuggestionsIntoSections(content);
                const contentId = 'sug-' + Date.now();
                window.aiContentCache = window.aiContentCache || {};
                window.aiContentCache[contentId] = content;
                
                return `
                    <div class="ai-response-suggestions">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-lg font-semibold text-blue-800 flex items-center">
                                <i class="fas fa-lightbulb mr-2"></i>AI Suggestions
                            </h4>
                            <button data-action="copy" data-content-id="${contentId}" class="ai-action-btn ai-btn-copy">
                                <i class="fas fa-copy mr-1"></i>Copy All
                            </button>
                        </div>
                        <div class="ai-suggestions-content space-y-4">
                            ${sections.map(section => `
                                <div class="suggestion-section">
                                    <h5 class="text-sm font-semibold text-blue-700 mb-2 flex items-center">
                                        ${this.getSectionIcon(section.title)} ${section.title}
                                    </h5>
                                    <div class="ml-4">
                                        ${this.parseMarkdown(section.content)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            },

            formatToneResponse(content) {
                const adjustedContent = this.parseMarkdown(content);
                const contentId = 'tone-' + Date.now();
                window.aiContentCache = window.aiContentCache || {};
                window.aiContentCache[contentId] = content;
                
                return `
                    <div class="ai-response-tone">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-lg font-semibold text-purple-800 flex items-center">
                                <i class="fas fa-palette mr-2"></i>Tone Adjusted
                            </h4>
                            <div class="flex gap-2">
                                <button data-action="copy" data-content-id="${contentId}" class="ai-action-btn ai-btn-copy">
                                    <i class="fas fa-copy mr-1"></i>Copy
                                </button>
                                <button data-action="apply" data-content-id="${contentId}" class="ai-action-btn ai-btn-apply">
                                    <i class="fas fa-check mr-1"></i>Replace Content
                                </button>
                            </div>
                        </div>
                        <div class="ai-content-card">
                            ${adjustedContent}
                        </div>
                    </div>
                `;
            },

            formatSubjectResponse(content) {
                const subjects = this.parseSubjectLines(content);
                const contentId = 'subj-' + Date.now();
                window.aiContentCache = window.aiContentCache || {};
                window.aiContentCache[contentId] = subjects.join('\n');
                
                return `
                    <div class="ai-response-subjects">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-lg font-semibold text-orange-800 flex items-center">
                                <i class="fas fa-envelope mr-2"></i>Generated Subject Lines
                            </h4>
                            <button data-action="copy" data-content-id="${contentId}" class="ai-action-btn ai-btn-copy">
                                <i class="fas fa-copy mr-1"></i>Copy All
                            </button>
                        </div>
                        <div class="ai-subjects-list">
                            ${subjects.map((subject, index) => {
                                const subjectId = 'subj-' + Date.now() + '-' + index;
                                window.aiContentCache[subjectId] = subject;
                                return `
                                    <div class="ai-subject-card">
                                        <div class="ai-subject-header">
                                            <span class="ai-subject-number">${index + 1}.</span>
                                            <span class="ai-subject-text">${subject}</span>
                                            <span class="ai-subject-meta">
                                                ${subject.length} chars 
                                                <span class="ai-spam-indicator">${this.getSpamIndicator(subject)}</span>
                                            </span>
                                        </div>
                                        <div class="ai-subject-actions">
                                            <button data-action="copy" data-content-id="${subjectId}" class="ai-action-btn ai-btn-copy-small">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                            <button data-action="use" data-content-id="${subjectId}" class="ai-action-btn ai-btn-use">
                                                <i class="fas fa-check mr-1"></i>Use This
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            },

            formatReplacementResponse(content) {
                // Content is expected to be an object: { applied, present, skipped }
                if (typeof content === 'string') {
                    // Fallback for string content
                    return this.formatGeneralResponse(content);
                }
                
                const { applied, present, skipped } = content;
                
                if (applied === 0) {
                    const msg = skipped && skipped.length
                        ? 'No occurrences found to replace. The following were not found in your email.'
                        : 'No spam replacements needed — your content looks clean and professional!';
                    return `
                        <div class="ai-response-general">
                            <div class="ai-content-card">
                                <div class="flex items-center mb-3">
                                    <i class="fas fa-check-circle text-2xl mr-3" style="color: var(--color-success);"></i>
                                    <h3 class="text-base font-semibold text-slate-800">Spam Check Complete</h3>
                                </div>
                                <p class="text-slate-600 mb-3">${msg}</p>
                                ${skipped && skipped.length ? `
                                    <div class="space-y-2">
                                        ${skipped.map(m => `
                                            <div class="p-2 rounded" style="background: rgba(0,0,0,0.05);">
                                                <span class="text-sm text-slate-500">${this.escapeHtml(m.from)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }
                
                return `
                    <div class="ai-response-general">
                        <div class="ai-content-card">
                            <div class="flex items-center mb-4">
                                <i class="fas fa-check-circle text-2xl mr-3" style="color: var(--color-success);"></i>
                                <h3 class="text-lg font-semibold">Applied ${applied} Replacement${applied === 1 ? '' : 's'}</h3>
                            </div>
                            
                            <div class="space-y-3">
                                ${present.map(m => `
                                    <div class="p-3 rounded-lg border-2" style="background: var(--color-light-bg); border-color: var(--color-platinum);">
                                        <div class="flex items-start gap-3">
                                            <div class="flex-1">
                                                <div class="text-sm text-slate-500 mb-1">Original:</div>
                                                <div class="p-2 rounded mb-2" style="background: rgba(223, 41, 53, 0.1); border-left: 3px solid var(--color-poppy);">
                                                    ${this.escapeHtml(m.from)}
                                                </div>
                                                <div class="text-sm text-slate-500 mb-1">Replaced with:</div>
                                                <div class="p-2 rounded" style="background: rgba(232, 144, 5, 0.1); border-left: 3px solid var(--color-success);">
                                                    <strong>${this.escapeHtml(m.to)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            
                            ${skipped && skipped.length ? `
                                <div class="mt-4 pt-4 border-t-2" style="border-color: var(--color-platinum);">
                                    <p class="text-sm text-slate-500 mb-2">
                                        <i class="fas fa-info-circle mr-1"></i>
                                        Skipped (not found in email):
                                    </p>
                                    <div class="space-y-1">
                                        ${skipped.map(m => `
                                            <div class="text-sm text-slate-400">${this.escapeHtml(m.from)}</div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            },
            
            formatGeneralResponse(content) {
                const parsedContent = this.parseMarkdown(content);
                return `
                    <div class="ai-response-general">
                        <div class="ai-content-card">
                            ${parsedContent}
                        </div>
                    </div>
                `;
            },

            // Helper Methods for Formatters
            parseMarkdown(text) {
                if (!text) return '';
                
                // Split into lines for better processing
                let lines = text.split('\n');
                let result = [];
                let inList = false;
                let listItems = [];
                
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i].trim();
                    
                    // Skip empty lines
                    if (!line) {
                        if (inList) {
                            result.push('<ul class="list-disc ml-6 mb-3 space-y-1">' + listItems.join('') + '</ul>');
                            listItems = [];
                            inList = false;
                        }
                        continue;
                    }
                    
                    // Headers (###, ##, #)
                    if (line.startsWith('###')) {
                        result.push(`<h4 class="text-md font-semibold text-gray-800 mt-4 mb-2">${line.substring(3).trim()}</h4>`);
                    }
                    else if (line.startsWith('##')) {
                        result.push(`<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">${line.substring(2).trim()}</h3>`);
                    }
                    else if (line.startsWith('#')) {
                        result.push(`<h2 class="text-xl font-semibold text-gray-800 mt-4 mb-3">${line.substring(1).trim()}</h2>`);
                    }
                    // Numbered lists
                    else if (/^\d+\./.test(line)) {
                        let content = line.replace(/^\d+\.\s*/, '');
                        listItems.push(`<li class="text-gray-700">${this.formatInlineMarkdown(content)}</li>`);
                        inList = true;
                    }
                    // Bullet lists
                    else if (line.startsWith('- ') || line.startsWith('* ')) {
                        let content = line.substring(2);
                        listItems.push(`<li class="text-gray-700">${this.formatInlineMarkdown(content)}</li>`);
                        inList = true;
                    }
                    // Regular paragraphs
                    else {
                        if (inList) {
                            result.push('<ul class="list-disc ml-6 mb-3 space-y-1">' + listItems.join('') + '</ul>');
                            listItems = [];
                            inList = false;
                        }
                        result.push(`<p class="mb-3 text-gray-700 leading-relaxed">${this.formatInlineMarkdown(line)}</p>`);
                    }
                }
                
                // Close any remaining list
                if (inList) {
                    result.push('<ul class="list-disc ml-6 mb-3 space-y-1">' + listItems.join('') + '</ul>');
                }
                
                return result.join('');
            },

            formatInlineMarkdown(text) {
                return text
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
            },

            parseSubjectLines(content) {
                if (!content) return [];
                
                const lines = content.split('\n').filter(line => line.trim());
                const subjects = [];
                
                lines.forEach(line => {
                    const cleanLine = line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
                    if (cleanLine && cleanLine.length > 5 && cleanLine.length < 100) {
                        subjects.push(cleanLine);
                    }
                });
                
                return subjects;
            },

            getSpamIndicator(subject) {
                const spamWords = ['free', 'urgent', 'limited', 'act now', 'click here', 'winner', 'congratulations'];
                const lowerSubject = subject.toLowerCase();
                const spamCount = spamWords.filter(word => lowerSubject.includes(word)).length;
                
                if (spamCount === 0) return '🟢 Safe';
                if (spamCount === 1) return '🟡 Caution';
                return '🔴 Risky';
            },

            escapeForJS(str) {
                if (!str) return '';
                // Remove HTML tags for JS insertion, keep text only
                const textOnly = str.replace(/<[^>]*>/g, '');
                return textOnly
                    .replace(/\\/g, '\\\\')
                    .replace(/'/g, "\\'")
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r');
            },

            // Action Button Handlers
            copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showNotification('Copied to clipboard!');
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    this.showNotification('Failed to copy to clipboard');
                });
            },

            applyToEditor(content) {
                this.nodes.htmlInput.value = content;
                this.nodes.htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                this.showNotification('Content applied to editor!');
            },

            useSubject(subject) {
                if (this.nodes.subjectLineInput) {
                    // Apply the subject line directly (it should contain variables if needed)
                    this.nodes.subjectLineInput.value = subject;
                    // Update the preview to reflect the new subject line
                    this.renderSubjectLine();
                    this.saveToLocalStorage();
                    this.showNotification('Subject line applied!');
                } else {
                    this.copyToClipboard(subject);
                    this.showNotification('Subject line copied!');
                }
            },

            parseSuggestionsIntoSections(text) {
                // Split content by headers or numbered sections
                const sections = [];
                const lines = text.split('\n');
                let currentSection = { title: 'General Suggestions', content: '' };
                
                lines.forEach(line => {
                    if (line.match(/^#{1,3}\s/)) {
                        if (currentSection.content) sections.push(currentSection);
                        currentSection = { 
                            title: line.replace(/^#{1,3}\s/, '').trim(), 
                            content: '' 
                        };
                    } else if (line.match(/^\d+\.\s*[A-Z]/)) {
                        if (currentSection.content) sections.push(currentSection);
                        currentSection = { 
                            title: line.replace(/^\d+\.\s*/, '').trim().split(':')[0], 
                            content: line 
                        };
                    } else {
                        currentSection.content += line + '\n';
                    }
                });
                
                if (currentSection.content) sections.push(currentSection);
                return sections;
            },

            getSectionIcon(title) {
                const iconMap = {
                    'subject': '📧',
                    'content': '📝',
                    'call': '🎯',
                    'action': '🎯',
                    'cta': '🎯',
                    'spam': '🛡️',
                    'structure': '🏗️',
                    'engagement': '💡',
                    'tone': '🎨'
                };
                
                const lowerTitle = title.toLowerCase();
                for (const [key, icon] of Object.entries(iconMap)) {
                    if (lowerTitle.includes(key)) return icon;
                }
                return '•';
            },

            // Template Management Methods
            saveTemplate() {
                this.showSaveTemplateModal();
            },
            
            showSaveTemplateModal() {
                const modal = document.getElementById('save-template-modal');
                const input = document.getElementById('template-name-input');
                input.value = '';
                modal.classList.remove('hidden');
                setTimeout(() => input.focus(), 100);
            },
            
            hideSaveTemplateModal() {
                document.getElementById('save-template-modal').classList.add('hidden');
            },
            
            confirmSaveTemplate() {
                const input = document.getElementById('template-name-input');
                const templateName = input.value.trim();
                
                // Validate template name
                const validation = window.EmailEditorUtils?.validateTemplateName(templateName) || 
                    { isValid: !!templateName, error: 'Template name cannot be empty' };
                
                if (!validation.isValid) {
                    this.showNotification(validation.error, 'error');
                    input.style.borderColor = 'var(--color-poppy)';
                    const flashDuration = window.EMAIL_EDITOR_CONSTANTS?.BORDER_FLASH_DURATION_MS || 1500;
                    setTimeout(() => {
                        input.style.borderColor = 'var(--color-platinum)';
                    }, flashDuration);
                    return;
                }

                const template = {
                    name: templateName,
                    html: this.nodes.htmlInput.value,
                    subjectLine: this.nodes.subjectLineInput ? this.nodes.subjectLineInput.value : '',
                    variables: Array.from(this.getVariables()),
                    timestamp: new Date().toISOString()
                };

                const savedTemplates = JSON.parse(localStorage.getItem('emailTemplates') || '[]');
                savedTemplates.push(template);
                localStorage.setItem('emailTemplates', JSON.stringify(savedTemplates));

                this.hideSaveTemplateModal();
                this.showNotification('Template saved successfully!');
                this.updateLastSaved();
            },

            loadTemplate() {
                const savedTemplates = JSON.parse(localStorage.getItem('emailTemplates') || '[]');
                if (savedTemplates.length === 0) {
                    this.showNotification('No saved templates found', 'warning');
                    return;
                }

                this.showLoadTemplateModal(savedTemplates);
            },
            
            showLoadTemplateModal(templates) {
                const modal = document.getElementById('load-template-modal');
                const templateList = document.getElementById('template-list');
                
                templateList.innerHTML = '';
                templates.forEach(template => {
                    const item = document.createElement('div');
                    item.className = 'template-item';
                    item.innerHTML = `
                        <div class="flex items-center justify-between">
                            <div class="flex-grow">
                                <div class="font-semibold" style="color: var(--color-text);">${this.constructor.escapeHtml(template.name)}</div>
                                <div class="text-xs mt-1" style="color: var(--color-text-muted);">
                                    <i class="fas fa-clock mr-1"></i>${new Date(template.timestamp).toLocaleString()}
                                </div>
                            </div>
                            <i class="fas fa-chevron-right" style="color: var(--color-blue-violet);"></i>
                        </div>
                    `;
                    item.addEventListener('click', () => this.loadTemplateByName(template.name));
                    templateList.appendChild(item);
                });
                
                modal.classList.remove('hidden');
            },
            
            hideLoadTemplateModal() {
                document.getElementById('load-template-modal').classList.add('hidden');
            },
            
            loadTemplateByName(templateName) {
                const savedTemplates = JSON.parse(localStorage.getItem('emailTemplates') || '[]');
                const template = savedTemplates.find(t => t.name === templateName);
                
                if (!template) {
                    this.showNotification('Template not found', 'error');
                    return;
                }

                this.nodes.htmlInput.value = template.html;
                if (template.subjectLine && this.nodes.subjectLineInput) {
                    this.nodes.subjectLineInput.value = template.subjectLine;
                }
                this.nodes.variablesContainer.innerHTML = '';
                
                template.variables.forEach(([name, value]) => {
                    this.addVariableRow(name, value);
                });

                this.nodes.htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                this.hideLoadTemplateModal();
                this.showNotification('Template loaded successfully!');
            },

            clearAll() {
                if (confirm('Are you sure you want to clear all content and variables?')) {
                    this.nodes.htmlInput.value = '';
                    this.nodes.variablesContainer.innerHTML = '';
                    this.nodes.htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                    this.showNotification('All content cleared');
                }
            },

            // Auto-save functionality
            initAutoSave() {
                const AUTO_SAVE_INTERVAL = window.EMAIL_EDITOR_CONSTANTS?.AUTO_SAVE_INTERVAL_MS || 30000;
                this.autoSaveInterval = setInterval(() => {
                    this.saveToLocalStorage();
                }, AUTO_SAVE_INTERVAL);

                // Save on page unload
                this.beforeUnloadHandler = () => {
                    this.saveToLocalStorage();
                };
                window.addEventListener('beforeunload', this.beforeUnloadHandler);
            },
            
            // Cleanup function to prevent memory leaks
            cleanup() {
                // Clear auto-save interval
                if (this.autoSaveInterval) {
                    clearInterval(this.autoSaveInterval);
                    this.autoSaveInterval = null;
                }
                
                // Remove event listener
                if (this.beforeUnloadHandler) {
                    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
                    this.beforeUnloadHandler = null;
                }
                
                // Clear AI content cache
                if (window.aiContentCache) {
                    window.aiContentCache = null;
                }
            },

            saveToLocalStorage() {
                const data = {
                    html: this.nodes.htmlInput.value,
                    subjectLine: this.nodes.subjectLineInput ? this.nodes.subjectLineInput.value : '',
                    variables: Array.from(this.getVariables()),
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('emailEditorData', JSON.stringify(data));
                this.updateLastSaved();
            },

            loadFromLocalStorage() {
                // Initialize default system prompt if none exists
                if (!localStorage.getItem('system-prompt')) {
                    const defaultSystemPrompt = `You are an expert email marketing specialist and copywriter with a deep understanding of conversion-focused principles. Your analysis and recommendations are grounded in established frameworks like AIDA (Attention, Interest, Desire, Action) and PAS (Problem, Agitate, Solution).

Your responses must always be:
- **Expert-Level:** Provide insights that a seasoned professional would.
- **Actionable:** Give clear, direct advice that the user can implement immediately.
- **Concise:** Be brief and to the point. Avoid filler and unnecessary explanations.
- **Data-Driven:** Focus on changes that demonstrably improve open rates, click-through rates, and deliverability while avoiding spam filters.`;
                    localStorage.setItem('system-prompt', defaultSystemPrompt);
                }

                const data = JSON.parse(localStorage.getItem('emailEditorData') || 'null');
                if (data && data.html) {
                    this.nodes.htmlInput.value = data.html;
                    if (data.subjectLine && this.nodes.subjectLineInput) {
                        this.nodes.subjectLineInput.value = data.subjectLine;
                    }
                    this.nodes.variablesContainer.innerHTML = '';
                    
                    data.variables.forEach(([name, value]) => {
                        this.addVariableRow(name, value);
                    });

                    this.nodes.htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                    this.showNotification('Previous work restored');
                }

                // If arriving from templates.html with a selection, load by name
                const toLoad = localStorage.getItem('template-to-load');
                if (toLoad) {
                    localStorage.removeItem('template-to-load');
                    try {
                        const savedTemplates = JSON.parse(localStorage.getItem('emailTemplates') || '[]');
                        const t = savedTemplates.find(x => x && x.name === toLoad);
                        if (t) {
                            this.nodes.htmlInput.value = t.html || '';
                            this.nodes.variablesContainer.innerHTML = '';
                            (t.variables || []).forEach(([name, value]) => this.addVariableRow(name, value));
                            this.nodes.htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                            this.showNotification(`Loaded template: ${toLoad}`);
                        }
                    } catch(_) {}
                }
            },

            updateLastSaved() {
                const now = new Date();
                document.getElementById('last-saved').textContent = 
                    `Last saved: ${now.toLocaleTimeString()}`;
            },

            updateWordCount() {
                const content = this.nodes.htmlInput.value;
                const words = content.trim() ? (content.match(/\S+/g) || []).length : 0;
                const chars = content.length;
                
                document.getElementById('word-count').textContent = `Words: ${words}`;
                document.getElementById('char-count').textContent = `Characters: ${chars}`;
            },

            // Keyboard shortcuts
            initKeyboardShortcuts() {
                document.addEventListener('keydown', (e) => {
                    if (e.ctrlKey || e.metaKey) {
                        switch (e.key.toLowerCase()) {
                            case 's':
                                e.preventDefault();
                                this.saveTemplate();
                                break;
                            case 'z':
                                if (e.shiftKey) {
                                    e.preventDefault();
                                    this.redo();
                                } else {
                                    e.preventDefault();
                                    this.undo();
                                }
                                break;
                            case 'y':
                                e.preventDefault();
                                this.redo();
                                break;
                            case 'o':
                                e.preventDefault();
                                this.optimizeWithAI();
                                break;
                            case 'shift':
                                if (e.key === 'c' || e.key === 'C') {
                                    e.preventDefault();
                                    this.copyHtmlToClipboard();
                                }
                                break;
                        }
                    }
                });
            },

            undo() {
                document.execCommand('undo');
            },

            redo() {
                document.execCommand('redo');
            },

            // Initialize help modal
            initHelpModal() {
                const helpBtn = document.getElementById('help-btn');
                const helpModal = document.getElementById('help-modal');
                const closeHelp = document.getElementById('close-help');

                helpBtn.addEventListener('click', () => {
                    helpModal.classList.remove('hidden');
                });

                closeHelp.addEventListener('click', () => {
                    helpModal.classList.add('hidden');
                });

                helpModal.addEventListener('click', (e) => {
                    if (e.target === helpModal) {
                        helpModal.classList.add('hidden');
                    }
                });
            },

            // Load custom spam words from settings
            loadCustomSpamWords() {
                const customWords = JSON.parse(localStorage.getItem('custom-spam-words') || '[]');
                if (customWords.length > 0 && window.spamKeywords) {
                    // Add custom words to the global spam keywords
                    customWords.forEach(word => {
                        const regex = new RegExp(word.highlight || `\\b${word.keyword}\\b`, 'gi');
                        window.spamKeywords.push({
                            highlight: regex,
                            keyword: word.keyword,
                            category: word.category
                        });
                    });
                    // Re-initialize the highlighter if it exists
                    if (this.nodes.htmlInput && typeof $.fn.highlightWithinTextarea === 'function') {
                        $(this.nodes.htmlInput).highlightWithinTextarea('destroy');
                        $(this.nodes.htmlInput).highlightWithinTextarea({ highlight: window.spamKeywords });
                    }
                }
            },

            // Insert signature at cursor position
            insertSignature() {
                const signature = localStorage.getItem('email-signature');
                if (!signature) {
                    this.showNotification('No signature found in settings');
                    return;
                }
                
                const currentContent = this.nodes.htmlInput.value;
                // Insert signature at the end with line breaks
                this.nodes.htmlInput.value = currentContent + (currentContent ? '<br><br>' : '') + signature;
                this.nodes.htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                this.showNotification('Signature inserted successfully!');
            }
        };

        // Extend EmailEditor with Spam Rewrite capability
        EmailEditor.rewriteSpamWords = async function() {
            const content = this.nodes.htmlInput.value;
            if (!content.trim()) { this.showNotification('Please add some content first'); return; }

            // Ensure preview is rendered and highlighted to collect current spam words
            this.renderPreview();
            const detected = this.collectCurrentSpamKeywords();
            const defaultList = detected.slice(0, 30).join(', ');
            this.showSpamRewriteModal(defaultList);
        };
        
        EmailEditor.showHealthModal = function() {
            this.updateHealthBadgeAndModal();
            const modal = document.getElementById('health-modal');
            if (modal) modal.classList.remove('hidden');
        };
        
        EmailEditor.hideHealthModal = function() {
            const modal = document.getElementById('health-modal');
            if (modal) modal.classList.add('hidden');
        };
        
        EmailEditor.showSpamRewriteModal = function(defaultWords) {
            const modal = document.getElementById('spam-rewrite-modal');
            const input = document.getElementById('spam-words-input');
            input.value = defaultWords;
            modal.classList.remove('hidden');
            setTimeout(() => input.focus(), 100);
        };
        
        EmailEditor.hideSpamRewriteModal = function() {
            document.getElementById('spam-rewrite-modal').classList.add('hidden');
        };
        
        EmailEditor.confirmSpamRewrite = async function() {
            const input = document.getElementById('spam-words-input');
            const userList = (input?.value || '').trim();
            let terms = userList ? userList.split(',').map(s => s.trim()).filter(Boolean) : [];
            
            // If empty, auto-detect from current preview spam keywords as indicated in modal placeholder
            if (terms.length === 0) {
                this.renderPreview();
                terms = this.collectCurrentSpamKeywords();
            }

            if (terms.length === 0) { 
                this.hideSpamRewriteModal();
                this.showNotification('No spam words detected or provided to rewrite'); 
                return; 
            }
            
            this.hideSpamRewriteModal();
            const content = this.nodes.htmlInput.value;

            if (!this.aiReady()) return;
            this.incrementRequestCount();
            this.showAILoading();
            try {
                const text = await this.callAIAssistant('rewrite', { content, terms: JSON.stringify(terms) }) || '';
                const mapping = this.parseReplacementMapping(text);
                if (!Array.isArray(mapping)) {
                    throw new Error('Invalid response format from AI');
                }

                // If no replacements were returned or needed (empty array [] from model)
                if (mapping.length === 0) {
                    this.showAIResponse({
                        applied: 0,
                        present: [],
                        skipped: []
                    }, 'replacement');
                    this.showNotification('No spam replacements needed — your email is clean!');
                    return;
                }

                // Filter mappings to only those that actually appear in the current preview (text) OR source (HTML)
                const previewText = (this.nodes.emailPreview.textContent || '');
                const sourceHtml = (this.nodes.htmlInput.value || '');
                const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const toFlexibleSpace = (s) => s.replace(/\s+/g, '\\s+');
                const toQuoteVariants = (s) => [s, s.replace(/'/g, '’'), s.replace(/’/g, "'")];
                const appearsInPreview = (term) => {
                    for (const variant of toQuoteVariants(term)) {
                        const re = new RegExp(toFlexibleSpace(escapeRegex(variant)), 'i');
                        if (re.test(previewText) || re.test(sourceHtml)) return true;
                    }
                    return false;
                };

                const present = mapping.filter(m => m && typeof m.from === 'string' && appearsInPreview(m.from));
                const skipped = mapping.filter(m => m && typeof m.from === 'string' && !appearsInPreview(m.from));

                let applied = present.length ? this.applyReplacementsToPreview(present) : 0;
                if (applied === 0) {
                    // Final fallback: attempt replacements directly on source HTML (DOM-walk to avoid attributes)
                    const appliedToSource = this.applyReplacementsToSourceHtml(mapping);
                    if (appliedToSource > 0) {
                        // Source updated; trigger input pipeline to re-render preview/highlights
                        this.nodes.htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                        applied = appliedToSource;
                    }
                }
                
                // Sync preview -> source and re-highlight if any applied
                if (applied > 0) {
                    this.updateSourceFromPreview();
                }
                
                // Show formatted replacement response
                this.showAIResponse({
                    applied: applied,
                    present: present,
                    skipped: skipped
                }, 'replacement');
                
                if (applied > 0) {
                    this.showNotification('Spam words rewritten successfully');
                }
            } catch (error) {
                const errorMsg = error.message?.includes('API') || error.message?.includes('key')
                        ? 'Invalid API key or quota exceeded. Please check your AI API key in Settings.'
                        : error.message?.includes('network') || error.message?.includes('fetch')
                        ? 'Network error. Please check your internet connection and try again.'
                        : `Failed to rewrite spam words: ${error.message || 'Unknown error'}. Try with fewer terms.`;
                this.showAIError(errorMsg, error);
            }
        };

        EmailEditor.collectCurrentSpamKeywords = function() {
            const set = new Set();
            // marks exist only in preview; ensure latest
            // Collect the actual matched text content, not the keyword label
            this.nodes.emailPreview.querySelectorAll('mark[data-spam-keyword]').forEach(m => {
                const actualText = (m.textContent || '').trim();
                if (actualText) set.add(actualText);
            });
            return Array.from(set);
        };

        EmailEditor.parseReplacementMapping = function(text) {
            if (!text) return [];
            try {
                // strip code block fences if present (```json or ```)
                const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').replace(/```/g, '').trim();
                const jsonStart = cleaned.indexOf('[');
                const jsonEnd = cleaned.lastIndexOf(']');
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
                    const arr = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
                    return (Array.isArray(arr) ? arr : []).filter(x => x && typeof x.from === 'string' && typeof x.to === 'string');
                }
            } catch(_) {}
            // fallback: line format "from -> to"
            const lines = text.split(/\r?\n/);
            const pairs = [];
            lines.forEach(line => {
                const m = line.match(/^(.+?)\s*->\s*(.+)$/);
                if (m) pairs.push({ from: m[1].trim(), to: m[2].trim() });
            });
            return pairs;
        };

        EmailEditor.applyReplacementsToPreview = function(mapping) {
            // Remove marks to avoid replacing inside <mark>
            this.clearSpamMarks(this.nodes.emailPreview);

            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const toQuoteVariants = (s) => [
                s,
                s.replace(/'/g, '\u2019'),
                s.replace(/'/g, "'")
            ];
            const toFlexibleSpace = (s) => s.replace(/\s+/g, '\\s+');
            const isWordLike = (s) => /^(?:[\p{L}\p{N}_]+)$/u.test(s);
            
            let count = 0;
            
            // Strategy 1: Try whole innerHTML replacement for multi-node phrases
            let innerHTML = this.nodes.emailPreview.innerHTML;
            const originalInnerHTML = innerHTML;
            
            mapping.forEach(({ from, to }) => {
                if (!from || typeof to !== 'string') return;
                
                const candidates = toQuoteVariants(from);
                let replacedInHTML = false;
                
                for (const candidate of candidates) {
                    if (isWordLike(candidate)) {
                        // Single word: use word boundaries
                        const pat = new RegExp(`\\b${escapeRegex(candidate)}\\b`, 'gi');
                        const matches = innerHTML.match(pat);
                        if (matches) {
                            innerHTML = innerHTML.replace(pat, to);
                            count += matches.length;
                            replacedInHTML = true;
                            break;
                        }
                    } else {
                        // Phrase: flexible whitespace, handles multiple nodes
                        const pat = new RegExp(toFlexibleSpace(escapeRegex(candidate)), 'gi');
                        const matches = innerHTML.match(pat);
                        if (matches) {
                            innerHTML = innerHTML.replace(pat, to);
                            count += matches.length;
                            replacedInHTML = true;
                            break;
                        }
                    }
                }
                
                // Fallback: case-insensitive literal match
                if (!replacedInHTML) {
                    const fallback = new RegExp(escapeRegex(from), 'gi');
                    const matches = innerHTML.match(fallback);
                    if (matches) {
                        innerHTML = innerHTML.replace(fallback, to);
                        count += matches.length;
                    }
                }
            });
            
            // Apply the updated HTML if changes were made
            if (innerHTML !== originalInnerHTML) {
                this.nodes.emailPreview.innerHTML = innerHTML;
            } else {
                // Strategy 2: Fallback to node-by-node replacement for edge cases
                const walker = document.createTreeWalker(this.nodes.emailPreview, NodeFilter.SHOW_TEXT, {
                    acceptNode: (node) => {
                        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;
                        const tag = parent.tagName;
                        if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
                        return NodeFilter.FILTER_ACCEPT;
                    }
                });
                const nodes = [];
                let n;
                while ((n = walker.nextNode())) nodes.push(n);

                nodes.forEach(node => {
                    let text = node.nodeValue;
                    mapping.forEach(({ from, to }) => {
                        if (!from || typeof to !== 'string') return;
                        const candidates = toQuoteVariants(from);
                        let replacedThisTerm = false;
                        for (const candidate of candidates) {
                            const beforeCandidate = text;
                            if (isWordLike(candidate)) {
                                const pat = new RegExp(`\\b${escapeRegex(candidate)}\\b`, 'gi');
                                text = text.replace(pat, () => { count++; replacedThisTerm = true; return to; });
                            } else {
                                const pat = new RegExp(toFlexibleSpace(escapeRegex(candidate)), 'gi');
                                text = text.replace(pat, () => { count++; replacedThisTerm = true; return to; });
                            }
                            if (text !== beforeCandidate) break;
                        }
                        if (!replacedThisTerm) {
                            const fallback = new RegExp(escapeRegex(from), 'gi');
                            text = text.replace(fallback, () => { count++; return to; });
                        }
                    });
                    node.nodeValue = text;
                });
            }

            // Re-apply spam highlights post-change
            this.highlightSpamInPreview();
            return count;
        };

        // Apply replacements by parsing source HTML and updating only text nodes
        EmailEditor.applyReplacementsToSourceHtml = function(mapping) {
            const html = this.nodes.htmlInput.value || '';
            if (!html || !Array.isArray(mapping) || mapping.length === 0) return 0;

            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const toQuoteVariants = (s) => [
                s,
                s.replace(/'/g, '\u2019'),
                s.replace(/'/g, "'")
            ];
            const toFlexibleSpace = (s) => s.replace(/\s+/g, '\\s+');
            const isWordLike = (s) => /^(?:[\p{L}\p{N}_]+)$/u.test(s);

            let count = 0;
            
            // Strategy 1: Try direct HTML string replacement for phrases
            let updatedHTML = html;
            const originalHTML = html;
            
            mapping.forEach(({ from, to }) => {
                if (!from || typeof to !== 'string') return;
                
                const candidates = toQuoteVariants(from);
                let replacedInHTML = false;
                
                for (const candidate of candidates) {
                    if (isWordLike(candidate)) {
                        // Single word: use word boundaries
                        const pat = new RegExp(`\\b${escapeRegex(candidate)}\\b`, 'gi');
                        const matches = updatedHTML.match(pat);
                        if (matches) {
                            updatedHTML = updatedHTML.replace(pat, to);
                            count += matches.length;
                            replacedInHTML = true;
                            break;
                        }
                    } else {
                        // Phrase: flexible whitespace
                        const pat = new RegExp(toFlexibleSpace(escapeRegex(candidate)), 'gi');
                        const matches = updatedHTML.match(pat);
                        if (matches) {
                            updatedHTML = updatedHTML.replace(pat, to);
                            count += matches.length;
                            replacedInHTML = true;
                            break;
                        }
                    }
                }
                
                // Fallback: case-insensitive literal match
                if (!replacedInHTML) {
                    const fallback = new RegExp(escapeRegex(from), 'gi');
                    const matches = updatedHTML.match(fallback);
                    if (matches) {
                        updatedHTML = updatedHTML.replace(fallback, to);
                        count += matches.length;
                    }
                }
            });
            
            if (updatedHTML !== originalHTML) {
                this.nodes.htmlInput.value = updatedHTML;
                return count;
            }
            
            // Strategy 2: Fallback to DOM-based replacement
            const container = document.createElement('div');
            container.innerHTML = html;

            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                    if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    const tag = parent.tagName;
                    if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });
            const nodes = [];
            let n;
            while ((n = walker.nextNode())) nodes.push(n);

            nodes.forEach(node => {
                let text = node.nodeValue;
                mapping.forEach(({ from, to }) => {
                    if (!from || typeof to !== 'string') return;
                    const candidates = toQuoteVariants(from);
                    let replacedThisTerm = false;
                    for (const candidate of candidates) {
                        const beforeCandidate = text;
                        if (isWordLike(candidate)) {
                            const pat = new RegExp(`\\b${escapeRegex(candidate)}\\b`, 'gi');
                            text = text.replace(pat, () => { count++; replacedThisTerm = true; return to; });
                        } else {
                            const pat = new RegExp(toFlexibleSpace(escapeRegex(candidate)), 'gi');
                            text = text.replace(pat, () => { count++; replacedThisTerm = true; return to; });
                        }
                        if (text !== beforeCandidate) break;
                    }
                    if (!replacedThisTerm) {
                        const fallback = new RegExp(escapeRegex(from), 'gi');
                        text = text.replace(fallback, () => { count++; return to; });
                    }
                });
                node.nodeValue = text;
            });

            if (count > 0) {
                this.nodes.htmlInput.value = container.innerHTML;
            }
            return count;
        };

        EmailEditor.escapeHtml = function(s) {
            return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
        };

        window.EmailEditor = EmailEditor;
        EmailEditor.init();
    });

if (typeof window !== 'undefined') {
    window.EmailEditor = window.EmailEditor || {};
}
