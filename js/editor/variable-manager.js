/**
 * TempEd Pro - Variable Manager Subsystem
 * Manages variable rows, attribute safety, and template placeholder replacement.
 */
(function(window) {
    'use strict';

    const VariableManager = {
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
            row.className = 'flex items-center space-x-2 variable-row';
            row.innerHTML = `
                <input type="text" value="${safeName}" placeholder="Variable Name" class="variable-name input-field w-1/3 text-sm">
                <span class="text-slate-400">=</span>
                <input type="text" value="${safeValue}" placeholder="Value" class="variable-value input-field flex-grow text-sm">
                <button class="remove-variable-btn text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full" title="Remove variable">
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

        replaceVariables(template, variables, options = {}) {
            if (!template) return '';
            const wrapPills = options.wrapPills !== false;
            let result = template;

            if (!variables || !(variables instanceof Map)) return result;

            variables.forEach((val, key) => {
                const escapedKey = window.EmailEditorUtils ? window.EmailEditorUtils.escapeRegex(key) : key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g');
                if (wrapPills) {
                    result = result.replace(regex, `<span class="font-semibold text-blue-600" data-variable="${key}" contenteditable="false">${val}</span>`);
                } else {
                    result = result.replace(regex, val);
                }
            });

            return result;
        },

        replaceSubjectVariables(subject, variables) {
            if (!subject) return '';
            if (!variables || !(variables instanceof Map)) return subject;
            let result = subject;

            variables.forEach((val, key) => {
                const escapedKey = window.EmailEditorUtils ? window.EmailEditorUtils.escapeRegex(key) : key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g');
                result = result.replace(regex, val);
            });

            return result;
        },

        extractPlaceholders(html) {
            if (!html) return [];
            const matches = html.match(/{{\s*([\w.-]+)(?:\|[^{}]+)?\s*}}/g) || [];
            const names = new Set();
            matches.forEach(m => {
                const clean = m.replace(/^{{\s*/, '').replace(/\s*}}$/, '').split('|')[0].trim();
                if (clean) names.add(clean);
            });
            return Array.from(names);
        }
    };

    window.VariableManager = VariableManager;
})(typeof window !== 'undefined' ? window : global);
