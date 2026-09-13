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

        resolveTokenValue(key, remainder, variables) {
            const cleanKey = key.trim();
            if (variables && variables.has(cleanKey) && variables.get(cleanKey) !== '') {
                return variables.get(cleanKey);
            }
            if (remainder) {
                const parts = remainder.split('|').map(p => p.trim()).filter(Boolean);
                if (parts.length > 1) {
                    return cleanKey;
                } else if (cleanKey.includes('_') || cleanKey.includes('-') || /^(first|last|full|user|company|client|customer|sender|recipient|contact)/i.test(cleanKey)) {
                    return parts[0];
                } else {
                    return cleanKey;
                }
            }
            if (variables && variables.has(cleanKey)) {
                return variables.get(cleanKey);
            }
            return null;
        },

        replaceVariables(template, variables, options = {}) {
            if (!template) return '';
            const wrapPills = options.wrapPills !== false;
            let result = template;

            const regex = new RegExp(TOKEN_REGEX.source, 'g');
            result = result.replace(regex, (rawToken, key, remainder) => {
                const resolved = this.resolveTokenValue(key, remainder, variables);
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

            // Secondary pass for any remaining custom variables explicitly in the Map
            if (variables && variables instanceof Map) {
                variables.forEach((val, key) => {
                    const escapedKey = window.EmailEditorUtils ? window.EmailEditorUtils.escapeRegex(key) : key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const simpleRegex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g');
                    if (wrapPills) {
                        result = result.replace(simpleRegex, `<span class="font-semibold text-blue-600" data-variable="${key}" data-original-token="{{${key}}}" contenteditable="false">${val}</span>`);
                    } else {
                        result = result.replace(simpleRegex, val);
                    }
                });
            }

            return result;
        },

        replaceSubjectVariables(subject, variables) {
            if (!subject) return '';
            let result = subject;

            const regex = new RegExp(TOKEN_REGEX.source, 'g');
            result = result.replace(regex, (rawToken, key, remainder) => {
                const resolved = this.resolveTokenValue(key, remainder, variables);
                return resolved !== null ? resolved : rawToken;
            });

            if (variables && variables instanceof Map) {
                variables.forEach((val, key) => {
                    const escapedKey = window.EmailEditorUtils ? window.EmailEditorUtils.escapeRegex(key) : key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const simpleRegex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g');
                    result = result.replace(simpleRegex, val);
                });
            }

            return result;
        }
    };

    window.VariableManager = VariableManager;
})(typeof window !== 'undefined' ? window : global);
