/**
 * TempEd Pro - Variable Manager Subsystem
 * Manages variable rows, attribute safety, and template placeholder replacement.
 */
(function(window) {
    'use strict';

    const TOKEN_REGEX = /{{\s*([\w.-]+)(?:\s*\|\s*([^{}]+?))?\s*}}/g;

    const VariableManager = {
        TOKEN_REGEX,

        getVariables(containerEl) {
            const variables = new Map();
            if (!containerEl) return variables;
            containerEl.querySelectorAll('.variable-row').forEach(row => {
                const nameInput = row.querySelector('.variable-name');
                const valueInput = row.querySelector('.variable-value');
                if (nameInput && valueInput) {
                    const name = nameInput.value.trim();
                    const value = valueInput.value;
                    if (name) variables.set(name, value);
                }
            });
            return variables;
        },

        addVariableRow(containerEl, name = '', value = '', onUpdate = null) {
            if (!containerEl) return null;
            const safeName = window.EmailEditorUtils ? window.EmailEditorUtils.escapeAttr(name) : String(name).replace(/"/g, '&quot;');
            const safeValue = window.EmailEditorUtils ? window.EmailEditorUtils.escapeAttr(value) : String(value).replace(/"/g, '&quot;');
            const row = document.createElement('div');
            row.className = 'flex items-center space-x-1.5 variable-row';
            row.innerHTML = `
                <input type="text" value="${safeName}" placeholder="Variable" title="${safeName}" class="variable-name input-field flex-1 min-w-0 text-xs sm:text-sm font-medium font-mono text-slate-800">
                <span class="text-slate-400 text-xs font-semibold px-0.5">=</span>
                <input type="text" value="${safeValue}" placeholder="Value" title="${safeValue || 'Value'}" class="variable-value input-field flex-1 min-w-0 text-xs sm:text-sm">
                <button class="remove-variable-btn text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full flex-shrink-0" title="Remove variable">
                    <i class="fas fa-trash-alt fa-sm"></i>
                </button>
            `;
            containerEl.appendChild(row);

            const updateHandler = () => {
                if (typeof onUpdate === 'function') {
                    onUpdate();
                }
            };

            row.querySelector('.variable-name').addEventListener('input', updateHandler);
            row.querySelector('.variable-value').addEventListener('input', updateHandler);
            row.querySelector('.remove-variable-btn').addEventListener('click', () => {
                row.remove();
                updateHandler();
            });

            return row;
        },

        /**
         * Parses a bulk string of variables (comma-separated, newline-separated, or name=value pairs)
         * @param {string} rawText
         * @returns {Array<{ name: string, value: string }>}
         */
        parseBulkVariables(rawText) {
            if (!rawText || typeof rawText !== 'string') return [];
            const results = [];
            const seen = new Set();

            const lines = rawText.split(/[\r\n;]+/);

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

                // Split line by commas if not inside quotes or assignment
                const segments = (line.includes(',') && !line.includes('="') && !line.includes("='"))
                    ? line.split(',')
                    : [line];

                for (let seg of segments) {
                    seg = seg.trim();
                    if (!seg) continue;

                    // Strip outer {{ and }} if present
                    seg = seg.replace(/^{{\s*|\s*}}$/g, '').trim();

                    let name = '';
                    let value = '';

                    const eqIdx = seg.indexOf('=');
                    const colonIdx = seg.indexOf(':');

                    if (eqIdx !== -1 && (colonIdx === -1 || eqIdx < colonIdx)) {
                        name = seg.slice(0, eqIdx).trim();
                        value = seg.slice(eqIdx + 1).trim();
                    } else if (colonIdx !== -1) {
                        name = seg.slice(0, colonIdx).trim();
                        value = seg.slice(colonIdx + 1).trim();
                    } else {
                        if (seg.includes('|')) {
                            const parts = seg.split('|');
                            name = parts[0].trim();
                            value = parts.slice(1).join('|').trim();
                        } else {
                            name = seg.trim();
                            value = '';
                        }
                    }

                    // Sanitize variable name
                    name = name.replace(/[^a-zA-Z0-9_.-]/g, '').trim();
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }

                    if (name && !seen.has(name)) {
                        seen.add(name);
                        results.push({ name, value });
                    }
                }
            }

            return results;
        },

        /**
         * Bulk adds variables to container element
         * @param {HTMLElement} containerEl
         * @param {string} rawText
         * @param {function} onUpdate
         * @returns {{ added: number, updated: number, total: number }}
         */
        bulkAddVariables(containerEl, rawText, onUpdate = null) {
            if (!containerEl) return { added: 0, updated: 0, total: 0 };
            const parsed = this.parseBulkVariables(rawText);
            if (!parsed || parsed.length === 0) return { added: 0, updated: 0, total: 0 };

            const existing = this.getVariables(containerEl);
            let added = 0;
            let updated = 0;

            parsed.forEach(item => {
                if (!existing.has(item.name)) {
                    this.addVariableRow(containerEl, item.name, item.value, onUpdate);
                    existing.set(item.name, item.value);
                    added++;
                } else if (item.value && !existing.get(item.name)) {
                    containerEl.querySelectorAll('.variable-row').forEach(row => {
                        const nameInput = row.querySelector('.variable-name');
                        const valInput = row.querySelector('.variable-value');
                        if (nameInput && valInput && nameInput.value.trim() === item.name && !valInput.value) {
                            valInput.value = item.value;
                            updated++;
                        }
                    });
                    existing.set(item.name, item.value);
                }
            });

            if (typeof onUpdate === 'function') {
                onUpdate();
            }

            return { added, updated, total: parsed.length };
        },

        /**
         * Filters variable suggestions matching a query for slash command or autocomplete
         */
        filterVariableMatches(query = '', currentVariables = new Map()) {
            const cleanQuery = (query || '').toLowerCase().trim();

            const STANDARD_VARS = [
                { name: 'first_name', defaultValue: 'Alex', desc: 'Recipient First Name' },
                { name: 'last_name', defaultValue: 'Taylor', desc: 'Recipient Last Name' },
                { name: 'full_name', defaultValue: 'Alex Taylor', desc: 'Recipient Full Name' },
                { name: 'company_name', defaultValue: 'Acme Corp', desc: 'Target Organization' },
                { name: 'company', defaultValue: 'Acme Corp', desc: 'Organization shorthand' },
                { name: 'job_title', defaultValue: 'Product Lead', desc: 'Recipient Role / Title' },
                { name: 'sender-name', defaultValue: 'Rohan Patel', desc: 'Sender Full Name' },
                { name: 'sender_email', defaultValue: 'rohan@example.com', desc: 'Sender Email Address' },
                { name: 'recipient_email', defaultValue: 'alex@example.com', desc: 'Recipient Email' },
                { name: 'Date', defaultValue: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), desc: 'Current Date' },
                { name: 'meeting_link', defaultValue: 'https://cal.com/meeting', desc: 'Calendar Meeting Link' },
                { name: 'unsubscribe_url', defaultValue: 'https://example.com/unsubscribe', desc: 'One-click Unsubscribe Link' },
                { name: 'view_in_browser', defaultValue: 'https://example.com/view', desc: 'Web Browser View Link' }
            ];

            const SPINTAX_SNIPPETS = [
                { token: '{Hi|Hey|Hello}', name: 'Greeting Spintax', desc: 'Randomized opening greeting', isSnippet: true },
                { token: '{Best regards|Warm regards|Sincerely}', name: 'Signoff Spintax', desc: 'Randomized closing signoff', isSnippet: true },
                { token: '{quick question|brief follow-up|quick inquiry}', name: 'Subject Hook Spintax', desc: 'Subject line hook', isSnippet: true }
            ];

            const results = [];
            const seen = new Set();

            if (currentVariables && typeof currentVariables.forEach === 'function') {
                currentVariables.forEach((value, name) => {
                    if (!name) return;
                    if (!cleanQuery || name.toLowerCase().includes(cleanQuery) || (value && value.toLowerCase().includes(cleanQuery))) {
                        seen.add(name.toLowerCase());
                        results.push({
                            name,
                            token: `{{${name}}}`,
                            sampleValue: value || 'Empty value',
                            description: 'Active Template Variable',
                            type: 'active'
                        });
                    }
                });
            }

            STANDARD_VARS.forEach(v => {
                if (!seen.has(v.name.toLowerCase())) {
                    if (!cleanQuery || v.name.toLowerCase().includes(cleanQuery) || v.desc.toLowerCase().includes(cleanQuery)) {
                        seen.add(v.name.toLowerCase());
                        results.push({
                            name: v.name,
                            token: `{{${v.name}}}`,
                            sampleValue: v.defaultValue,
                            description: v.desc,
                            type: 'standard'
                        });
                    }
                }
            });

            if (!cleanQuery || cleanQuery.startsWith('spin') || cleanQuery.startsWith('{') || 'greeting signoff hello hi'.includes(cleanQuery)) {
                SPINTAX_SNIPPETS.forEach(s => {
                    if (!cleanQuery || s.name.toLowerCase().includes(cleanQuery) || s.token.toLowerCase().includes(cleanQuery) || s.desc.toLowerCase().includes(cleanQuery)) {
                        results.push({
                            name: s.name,
                            token: s.token,
                            sampleValue: s.token,
                            description: s.desc,
                            type: 'spintax'
                        });
                    }
                });
            }

            return results;
        },

        extractVariableDefinitions(text) {
            if (!text || typeof text !== 'string') return [];
            const regex = new RegExp(TOKEN_REGEX.source, 'g');
            const map = new Map();
            let match;

            while ((match = regex.exec(text)) !== null) {
                const token = match[0];
                const key = match[1].trim();
                const remainder = match[2] ? match[2].trim() : '';

                if (!map.has(key)) {
                    let defaultValue = '';
                    let options = [];

                    if (remainder) {
                        const parts = remainder.split('|').map(p => p.trim()).filter(Boolean);
                        if (parts.length > 1) {
                            defaultValue = key;
                            options = [key, ...parts];
                        } else if (key.includes('_') || key.includes('-') || /^(first|last|full|user|company|client|customer|sender|recipient|contact)/i.test(key)) {
                            defaultValue = parts[0];
                            options = [parts[0]];
                        } else {
                            defaultValue = key;
                            options = [key, parts[0]];
                        }
                    }

                    map.set(key, {
                        token,
                        name: key,
                        defaultValue,
                        options
                    });
                }
            }

            return Array.from(map.values());
        },

        extractPlaceholders(html) {
            if (!html) return [];
            const defs = this.extractVariableDefinitions(html);
            return defs.map(d => d.name);
        },

        /**
         * Resolves standard single-brace {opt1|opt2|opt3} spintax (including nested)
         * @param {string} text 
         * @param {function} randomFn 
         * @returns {string}
         */
        spinSingleBrace(text, randomFn = Math.random) {
            if (!text || typeof text !== 'string') return '';
            let spun = text;
            const singleBraceRegex = /\{([^{}]+)\}/g;
            let iterations = 0;
            // Loop to handle nested single-brace spintax like {Hello|Good {morning|afternoon}}
            while (singleBraceRegex.test(spun) && iterations < 10) {
                spun = spun.replace(singleBraceRegex, (match, choices) => {
                    if (!choices.includes('|')) return match;
                    const parts = choices.split('|');
                    const chosen = parts[Math.floor(randomFn() * parts.length)];
                    return chosen;
                });
                iterations++;
            }
            return spun;
        },

        /**
         * Counts the total number of combination variations in text
         * @param {string} text 
         * @returns {number}
         */
        countSpintaxVariations(text) {
            if (!text || typeof text !== 'string') return 1;
            let total = 1;

            // 1. Double brace {{a|b|c}} first
            const doubleBraces = text.match(TOKEN_REGEX) || [];
            doubleBraces.forEach(db => {
                const inner = db.replace(/^{{\s*|\s*}}$/g, '');
                if (inner.includes('|')) {
                    const parts = inner.split('|').map(p => p.trim()).filter(Boolean);
                    if (parts.length > 1) {
                        const first = parts[0];
                        if (!/^(first|last|full|user|company|client|customer|sender|recipient|contact|[a-zA-Z0-9]+_[a-zA-Z0-9]+)/i.test(first) || parts.length > 2) {
                            total *= parts.length;
                        }
                    }
                }
            });

            // Strip out double braces before matching single braces to avoid double-counting
            const strippedText = text.replace(TOKEN_REGEX, '');

            // 2. Single brace {a|b|c}
            const singleBraces = strippedText.match(/\{([^{}]+)\}/g) || [];
            singleBraces.forEach(sb => {
                const inner = sb.slice(1, -1);
                if (inner.includes('|')) {
                    const count = inner.split('|').length;
                    if (count > 1) total *= count;
                }
            });

            return total;
        },

        /**
         * Resolves a token value with support for randomized spintax selection
         */
        resolveTokenValue(key, remainder, variables, options = {}) {
            const cleanKey = key.trim();
            const randomize = !!options.randomizeSpintax;
            const randomFn = typeof options.randomFn === 'function' ? options.randomFn : Math.random;

            // If an explicit variable is set by user in the variables panel
            if (variables && variables.has(cleanKey) && variables.get(cleanKey) !== '') {
                return variables.get(cleanKey);
            }

            if (remainder) {
                const parts = remainder.split('|').map(p => p.trim()).filter(Boolean);
                if (parts.length > 1) {
                    // Full spintax pattern e.g. {{Hi|Hey|Hello}} or {{Thanks|Regards|Best}}
                    const allChoices = [cleanKey, ...parts];
                    if (randomize) {
                        return allChoices[Math.floor(randomFn() * allChoices.length)];
                    }
                    return cleanKey;
                } else if (cleanKey.includes('_') || cleanKey.includes('-') || /^(first|last|full|user|company|client|customer|sender|recipient|contact)/i.test(cleanKey)) {
                    // Variable with fallback default e.g. {{first_name|there}}
                    return parts[0];
                } else {
                    if (randomize) {
                        const choices = [cleanKey, parts[0]];
                        return choices[Math.floor(randomFn() * choices.length)];
                    }
                    return cleanKey;
                }
            }

            if (variables && variables.has(cleanKey)) {
                return variables.get(cleanKey);
            }
            return null;
        },

        /**
         * Complete spintax resolution for email body and subject
         */
        spinText(text, options = {}) {
            if (!text) return '';
            const randomFn = typeof options.randomFn === 'function' ? options.randomFn : Math.random;
            let result = this.spinSingleBrace(text, randomFn);
            return result;
        },

        replaceVariables(template, variables, options = {}) {
            if (!template) return '';
            const wrapPills = options.wrapPills !== false;
            const randomizeSpintax = !!options.randomizeSpintax;
            const randomFn = typeof options.randomFn === 'function' ? options.randomFn : Math.random;
            let result = template;

            // 1. Resolve {{variables}} and {{spintax|choices}} first so curly braces aren't corrupted
            const regex = new RegExp(TOKEN_REGEX.source, 'g');
            result = result.replace(regex, (rawToken, key, remainder) => {
                const resolved = this.resolveTokenValue(key, remainder, variables, { randomizeSpintax, randomFn });
                if (resolved === null) {
                    return rawToken;
                }

                if (wrapPills) {
                    const safeToken = window.EmailEditorUtils ? window.EmailEditorUtils.escapeAttr(rawToken) : rawToken.replace(/"/g, '&quot;');
                    const safeKey = window.EmailEditorUtils ? window.EmailEditorUtils.escapeAttr(key) : key.replace(/"/g, '&quot;');
                    const displayVal = resolved !== '' ? resolved : `{{${key}}}`;
                    return `<span class="font-semibold text-blue-600" data-variable="${safeKey}" data-original-token="${safeToken}" contenteditable="false">${displayVal}</span>`;
                }
                return resolved;
            });

            // 2. Resolve standard single-brace {A|B} spintax if randomize is enabled
            if (randomizeSpintax) {
                result = this.spinSingleBrace(result, randomFn);
            }

            return result;
        },

        replaceSubjectVariables(subject, variables, options = {}) {
            if (!subject) return '';
            const randomizeSpintax = !!options.randomizeSpintax;
            const randomFn = typeof options.randomFn === 'function' ? options.randomFn : Math.random;
            let result = subject;

            // 1. Resolve {{variables}} and {{spintax}} first
            const regex = new RegExp(TOKEN_REGEX.source, 'g');
            result = result.replace(regex, (rawToken, key, remainder) => {
                const resolved = this.resolveTokenValue(key, remainder, variables, { randomizeSpintax, randomFn });
                return resolved !== null ? resolved : rawToken;
            });

            // 2. Resolve single-brace {A|B} spintax
            if (randomizeSpintax) {
                result = this.spinSingleBrace(result, randomFn);
            }

            return result;
        }
    };

    window.VariableManager = VariableManager;
})(typeof window !== 'undefined' ? window : global);
