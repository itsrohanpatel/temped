/**
 * Shared Utilities for Email Template Editor
 */

// Constants
const CONSTANTS = {
    // Storage keys
    STORAGE_KEYS: {
        GEMINI_API_KEY: 'gemini-api-key',
        SYSTEM_PROMPT: 'system-prompt',
        EMAIL_TEMPLATES: 'emailTemplates',
        EMAIL_EDITOR_DATA: 'emailEditorData',
        CUSTOM_SPAM_WORDS: 'custom-spam-words',
        EMAIL_SIGNATURE: 'email-signature',
        TEMPLATE_TO_LOAD: 'template-to-load',
        INSERT_SIGNATURE_FLAG: 'insert-signature-flag',
        AI_MODEL: 'ai-model-name'
    },
    
    // Timing
    AUTO_SAVE_INTERVAL_MS: 30000, // 30 seconds
    NOTIFICATION_DURATION_MS: 2500,
    COPY_FEEDBACK_DURATION_MS: 2000,
    FOCUS_DELAY_MS: 100,
    BORDER_FLASH_DURATION_MS: 1500,
    DEBOUNCE_DELAY_MS: 300,
    
    // Validation
    MAX_TEMPLATE_NAME_LENGTH: 100,
    MAX_SUBJECT_LINE_LENGTH: 60,
    MIN_SUBJECT_LINE_LENGTH: 5,
    MAX_SUBJECT_LINES: 20,
    
    // AI Model
    DEFAULT_AI_MODEL: 'gemini-2.5-flash-lite',
    
    // Analytics
    SPAM_KEYWORDS_THRESHOLD_HIGH: 2,
    SPAM_KEYWORDS_THRESHOLD_MEDIUM: 0,
    OPTIMAL_EMAIL_WORDS_MIN: 50,
    OPTIMAL_EMAIL_WORDS_MAX: 300
};

// Make constants available globally
window.EMAIL_EDITOR_CONSTANTS = CONSTANTS;

/**
 * Shared utility functions
 */
const EmailEditorUtils = {
    /**
     * Show a notification message
     * @param {string} message - The message to display
     * @param {string} type - Type of notification ('success', 'error', 'warning', 'info')
     * @param {number} duration - Duration in milliseconds
     */
    /**
     * Show a notification message
     * @param {string} message - The message to display
     * @param {string} type - Type of notification ('success', 'error', 'warning', 'info')
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, type = 'success', duration = CONSTANTS.NOTIFICATION_DURATION_MS) {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        const notificationIcon = document.getElementById('notification-icon');
        
        if (!notification) {
            console.warn('Notification element not found');
            return;
        }
        
        // Set icon based on type
        let iconClass = 'fa-check-circle';
        let bgColor = 'var(--color-carrot-orange)';
        
        switch (type) {
            case 'error':
                iconClass = 'fa-exclamation-circle';
                bgColor = 'var(--color-poppy)';
                break;
            case 'warning':
                iconClass = 'fa-exclamation-triangle';
                bgColor = 'var(--color-carrot-orange)';
                break;
            case 'info':
                iconClass = 'fa-info-circle';
                bgColor = 'var(--color-blue-violet)';
                break;
            default:
                bgColor = 'var(--color-blue-violet)';
                break;
        }
        
        if (notificationIcon) {
            notificationIcon.className = `fas ${iconClass}`;
        }

        if (notificationText) {
            notificationText.textContent = message;
        } else {
            notification.textContent = message;
        }
        
        notification.style.backgroundColor = bgColor;
        notification.style.display = 'flex';
        notification.classList.remove('hidden', 'opacity-0', 'translate-x-12');
        notification.classList.add('opacity-100', 'translate-x-0');
        
        // Clear any previous timer if attached
        if (notification._hideTimer) {
            clearTimeout(notification._hideTimer);
        }

        notification._hideTimer = setTimeout(() => {
            notification.classList.remove('opacity-100', 'translate-x-0');
            notification.classList.add('opacity-0', 'translate-x-12');
            setTimeout(() => {
                notification.style.display = 'none';
                notification.classList.add('hidden');
            }, 300);
        }, duration);
    },

    /**
     * Escape regular expression metacharacters
     * @param {string} str - Raw string
     * @returns {string} Escaped string safe for RegExp
     */
    escapeRegex(str) {
        if (!str) return '';
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /**
     * Render template with variables supporting {{name}} and {{name|fallback}}
     * @param {string} template - The template string
     * @param {Map|Object} variableMap - Map or object of variable key-values
     * @returns {string} Interpolated string
     */
    renderVariablesWithFallbacks(template, variableMap) {
        if (!template) return '';
        const getVal = (k) => {
            if (variableMap instanceof Map) return variableMap.get(k);
            if (variableMap && typeof variableMap === 'object') return variableMap[k];
            return undefined;
        };

        // Match {{variable_name}} or {{variable_name|fallback_text}}
        return template.replace(/\{\{([^{}|]+)(?:\|([^{}]+))?\}\}/g, (match, varName, fallback) => {
            const trimmedName = varName.trim();
            const val = getVal(trimmedName);
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                return String(val);
            }
            return fallback !== undefined ? fallback : '';
        });
    },

    /**
     * Extract unique variable names from text, including fallback syntax
     * @param {string} text - Template content
     * @returns {Array<string>} Array of variable names
     */
    findVariablesInText(text) {
        if (!text) return [];
        const matches = text.matchAll(/\{\{([^{}|]+)(?:\|[^{}]+)?\}\}/g);
        const names = new Set();
        for (const m of matches) {
            if (m[1] && m[1].trim()) {
                names.add(m[1].trim());
            }
        }
        return Array.from(names);
    },

    /**
     * Injects a hidden preheader snippet into an HTML email document
     * @param {string} html - Raw email HTML
     * @param {string} preheaderText - Preheader preview text
     * @returns {string} HTML with preheader snippet injected
     */
    injectPreheader(html, preheaderText) {
        if (!html) return '';
        if (!preheaderText || !preheaderText.trim()) return html;
        
        const cleanPreheader = this.escapeHtml(preheaderText.trim());
        const preheaderSnippet = `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${cleanPreheader}&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;</div>`;
        
        const bodyMatch = /<body[^>]*>/i.exec(html);
        if (bodyMatch) {
            const insertIndex = bodyMatch.index + bodyMatch[0].length;
            return html.slice(0, insertIndex) + preheaderSnippet + html.slice(insertIndex);
        }
        return preheaderSnippet + html;
    },

    /**
     * Sets preview viewport width
     * @param {HTMLElement} container - Preview container element
     * @param {'desktop'|'tablet'|'mobile'|string} device - Viewport type
     */
    setPreviewViewport(container, device) {
        if (!container || !container.style) return;
        const widths = {
            desktop: '600px',
            tablet: '768px',
            mobile: '375px'
        };
        const targetWidth = widths[device] || '600px';
        container.style.maxWidth = targetWidth;
        container.style.width = '100%';
        container.style.margin = '0 auto';
        container.style.transition = 'max-width 0.3s ease';
    },

    /**
     * Toggles dark mode simulation on the email preview container
     * @param {HTMLElement} previewElement - Preview container element
     * @returns {boolean} Whether dark mode is now active
     */
    togglePreviewDarkMode(previewElement) {
        if (!previewElement) return false;
        const isDark = previewElement.classList.toggle('preview-dark-mode');
        return isDark;
    },

    /**
     * Auto-discovers all template variables from text and merges with existing vars
     * @param {string} templateText - Template content
     * @param {Object} existingVars - Existing variable key-value object
     * @returns {Object} Updated variable map
     */
    autoDiscoverVariables(templateText, existingVars = {}) {
        if (!templateText) return { ...existingVars };
        const result = { ...existingVars };
        const matches = templateText.matchAll(/\{\{([^{}|]+)(?:\|([^{}]+))?\}\}/g);
        for (const m of matches) {
            const varName = m[1].trim();
            const fallback = m[2] !== undefined ? m[2].trim() : '';
            if (!(varName in result)) {
                result[varName] = fallback;
            }
        }
        return result;
    },
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, (char) => {
            const escapeMap = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return escapeMap[char];
        });
    },
    
    /**
     * Escape string for use in HTML attributes
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeAttr(str) {
        if (!str) return '';
        return String(str).replace(/["'<>&]/g, (char) => {
            const escapeMap = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return escapeMap[char];
        });
    },
    
    /**
     * Debounce function to limit execution rate
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait = CONSTANTS.DEBOUNCE_DELAY_MS) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Validate template name
     * @param {string} name - Template name to validate
     * @returns {object} Validation result with isValid and error properties
     */
    validateTemplateName(name) {
        if (!name || !name.trim()) {
            return { isValid: false, error: 'Template name cannot be empty' };
        }
        
        if (name.length > CONSTANTS.MAX_TEMPLATE_NAME_LENGTH) {
            return { 
                isValid: false, 
                error: `Template name cannot exceed ${CONSTANTS.MAX_TEMPLATE_NAME_LENGTH} characters` 
            };
        }
        
        return { isValid: true, error: null };
    },
    
    /**
     * Validate subject line
     * @param {string} subject - Subject line to validate
     * @returns {object} Validation result with isValid, error, and warnings properties
     */
    validateSubjectLine(subject) {
        const warnings = [];
        
        if (!subject || !subject.trim()) {
            return { 
                isValid: true, 
                error: null, 
                warnings: ['Subject line is empty'] 
            };
        }
        
        if (subject.length > CONSTANTS.MAX_SUBJECT_LINE_LENGTH) {
            warnings.push(`Subject line is ${subject.length} characters (recommended: <${CONSTANTS.MAX_SUBJECT_LINE_LENGTH})`);
        }
        
        if (subject.length < CONSTANTS.MIN_SUBJECT_LINE_LENGTH) {
            warnings.push(`Subject line is too short (${subject.length} characters)`);
        }
        
        return { isValid: true, error: null, warnings };
    },
    
    /**
     * Validate variable name
     * @param {string} name - Variable name to validate
     * @returns {object} Validation result with isValid and error properties
     */
    validateVariableName(name) {
        if (!name || !name.trim()) {
            return { isValid: false, error: 'Variable name cannot be empty' };
        }
        
        // Only allow alphanumeric characters and underscores
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            return { 
                isValid: false, 
                error: 'Variable name can only contain letters, numbers, and underscores' 
            };
        }
        
        // Cannot start with a number
        if (/^\d/.test(name)) {
            return { 
                isValid: false, 
                error: 'Variable name cannot start with a number' 
            };
        }
        
        return { isValid: true, error: null };
    },
    
    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {object} Validation result with isValid and error properties
     */
    validateUrl(url) {
        if (!url || !url.trim()) {
            return { isValid: false, error: 'URL cannot be empty' };
        }
        
        try {
            new URL(url);
            return { isValid: true, error: null };
        } catch (e) {
            return { 
                isValid: false, 
                error: 'Invalid URL format. Please include protocol (http:// or https://)' 
            };
        }
    },
    
    /**
     * Get item from localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if not found or error
     * @returns {any} Stored value or default
     */
    getStorageItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item !== null ? item : defaultValue;
        } catch (error) {
            console.error(`Error reading from localStorage (key: ${key}):`, error);
            return defaultValue;
        }
    },
    
    /**
     * Set item in localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     * @returns {boolean} Success status
     */
    setStorageItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error(`Error writing to localStorage (key: ${key}):`, error);
            this.showNotification('Failed to save data. Storage might be full.', 'error');
            return false;
        }
    },
    
    /**
     * Get JSON from localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if not found or error
     * @returns {any} Parsed JSON or default
     */
    getStorageJSON(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item !== null ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error parsing JSON from localStorage (key: ${key}):`, error);
            return defaultValue;
        }
    },
    
    /**
     * Set JSON in localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} value - Value to store as JSON
     * @returns {boolean} Success status
     */
    setStorageJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error saving JSON to localStorage (key: ${key}):`, error);
            this.showNotification('Failed to save data. Storage might be full.', 'error');
            return false;
        }
    }
};

// Make utilities available globally
window.EmailEditorUtils = EmailEditorUtils;