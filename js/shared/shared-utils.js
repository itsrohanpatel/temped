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
     * Sanitize HTML to prevent XSS attacks while preserving email layouts
     * @param {string} html - Raw HTML
     * @returns {string} Sanitized HTML
     */
    sanitizeHtml(html) {
        if (!html) return '';
        if (typeof window !== 'undefined' && window.DOMPurify) {
            return window.DOMPurify.sanitize(html, {
                ADD_TAGS: ['style', 'font', 'center'],
                ADD_ATTR: ['target', 'style', 'data-variable', 'data-original-token', 'contenteditable', 'data-id', 'data-action', 'role', 'color']
            });
        }
        // Fallback sanitizer if DOMPurify is not available
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
            .replace(/on\w+\s*=\s*'[^']*'/gi, '')
            .replace(/javascript:[^"']*/gi, '');
    },

    /**
     * Cleans rich-text HTML copied from web apps (Gemini, ChatGPT, Angular, MS Word)
     * Strips proprietary custom tags, angular directives, dark-theme web styles, and redundant spans.
     * @param {string} html - Raw copied HTML
     * @returns {string} Clean, email-safe HTML
     */
    cleanPastedHtml(html) {
        if (!html) return '';
        let clean = html;

        // 1. Strip spreadsheet / CSV / code outer quotes ("..." or '...' or \"...\")
        let prevClean;
        do {
            prevClean = clean;
            clean = clean.trim();
            if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
                clean = clean.slice(1, -1).trim();
            } else if ((clean.startsWith('\\"') && clean.endsWith('\\"')) || (clean.startsWith("\\'") && clean.endsWith("\\'"))) {
                clean = clean.slice(2, -2).trim();
            }
        } while (clean !== prevClean);

        // Strip stray leading/trailing quotes directly flanking HTML tags (e.g. "<p> or </p>")
        clean = clean.replace(/^["'](\s*<)/, '$1');
        clean = clean.replace(/(>\s*)["']$/, '$1');

        // 2. Fix doubled or escaped quotes in HTML attributes (from CSV/Spreadsheet escaping e.g. style=""..."" or style=\"...\")
        clean = clean.replace(/([a-zA-Z0-9_-]+)=["']{2,}([^"'\r\n>]*)["']{2,}/gi, '$1="$2"');
        clean = clean.replace(/([a-zA-Z0-9_-]+)=\\"([^"\r\n>]*)\\"/gi, '$1="$2"');

        // 3. Unwrap custom web components / markdown nodes (e.g., Gemini's <ms-cmark-node>)
        clean = clean.replace(/<\/?(?:ms-cmark-node|ng-container|c-wiz)[^>]*>/gi, '');

        // 4. Convert bold/semibold spans to semantic <strong> before stripping classes/spans
        clean = clean.replace(/<span\b[^>]*\bclass="[^"]*\b(?:font-(?:semibold|bold))\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '<strong>$1</strong>');
        clean = clean.replace(/<span\b[^>]*\bstyle="[^"]*font-weight:\s*(?:600|700|bold)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '<strong>$1</strong>');

        // 5. Strip all CSS custom properties (--tw-*, --color-*, etc.) and property usages (var(--*))
        clean = clean.replace(/--[a-zA-Z0-9_-]+:\s*[^;"]*;?/gi, '');
        clean = clean.replace(/[-a-zA-Z0-9]+:\s*var\(--[^)]+\);?/gi, '');

        // 6. Remove Angular & web framework component attributes & classes
        clean = clean.replace(/\s+_ngcontent-[a-zA-Z0-9_-]+(?:="[^"]*")?/gi, '');
        clean = clean.replace(/\s+_nghost-[a-zA-Z0-9_-]+(?:="[^"]*")?/gi, '');
        clean = clean.replace(/\s+class="[^"]*ng-star-inserted[^"]*"/gi, '');

        // 7. Strip Tailwind utility classes from class attributes
        clean = clean.replace(/\s+class="([^"]*)"/gi, (match, classList) => {
            const classes = classList.split(/\s+/).filter(Boolean);
            const nonTailwind = classes.filter(c => !/^(?:[mpt][trblxy]?-[0-9.]+|text-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-[0-9]+)?|leading-(?:none|tight|snug|normal|relaxed|loose)|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|space-[xy](?:-reverse)?(?:-[0-9.]+)?|list-(?:none|disc|decimal)|items-[a-z]+|justify-[a-z]+|flex|grid|gap-[0-9.]+|rounded(?:-[a-z0-9]+)?|shadow(?:-[a-z0-9]+)?|border(?:-[a-z0-9]+)?|w-[a-z0-9]+|max-w-[a-z0-9]+|min-w-[a-z0-9]+)$/.test(c));
            return nonTailwind.length > 0 ? ` class="${nonTailwind.join(' ')}"` : '';
        });

        // 8. Strip web dark-mode backgrounds, web text colors, and tap highlight artifacts
        clean = clean.replace(/background-color:\s*(?:rgb|rgba|hsl|hsla)\([^)]+\);?/gi, '');
        clean = clean.replace(/background-color:\s*#(?:1[0-9a-f]{5}|2[0-9a-f]{5}|3[0-9a-f]{5}|0[0-9a-f]{5}|1[0-9a-f]{2}|2[0-9a-f]{2}|3[0-9a-f]{2}|000);?/gi, '');
        clean = clean.replace(/color:\s*(?:rgb|rgba)\(\s*(?:2[0-5][0-9]|19[0-9]|255)\s*,\s*(?:2[0-5][0-9]|19[0-9]|255)\s*,\s*(?:2[0-5][0-9]|19[0-9]|255)[^)]*\);?/gi, '');
        clean = clean.replace(/-webkit-tap-highlight-color:\s*[^;"]+;?/gi, '');
        clean = clean.replace(/font-optical-sizing:\s*[^;"]+;?/gi, '');
        clean = clean.replace(/display:\s*contents;?/gi, '');

        // 9. Clean style attributes (remove empty or pure whitespace/semicolons)
        clean = clean.replace(/\s+style="([^"]*)"/gi, (match, styles) => {
            const cleanedStyles = styles
                .split(';')
                .map(s => s.trim())
                .filter(s => s && !s.startsWith('--'))
                .join('; ');
            return cleanedStyles ? ` style="${cleanedStyles};"` : '';
        });

        // 10. Clean leftover empty style and class attributes
        clean = clean.replace(/\s+style="\s*"/gi, '');
        clean = clean.replace(/\s+class="\s*"/gi, '');

        // 11. Unwrap redundant spans that have empty style or no attributes
        for (let i = 0; i < 5; i++) {
            clean = clean.replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1');
            clean = clean.replace(/<span\s+style="\s*"\s*>([\s\S]*?)<\/span>/gi, '$1');
            clean = clean.replace(/<span\s+class="\s*"\s*>([\s\S]*?)<\/span>/gi, '$1');
            clean = clean.replace(/<span\b[^>]*>\s*<\/span>/gi, '');
        }

        // 12. Simplify list item nested paragraphs (e.g. <li><p>Text</p></li> -> <li>Text</li>)
        clean = clean.replace(/<li\b[^>]*>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*<\/li>/gi, '<li>$1</li>');

        // 13. Clean any newly exposed empty style or class attributes
        clean = clean.replace(/\s+style="\s*"/gi, '');
        clean = clean.replace(/\s+class="\s*"/gi, '');

        return clean.trim();
    },

    /**
     * Builds regex matching whole words with safe escaping
     * @param {string} word - Keyword
     * @returns {RegExp|null}
     */
    buildWordRegex(word) {
        if (!word) return null;
        const trimmed = word.trim();
        const escaped = this.escapeRegex(trimmed);
        const startsWithWord = /^\w/.test(trimmed);
        const endsWithWord = /\w$/.test(trimmed);
        const prefix = startsWithWord ? '\\b' : '(?<!\\w)';
        const suffix = endsWithWord ? '\\b' : '(?!\\w)';
        return new RegExp(prefix + escaped + suffix, 'gi');
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

/**
 * Pre-Flight Deliverability and Compliance Inspector
 */
const PreFlightInspector = {
    checkHtmlSize(html) {
        if (!html) return { bytes: 0, sizeKb: 0, formattedSize: '0KB', status: 'pass', message: 'Empty email' };
        // Use Blob or Buffer byte length calculation
        let bytes = 0;
        if (typeof Blob !== 'undefined') {
            bytes = new Blob([html]).size;
        } else if (typeof Buffer !== 'undefined') {
            bytes = Buffer.byteLength(html, 'utf8');
        } else {
            bytes = unescape(encodeURIComponent(html)).length;
        }
        const sizeKb = Math.round((bytes / 1024) * 10) / 10;
        const formattedSize = `${sizeKb}KB`;
        if (sizeKb > 102) {
            return {
                bytes,
                sizeKb,
                formattedSize,
                status: 'fail',
                message: `Email size is ${sizeKb}KB (>102KB). Gmail will clip this email with "[Message clipped] View entire message".`
            };
        }
        if (sizeKb >= 95) {
            return {
                bytes,
                sizeKb,
                formattedSize,
                status: 'warn',
                message: `Email size is ${sizeKb}KB. Approaching the 102KB Gmail clipping threshold.`
            };
        }
        return {
            bytes,
            sizeKb,
            formattedSize,
            status: 'pass',
            message: `Safe email size: ${sizeKb}KB (well below 102KB Gmail clipping limit).`
        };
    },

    checkCompliance(html) {
        if (!html) return { hasUnsubscribe: false, hasPhysicalAddress: false, status: 'fail', message: 'No content' };
        const unsubRegex = /(unsubscribe|opt[\s-]out|manage[\s-]+preferences|\{\{\s*unsubscribe_url(?:\|[^{}]+)?\s*\}\})/i;
        const addressRegex = /(\d{1,5}\s+[\w\s.,#-]+(?:street|st|avenue|ave|road|rd|blvd|way|suite|ste|drive|dr|lane|ln|box|p\.?o\.?\s*box|terrace)\b|\{\{\s*company_address(?:\|[^{}]+)?\s*\}\}|\b\d{5}(?:-\d{4})?\b)/i;
        
        const hasUnsubscribe = unsubRegex.test(html);
        const hasPhysicalAddress = addressRegex.test(html);

        if (!hasUnsubscribe) {
            return {
                hasUnsubscribe,
                hasPhysicalAddress,
                status: 'fail',
                message: 'Missing unsubscribe mechanism. Required by CAN-SPAM, GDPR, and mailbox providers.'
            };
        }
        if (!hasPhysicalAddress) {
            return {
                hasUnsubscribe,
                hasPhysicalAddress,
                status: 'warn',
                message: 'Missing physical mailing address. CAN-SPAM requires a valid postal address in the footer.'
            };
        }
        return {
            hasUnsubscribe,
            hasPhysicalAddress,
            status: 'pass',
            message: 'Meets CAN-SPAM and GDPR requirements (Unsubscribe link and physical address detected).'
        };
    },

    checkImageAltAttributes(html) {
        if (!html) return { totalImages: 0, missingAltCount: 0, culprits: [], status: 'pass' };
        const imgRegex = /<img\b([^>]*?)>/gi;
        let match;
        let totalImages = 0;
        let missingAltCount = 0;
        const culprits = [];

        while ((match = imgRegex.exec(html)) !== null) {
            totalImages++;
            const attrs = match[1];
            const altMatch = /alt\s*=\s*(["'])(.*?)\1/i.exec(attrs);
            if (!altMatch || !altMatch[2].trim()) {
                missingAltCount++;
                const srcMatch = /src\s*=\s*(["'])(.*?)\1/i.exec(attrs);
                culprits.push(srcMatch ? srcMatch[2] : 'unknown-src');
            }
        }

        if (missingAltCount > 0) {
            return {
                totalImages,
                missingAltCount,
                culprits,
                status: 'warn',
                message: `${missingAltCount} of ${totalImages} image(s) missing alt text. Images without alt text harm deliverability and accessibility.`
            };
        }
        return {
            totalImages,
            missingAltCount,
            culprits,
            status: 'pass',
            message: totalImages === 0 ? 'No images to validate.' : `All ${totalImages} image(s) have descriptive alt attributes.`
        };
    },

    checkLinks(html) {
        if (!html) return { totalLinks: 0, insecureCount: 0, placeholderCount: 0, status: 'pass' };
        const linkRegex = /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*?>/gi;
        let match;
        let totalLinks = 0;
        let insecureCount = 0;
        let placeholderCount = 0;

        while ((match = linkRegex.exec(html)) !== null) {
            totalLinks++;
            const href = match[2].trim();
            if (/^http:\/\//i.test(href)) {
                insecureCount++;
            }
            if (href === '#' || href === '' || href === 'javascript:void(0)') {
                placeholderCount++;
            }
        }

        if (insecureCount > 0 || placeholderCount > 0) {
            const issues = [];
            if (insecureCount > 0) issues.push(`${insecureCount} insecure HTTP link(s)`);
            if (placeholderCount > 0) issues.push(`${placeholderCount} placeholder href="#" link(s)`);
            return {
                totalLinks,
                insecureCount,
                placeholderCount,
                status: 'warn',
                message: `Found ${issues.join(' and ')}. Mailbox filters heavily penalize insecure or unlinked anchors.`
            };
        }
        return {
            totalLinks,
            insecureCount,
            placeholderCount,
            status: 'pass',
            message: totalLinks === 0 ? 'No links found.' : `All ${totalLinks} link(s) are secure and configured.`
        };
    },

    checkTextToHtmlRatio(html) {
        if (!html) return { ratio: 0, status: 'pass', message: 'No content' };
        const textOnly = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                             .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                             .replace(/<[^>]+>/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim();
        const textLen = textOnly.length;
        const htmlLen = html.length;
        const ratio = htmlLen > 0 ? Math.round((textLen / htmlLen) * 100) : 0;
        if (htmlLen > 1000 && ratio < 15) {
            return {
                ratio,
                status: 'warn',
                message: `Low text-to-code ratio (${ratio}%). Image-only or markup-heavy emails are often flagged by spam filters.`
            };
        }
        return {
            ratio,
            status: 'pass',
            message: `Balanced text-to-code ratio (${ratio}%).`
        };
    },

    runAllChecks(arg1 = '', arg2 = '', arg3 = '') {
        let subject = '';
        let preheader = '';
        let html = '';
        if (typeof arg2 === 'object' && arg2 !== null) {
            html = arg1 || '';
            subject = arg2.subject || '';
            preheader = arg2.preheader || '';
        } else {
            subject = arg1 || '';
            preheader = arg2 || '';
            html = arg3 || '';
        }

        const sizeCheck = this.checkHtmlSize(html);
        const complianceCheck = this.checkCompliance(html);
        const altCheck = this.checkImageAltAttributes(html);
        const linksCheck = this.checkLinks(html);
        const ratioCheck = this.checkTextToHtmlRatio(html);

        // Subject check
        let subjectStatus = 'pass';
        let subjectMsg = 'Subject line length is optimal.';
        const trimmedSub = (subject || '').trim();
        if (!trimmedSub) {
            subjectStatus = 'fail';
            subjectMsg = 'Subject line is empty.';
        } else if (trimmedSub.length < 10) {
            subjectStatus = 'warn';
            subjectMsg = `Subject line is short (${trimmedSub.length} chars). Consider 30-50 characters.`;
        } else if (trimmedSub.length > 60) {
            subjectStatus = 'warn';
            subjectMsg = `Subject line is long (${trimmedSub.length} chars). Mobile clients may truncate after 40-50 chars.`;
        }

        // Preheader check
        let preheaderStatus = 'pass';
        let preheaderMsg = 'Preheader text configured.';
        if (!preheader || !preheader.trim()) {
            preheaderStatus = 'warn';
            preheaderMsg = 'No preheader text set. Inbox clients will display raw HTML or random header snippets.';
        }

        const checksList = [
            { id: 'size', name: 'Gmail 102KB Cutoff', ...sizeCheck },
            { id: 'subject', name: 'Subject Line Health', status: subjectStatus, message: subjectMsg },
            { id: 'preheader', name: 'Preheader Preview Text', status: preheaderStatus, message: preheaderMsg },
            { id: 'altText', name: 'Image Accessibility & Alt Text', ...altCheck },
            { id: 'links', name: 'Secure Links & Anchors', ...linksCheck },
            { id: 'ratio', name: 'Text-to-HTML Balance', ...ratioCheck }
        ];

        // Attach property getters to allow checks.size and checks.filter
        checksList.size = sizeCheck;
        checksList.altText = altCheck;
        checksList.links = linksCheck;
        checksList.ratio = ratioCheck;

        const passedChecks = checksList.filter(c => c.status === 'pass').length;
        const failedChecks = checksList.filter(c => c.status === 'fail').length;
        const warnChecks = checksList.filter(c => c.status === 'warn').length;

        const verdict = failedChecks > 0 ? 'needs_attention' : warnChecks > 0 ? 'good' : 'ready';
        const overallStatus = verdict === 'ready' ? 'ready' : (verdict === 'good' ? 'warning' : 'fail');

        return {
            verdict,
            overallStatus,
            totalCount: checksList.length,
            totalChecks: checksList.length,
            passedCount: passedChecks,
            passedChecks,
            failedChecks,
            warnChecks,
            checks: checksList
        };
    }
};

/**
 * Bulletproof Email Component Snippets (Outlook MSO compatible)
 */
const EmailComponentSnippets = {
    getBulletproofButton(text = 'Call to Action', url = 'https://example.com', bgColor = '#4f46e5', textColor = '#ffffff') {
        return `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="${bgColor}">
<w:anchorlock/>
<center style="color:${textColor};font-family:sans-serif;font-size:15px;font-weight:bold;">${text}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
  <tr>
    <td align="center" bgcolor="${bgColor}" style="border-radius: 8px;">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: ${textColor}; text-decoration: none; border-radius: 8px; line-height: 1.2;">${text}</a>
    </td>
  </tr>
</table>
<!--<![endif]-->`;
    },

    getTwoColumnGrid(leftHtml = '<p>Left column content</p>', rightHtml = '<p>Right column content</p>') {
        return `<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 20px 0;">
  <tr>
    <td align="center" style="padding: 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
        <tr>
          <td valign="top" style="width: 50%; padding: 10px;" class="stack-column">
            ${leftHtml}
          </td>
          <td valign="top" style="width: 50%; padding: 10px;" class="stack-column">
            ${rightHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
    },

    getDivider(color = '#e2e8f0', padding = '24px 0') {
        return `<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="padding: ${padding};">
  <tr>
    <td style="border-top: 1px solid ${color}; font-size: 1px; line-height: 1px;">
      <hr style="border:none; border-top: 1px solid ${color}; margin: 0; padding: 0;" />
    </td>
  </tr>
</table>`;
    },

    getUnsubscribeFooter(companyName = 'Acme Inc.', address = '100 Innovation Way, Suite 200, San Francisco, CA 94107') {
        return `<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top: 32px; padding: 24px 16px; border-top: 1px solid #e2e8f0;">
  <tr>
    <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 18px; color: #64748b;">
      <p style="margin: 0 0 8px 0;">You received this email because you are subscribed to updates from <strong>${companyName}</strong>.</p>
      <p style="margin: 0 0 12px 0;">${address}</p>
      <p style="margin: 0;">
        <a href="{{unsubscribe_url|https://example.com/unsubscribe}}" style="color: #4f46e5; text-decoration: underline;">Unsubscribe</a> &nbsp;&bull;&nbsp;
        <a href="{{preferences_url|https://example.com/preferences}}" style="color: #4f46e5; text-decoration: underline;">Manage Preferences</a>
      </p>
    </td>
  </tr>
</table>`;
    },

    get bulletproofButton() { return this.getBulletproofButton(); },
    get twoColumnGrid() { return this.getTwoColumnGrid(); },
    get divider() { return this.getDivider(); },
    get complianceFooter() { return this.getUnsubscribeFooter(); }
};

/**
 * Production Export and MIME Formatting Suite
 */
const EmailExportTools = {
    generatePlainText(html) {
        if (!html) return '';
        let text = html;
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*?>([\s\S]*?)<\/a>/gi, (match, q, href, anchorText) => {
            const cleanText = anchorText.replace(/<[^>]+>/g, '').trim();
            return cleanText ? `${cleanText} (${href})` : href;
        });
        text = text.replace(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi, (match, content) => {
            const clean = content.replace(/<[^>]+>/g, '').trim();
            return `\n\n${clean}\n${'='.repeat(Math.min(clean.length, 40))}\n`;
        });
        text = text.replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, (match, content) => {
            const clean = content.replace(/<[^>]+>/g, '').trim();
            return `\n\n${clean}\n${'-'.repeat(Math.min(clean.length, 40))}\n`;
        });
        text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (match, content) => {
            const clean = content.replace(/<[^>]+>/g, '').trim();
            return `\n* ${clean}`;
        });
        text = text.replace(/<(?:p|div|tr|br)[^>]*>/gi, '\n');
        text = text.replace(/<[^>]+>/g, '');
        text = text.replace(/&nbsp;/g, ' ')
                   .replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'");
        return text.split('\n')
                   .map(line => line.trim())
                   .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
                   .join('\n')
                   .trim();
    },

    generateEml({ subject = 'Email Preview', html = '', from = 'sender@example.com', to = 'recipient@example.com' }) {
        const plainText = this.generatePlainText(html);
        const boundary = '----=_Part_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
        const dateStr = new Date().toUTCString();

        return [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `Date: ${dateStr}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            `Content-Type: text/plain; charset=UTF-8`,
            `Content-Transfer-Encoding: 7bit`,
            '',
            plainText,
            '',
            `--${boundary}`,
            `Content-Type: text/html; charset=UTF-8`,
            `Content-Transfer-Encoding: 7bit`,
            '',
            html,
            '',
            `--${boundary}--`,
            ''
        ].join('\r\n');
    }
};

/**
 * Curated Production Starter Templates Library
 */
const StarterTemplates = {
    templates: [
        {
            id: 'welcome',
            name: 'Welcome & Onboarding',
            category: 'onboarding',
            subject: 'Welcome to {{company_name|Acme}}, {{first_name|Friend}}!',
            preheader: "Let's get you started on the platform in 3 easy steps.",
            variables: [['first_name', 'Alex'], ['company_name', 'TempEd'], ['login_url', 'https://app.example.com/login']],
            html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding:36px;text-align:center;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#ffffff;">
            <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;">Welcome to {{company_name|Acme}}!</h1>
            <p style="margin:0;font-size:16px;opacity:0.9;">We're thrilled to have you on board, {{first_name|Friend}}.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;color:#334155;font-size:15px;line-height:1.6;">
            <p style="margin-top:0;">Your account is ready. Here is how to make the most of your first 24 hours:</p>
            <ol style="padding-left:20px;margin-bottom:28px;">
              <li style="margin-bottom:8px;"><strong>Complete your profile:</strong> Add your brand assets and settings.</li>
              <li style="margin-bottom:8px;"><strong>Create your first template:</strong> Choose from our pre-built library.</li>
              <li style="margin-bottom:8px;"><strong>Run pre-flight checks:</strong> Ensure 100% deliverability.</li>
            </ol>
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{login_url|https://example.com/login}}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="#4f46e5"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Go to Dashboard</center></v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px auto;">
              <tr><td align="center" bgcolor="#4f46e5" style="border-radius:8px;"><a href="{{login_url|https://example.com/login}}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;">Go to Dashboard &rarr;</a></td></tr>
            </table>
            <!--<![endif]-->
          </td>
        </tr>
        <tr>
          <td style="padding:24px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;">
            <p style="margin:0 0 8px 0;">Questions? Reply directly to this email.</p>
            <p style="margin:0;"><a href="{{unsubscribe_url|https://example.com/unsubscribe}}" style="color:#4f46e5;">Unsubscribe</a> &bull; 100 Innovation Way, Suite 400, San Francisco, CA 94107</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
        },
        {
            id: 'announcement',
            name: 'Product Announcement',
            category: 'marketing',
            subject: 'Introducing {{feature_name|Next-Gen Analytics}}: Supercharge your workflow',
            preheader: 'Deep deliverability insights, real-time client checks, and one-click exports.',
            variables: [['feature_name', 'Live Pre-Flight'], ['release_version', 'v2.0'], ['cta_url', 'https://example.com/new-feature']],
            html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#0f172a">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#1e293b;border-radius:12px;border:1px solid #334155;color:#f8fafc;">
        <tr>
          <td style="padding:36px;text-align:center;">
            <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:rgba(99,102,241,0.2);color:#818cf8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">Release {{release_version|v2.0}}</span>
            <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:700;color:#ffffff;">Meet {{feature_name|Live Pre-Flight}}</h1>
            <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">Designed from the ground up to give email creators total peace of mind before hitting send.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 36px 36px;color:#cbd5e1;font-size:14px;line-height:1.6;">
            <div style="background:#0f172a;border-radius:8px;padding:20px;border:1px solid #334155;margin-bottom:24px;">
              <h3 style="margin:0 0 8px 0;font-size:15px;color:#ffffff;">What's new:</h3>
              <p style="margin:0 0 6px 0;">&bull; <strong>Gmail 102KB Detector:</strong> Never get clipped in subscriber inboxes.</p>
              <p style="margin:0 0 6px 0;">&bull; <strong>CAN-SPAM Guard:</strong> Auto-verify unsubscribe and address compliance.</p>
              <p style="margin:0;">&bull; <strong>One-Click Export:</strong> Plain text, EML test files, and clean HTML.</p>
            </div>
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{cta_url|https://example.com/new-feature}}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="#6366f1"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Try Feature Now</center></v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px auto;">
              <tr><td align="center" bgcolor="#6366f1" style="border-radius:8px;"><a href="{{cta_url|https://example.com/new-feature}}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;">Try Feature Now &rarr;</a></td></tr>
            </table>
            <!--<![endif]-->
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;background:#0f172a;border-top:1px solid #334155;font-size:11px;color:#64748b;text-align:center;">
            <p style="margin:0 0 4px 0;">Acme Corp, 500 Technology Square, Boston, MA 02139</p>
            <p style="margin:0;"><a href="{{unsubscribe_url|https://example.com/unsubscribe}}" style="color:#818cf8;">Unsubscribe</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
        },
        {
            id: 'newsletter',
            name: 'Weekly Digest Newsletter',
            category: 'newsletter',
            subject: 'The Weekly Dispatch: Issue #{{issue_number|42}}',
            preheader: 'This week: Email design best practices, dark mode secrets, and open rates.',
            variables: [['issue_number', '42'], ['curator_name', 'Dev Team']],
            html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;color:#0f172a;">
        <tr>
          <td style="padding:32px 32px 16px 32px;border-bottom:2px solid #f1f5f9;">
            <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">The Weekly Dispatch</h1>
            <p style="margin:0;font-size:13px;color:#64748b;">Issue #{{issue_number|42}} &bull; Curated by {{curator_name|Dev Team}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;">
            <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:700;"><a href="https://example.com/article1" style="color:#0f172a;text-decoration:none;">1. Modern Email Typography in 2026</a></h2>
            <p style="margin:0 0 16px 0;font-size:14px;color:#475569;line-height:1.6;">Why system font stacks and clean fallbacks outperform web fonts in deliverability audits.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
            <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:700;"><a href="https://example.com/article2" style="color:#0f172a;text-decoration:none;">2. Demystifying Gmail's 102KB Clipping</a></h2>
            <p style="margin:0 0 16px 0;font-size:14px;color:#475569;line-height:1.6;">How inlining styles inflates payload size and how to optimize markup for flawless delivery.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;">
            <p style="margin:0 0 8px 0;">Sent with love by The Weekly Dispatch</p>
            <p style="margin:0;"><a href="{{unsubscribe_url|https://example.com/unsubscribe}}" style="color:#4f46e5;">Unsubscribe</a> &bull; 742 Evergreen Terrace, Springfield, OR 97477</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
        },
        {
            id: 'password_reset',
            name: 'Security Password Reset',
            category: 'transactional',
            subject: 'Reset your password for {{app_name|TempEd}}',
            preheader: 'We received a request to reset your password. Use the link inside.',
            variables: [['app_name', 'TempEd'], ['reset_url', 'https://app.example.com/reset-password?token=xyz'], ['expiry_hours', '2']],
            html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 2px 4px rgba(0,0,0,0.04);">
        <tr>
          <td style="padding:36px;text-align:center;">
            <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#fee2e2;color:#ef4444;line-height:48px;font-size:20px;margin-bottom:16px;">&#128274;</div>
            <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#0f172a;">Password Reset Request</h1>
            <p style="margin:0 0 24px 0;font-size:14px;color:#64748b;line-height:1.6;">We received a request to reset the password for your <strong>{{app_name|TempEd}}</strong> account. This link will expire in {{expiry_hours|2}} hours.</p>
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{reset_url|https://example.com/reset}}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="#ef4444"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Reset Password</center></v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px auto;">
              <tr><td align="center" bgcolor="#ef4444" style="border-radius:8px;"><a href="{{reset_url|https://example.com/reset}}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;">Reset Password</a></td></tr>
            </table>
            <!--<![endif]-->
            <p style="margin:24px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
            {{app_name|TempEd}} Security &bull; 100 Main Street, Suite 500, Seattle, WA 98104
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
        },
        {
            id: 'receipt',
            name: 'Order Confirmation & Receipt',
            category: 'transactional',
            subject: 'Receipt for Order #{{order_id|ORD-9842}}',
            preheader: 'Thank you for your purchase! Your order details and receipt are enclosed.',
            variables: [['order_id', 'ORD-9842'], ['customer_name', 'Jordan'], ['order_total', '$79.00'], ['tracking_url', 'https://example.com/track']],
            html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
        <tr>
          <td style="padding:32px 32px 16px 32px;">
            <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#0f172a;">Thank you for your order!</h1>
            <p style="margin:0;font-size:14px;color:#64748b;">Order #{{order_id|ORD-9842}} &bull; Hi {{customer_name|Jordan}}, we're getting your order ready.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;">
            <table border="0" cellpadding="8" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:14px;color:#334155;">
              <tr style="border-bottom:2px solid #e2e8f0;font-size:12px;color:#64748b;text-transform:uppercase;">
                <th align="left">Item</th>
                <th align="right">Qty</th>
                <th align="right">Price</th>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td>TempEd Pro Annual Subscription</td>
                <td align="right">1</td>
                <td align="right">$79.00</td>
              </tr>
              <tr style="font-weight:700;font-size:15px;color:#0f172a;">
                <td colspan="2" align="right" style="padding-top:16px;">Total</td>
                <td align="right" style="padding-top:16px;">{{order_total|$79.00}}</td>
              </tr>
            </table>
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{tracking_url|https://example.com/track}}" style="height:42px;v-text-anchor:middle;width:200px;" arcsize="18%" stroke="f" fillcolor="#10b981"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">View Order Details</center></v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px auto;">
              <tr><td align="center" bgcolor="#10b981" style="border-radius:8px;"><a href="{{tracking_url|https://example.com/track}}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;">View Order Details</a></td></tr>
            </table>
            <!--<![endif]-->
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;">
            Need help? Contact support@example.com &bull; 200 Commerce Blvd, Suite 10, Denver, CO 80202
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
        },
        {
            id: 'webinar',
            name: 'Webinar & Event Invitation',
            category: 'marketing',
            subject: 'Join us live: {{event_title|Scaling Email Infrastructure in 2026}}',
            preheader: 'Live masterclass on deliverability, inbox placement, and responsive email systems.',
            variables: [['event_title', 'Mastering Deliverability in 2026'], ['event_date', 'Thursday, Oct 15 at 2:00 PM EST'], ['rsvp_url', 'https://example.com/webinar']],
            html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="padding:36px;background:#312e81;color:#ffffff;text-align:center;">
            <span style="display:inline-block;padding:4px 12px;border-radius:16px;background:#4338ca;color:#c7d2fe;font-size:12px;font-weight:700;margin-bottom:12px;">LIVE MASTERCLASS</span>
            <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;">{{event_title|Mastering Deliverability in 2026}}</h1>
            <p style="margin:0;font-size:14px;color:#a5b4fc;">&#128197; {{event_date|Thursday, Oct 15 at 2:00 PM EST}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#334155;font-size:14px;line-height:1.6;">
            <p style="margin-top:0;">Join our senior email engineers as we break down the latest 2026 mailbox provider algorithms, SPF/DKIM/DMARC standards, and how to avoid the spam folder.</p>
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{rsvp_url|https://example.com/webinar}}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="#4f46e5"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Reserve My Seat</center></v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px auto;">
              <tr><td align="center" bgcolor="#4f46e5" style="border-radius:8px;"><a href="{{rsvp_url|https://example.com/webinar}}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;">Reserve My Seat &rarr;</a></td></tr>
            </table>
            <!--<![endif]-->
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
            <p style="margin:0 0 6px 0;">Acme Events &bull; 100 Main St, Chicago, IL 60601</p>
            <p style="margin:0;"><a href="{{unsubscribe_url|https://example.com/unsubscribe}}" style="color:#4f46e5;">Unsubscribe</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
        }
    ],

    getAll() {
        return this.templates;
    },

    getTemplate(id) {
        return this.templates.find(t => t.id === id) || null;
    },

    getById(id) {
        return this.getTemplate(id);
    }
};

// Bind modules to EmailEditorUtils
EmailEditorUtils.PreFlightInspector = PreFlightInspector;
EmailEditorUtils.EmailComponentSnippets = EmailComponentSnippets;
EmailEditorUtils.EmailExportTools = EmailExportTools;
EmailEditorUtils.StarterTemplates = StarterTemplates;

// Make utilities and modules available globally
if (typeof window !== 'undefined') {
    window.EmailEditorUtils = EmailEditorUtils;
    window.PreFlightInspector = PreFlightInspector;
    window.EmailComponentSnippets = EmailComponentSnippets;
    window.EmailExportTools = EmailExportTools;
    window.StarterTemplates = StarterTemplates;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONSTANTS,
        EmailEditorUtils,
        PreFlightInspector,
        EmailComponentSnippets,
        EmailExportTools,
        StarterTemplates
    };
}