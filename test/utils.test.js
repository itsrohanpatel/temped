import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../shared-utils.js';

describe('EmailEditorUtils Core Tests', () => {
    const utils = window.EmailEditorUtils;

    describe('escapeHtml and escapeAttr', () => {
        it('returns empty string for falsy values', () => {
            expect(utils.escapeHtml('')).toBe('');
            expect(utils.escapeHtml(null)).toBe('');
            expect(utils.escapeHtml(undefined)).toBe('');
        });

        it('escapes dangerous HTML characters', () => {
            const raw = '<script>alert("XSS & fun")</script>\'test\'';
            const escaped = utils.escapeHtml(raw);
            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;script&gt;');
            expect(escaped).toContain('&amp;');
            expect(escaped).toContain('&quot;');
            expect(escaped).toContain('&#39;');
        });

        it('escapes attributes properly', () => {
            const raw = 'onload="alert(1)" & test';
            const escaped = utils.escapeAttr(raw);
            expect(escaped).toContain('&quot;');
            expect(escaped).toContain('&amp;');
        });

        it('sanitizes html with fallback when DOMPurify is absent', () => {
            const originalPurify = window.DOMPurify;
            delete window.DOMPurify;
            expect(utils.sanitizeHtml('')).toBe('');
            const dirty = '<script>evil()</script><a href="javascript:alert(1)" onclick="steal()">Link</a>';
            const cleaned = utils.sanitizeHtml(dirty);
            expect(cleaned).not.toContain('<script>');
            expect(cleaned).not.toContain('javascript:');
            expect(cleaned).not.toContain('onclick=');
            window.DOMPurify = originalPurify;
        });

        it('builds word regex for words starting and ending with word characters', () => {
            const reg = utils.buildWordRegex('discount');
            expect(reg.test('Huge discount today')).toBe(true);
            expect(reg.test('nodiscount')).toBe(false);
            expect(utils.buildWordRegex('')).toBeNull();
        });
    });

    describe('escapeRegex', () => {
        it('safely escapes regex metacharacters', () => {
            expect(typeof utils.escapeRegex).toBe('function');
            const specialStr = 'user.name? (full) [id] {test} + * ^ $ | \\';
            const escaped = utils.escapeRegex(specialStr);
            const regex = new RegExp(escaped);
            expect(regex.test(specialStr)).toBe(true);
        });
    });

    describe('renderVariablesWithFallbacks', () => {
        it('replaces standard variables', () => {
            expect(typeof utils.renderVariablesWithFallbacks).toBe('function');
            const tpl = 'Hello {{full_name}}, welcome to {{company_name}}!';
            const vars = new Map([
                ['full_name', 'Alice'],
                ['company_name', 'Acme Corp']
            ]);
            const rendered = utils.renderVariablesWithFallbacks(tpl, vars);
            expect(rendered).toBe('Hello Alice, welcome to Acme Corp!');
        });

        it('handles fallback syntax when variable is missing or empty', () => {
            const tpl = 'Hi {{first_name|there}}, your code is {{code|12345}}.';
            const vars = new Map([['code', '']]);
            const rendered = utils.renderVariablesWithFallbacks(tpl, vars);
            expect(rendered).toBe('Hi there, your code is 12345.');
        });

        it('uses provided variable when fallback is specified', () => {
            const tpl = 'Hi {{first_name|there}}, your discount is {{discount|10%}}.';
            const vars = new Map([
                ['first_name', 'Bob'],
                ['discount', '25%']
            ]);
            const rendered = utils.renderVariablesWithFallbacks(tpl, vars);
            expect(rendered).toBe('Hi Bob, your discount is 25%.');
        });

        it('does not throw when variable contains metacharacters', () => {
            const tpl = 'Value: {{user[0]}}';
            const vars = new Map([['user[0]', 'Test User']]);
            expect(() => utils.renderVariablesWithFallbacks(tpl, vars)).not.toThrow();
            expect(utils.renderVariablesWithFallbacks(tpl, vars)).toBe('Value: Test User');
        });
    });

    describe('Validation utilities', () => {
        it('validates template names', () => {
            expect(utils.validateTemplateName('').isValid).toBe(false);
            expect(utils.validateTemplateName('   ').isValid).toBe(false);
            expect(utils.validateTemplateName('Valid Template').isValid).toBe(true);
            expect(utils.validateTemplateName('A'.repeat(150)).isValid).toBe(false);
        });

        it('validates subject lines', () => {
            const shortRes = utils.validateSubjectLine('Hi');
            expect(shortRes.warnings.length).toBeGreaterThan(0);

            const longRes = utils.validateSubjectLine('A'.repeat(70));
            expect(longRes.warnings.length).toBeGreaterThan(0);

            const okRes = utils.validateSubjectLine('Quick meeting follow-up');
            expect(okRes.warnings.length).toBe(0);
        });

        it('validates URLs correctly', () => {
            expect(utils.validateUrl('').isValid).toBe(false);
            expect(utils.validateUrl('not-a-url').isValid).toBe(false);
            expect(utils.validateUrl('https://example.com').isValid).toBe(true);
            expect(utils.validateUrl('http://tigihr.com/charges').isValid).toBe(true);
        });
    });

    describe('Notification DOM handling', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="notification" class="fixed top-24 right-6 text-white px-6 py-3 rounded-xl shadow-2xl hidden font-semibold flex items-center gap-2 transform transition-all duration-300 translate-x-12 opacity-0 z-[60]">
                    <i id="notification-icon" class="fas fa-check-circle"></i>
                    <span id="notification-text"></span>
                </div>
            `;
        });

        it('properly removes opacity-0 and translate-x-12 when showing notification', () => {
            vi.useFakeTimers();
            utils.showNotification('Saved successfully!', 'success', 2000);
            
            const n = document.getElementById('notification');
            const text = document.getElementById('notification-text');
            
            expect(text.textContent).toBe('Saved successfully!');
            expect(n.classList.contains('hidden')).toBe(false);
            expect(n.classList.contains('opacity-0')).toBe(false);
            expect(n.classList.contains('opacity-100')).toBe(true);
            expect(n.classList.contains('translate-x-0')).toBe(true);

            vi.advanceTimersByTime(2500);
            expect(n.classList.contains('hidden')).toBe(true);
            vi.useRealTimers();
        });

        it('supports error, warning, and info notification types', () => {
            utils.showNotification('Error occurred', 'error');
            const n = document.getElementById('notification');
            expect(n.style.backgroundColor).toContain('var(--color-poppy)');

            utils.showNotification('Warning note', 'warning');
            expect(n.style.backgroundColor).toContain('var(--color-carrot-orange)');

            utils.showNotification('Info note', 'info');
            expect(n.style.backgroundColor).toContain('var(--color-blue-violet)');
        });

        it('handles missing notification element gracefully without throwing', () => {
            document.body.innerHTML = '';
            expect(() => utils.showNotification('Testing missing DOM')).not.toThrow();
        });
    });

    describe('Variable validation & discovery', () => {
        it('validates variable names correctly', () => {
            expect(utils.validateVariableName('').isValid).toBe(false);
            expect(utils.validateVariableName('123abc').isValid).toBe(false);
            expect(utils.validateVariableName('has space').isValid).toBe(false);
            expect(utils.validateVariableName('has-dash').isValid).toBe(false);
            expect(utils.validateVariableName('valid_var_1').isValid).toBe(true);
        });

        it('finds all variable names in text', () => {
            expect(utils.findVariablesInText('')).toEqual([]);
            const found = utils.findVariablesInText('Hi {{first_name}}, see {{item|product}} at {{link}}');
            expect(found).toEqual(['first_name', 'item', 'link']);
        });
    });

    describe('Debounce utility', () => {
        it('debounces multiple calls', () => {
            vi.useFakeTimers();
            let count = 0;
            const debounced = utils.debounce(() => { count++; }, 100);
            debounced();
            debounced();
            debounced();
            expect(count).toBe(0);
            vi.advanceTimersByTime(150);
            expect(count).toBe(1);
            vi.useRealTimers();
        });
    });

    describe('Storage utilities', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('reads and writes standard storage items', () => {
            expect(utils.getStorageItem('nonexistent', 'default')).toBe('default');
            utils.setStorageItem('test_key', 'test_val');
            expect(utils.getStorageItem('test_key')).toBe('test_val');
        });

        it('reads and writes JSON storage items', () => {
            const data = { a: 1, b: 'hello' };
            utils.setStorageJSON('json_key', data);
            expect(utils.getStorageJSON('json_key')).toEqual(data);
        });

        it('returns default value when stored JSON is corrupted', () => {
            localStorage.setItem('corrupted', '{invalid-json');
            expect(utils.getStorageJSON('corrupted', { fallback: true })).toEqual({ fallback: true });
        });

        it('handles storage read/write exceptions safely', () => {
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('Quota exceeded');
            });
            const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('Storage disabled');
            });

            expect(utils.setStorageItem('key', 'val')).toBe(false);
            expect(utils.getStorageItem('key', 'safe_default')).toBe('safe_default');
            expect(utils.setStorageJSON('key', {})).toBe(false);
            expect(utils.getStorageJSON('key', 'safe_json')).toBe('safe_json');

            setItemSpy.mockRestore();
            getItemSpy.mockRestore();
        });
    });

    describe('EmailEditorUtils Branch Coverage Edge Cases', () => {
        it('handles notification when no text container exists and multiple calls clear timer', () => {
            const notif = document.createElement('div');
            notif.id = 'notification';
            document.body.appendChild(notif);

            utils.showNotification('First notice', 'info');
            expect(notif.textContent).toBe('First notice');
            expect(notif._hideTimer).toBeDefined();

            utils.showNotification('Second notice', 'success');
            expect(notif.textContent).toBe('Second notice');

            notif.remove();
        });

        it('escapeRegex handles falsy and empty values', () => {
            expect(utils.escapeRegex('')).toBe('');
            expect(utils.escapeRegex(null)).toBe('');
        });

        it('renderVariablesWithFallbacks handles various input types and edge cases', () => {
            expect(utils.renderVariablesWithFallbacks('', {})).toBe('');
            expect(utils.renderVariablesWithFallbacks('Hello {{name}}', { name: 'Alice' })).toBe('Hello Alice');
            expect(utils.renderVariablesWithFallbacks('Hello {{missing|Friend}}', {})).toBe('Hello Friend');
            expect(utils.renderVariablesWithFallbacks('Hello {{missing}}', {})).toBe('Hello ');
            expect(utils.renderVariablesWithFallbacks('Hello {{val}}', null)).toBe('Hello ');
        });

        it('findVariablesInText handles empty strings', () => {
            expect(utils.findVariablesInText('')).toEqual([]);
            expect(utils.findVariablesInText(null)).toEqual([]);
        });

        it('injectPreheader handles edge cases and markup without body tag', () => {
            expect(utils.injectPreheader('', 'preheader')).toBe('');
            expect(utils.injectPreheader('<p>Content</p>', '')).toBe('<p>Content</p>');
            const injectedNoBody = utils.injectPreheader('<div>Hello</div>', 'Preview');
            expect(injectedNoBody).toContain('Preview');
            expect(injectedNoBody.startsWith('<div style="display:none;')).toBe(true);
        });

        it('setPreviewViewport handles null container and unknown viewport sizes', () => {
            expect(() => utils.setPreviewViewport(null, 'desktop')).not.toThrow();
            const elem = document.createElement('div');
            utils.setPreviewViewport(elem, 'tablet');
            expect(elem.style.maxWidth).toBe('768px');
            utils.setPreviewViewport(elem, 'custom');
            expect(elem.style.maxWidth).toBe('600px');
        });

        it('togglePreviewDarkMode handles null element', () => {
            expect(utils.togglePreviewDarkMode(null)).toBe(false);
            const elem = document.createElement('div');
            expect(utils.togglePreviewDarkMode(elem)).toBe(true);
            expect(utils.togglePreviewDarkMode(elem)).toBe(false);
        });

        it('autoDiscoverVariables handles empty templates and existing variables', () => {
            expect(utils.autoDiscoverVariables('', { existing: 'val' })).toEqual({ existing: 'val' });
        });

        it('sanitizeHtml uses regex fallback when DOMPurify is not available', () => {
            const originalPurify = window.DOMPurify;
            delete window.DOMPurify;
            try {
                const dirty = '<script>alert(1)</script><a href="#" onclick="evil()">Click</a>';
                const clean = utils.sanitizeHtml(dirty);
                expect(clean).not.toContain('<script>');
                expect(clean).not.toContain('onclick');
            } finally {
                window.DOMPurify = originalPurify;
            }
        });

        it('buildWordRegex handles non-word start and end patterns', () => {
            const regex = utils.buildWordRegex('$$$deal!');
            expect(regex).not.toBeNull();
            expect('$$$deal!'.match(regex)).toBeTruthy();
        });

        it('validateSubjectLine handles empty subject lines', () => {
            const res = utils.validateSubjectLine('');
            expect(res.warnings).toContain('Subject line is empty');
        });

        it('cleanPastedHtml strips Gemini, Angular, and dark web styles cleanly', () => {
            expect(utils.cleanPastedHtml('')).toBe('');
            const dirtyGemini = `<p _ngcontent-ng-c958567356="" class="ng-star-inserted" style="background-color: rgb(38, 45, 61); color: rgb(212, 212, 212); -webkit-tap-highlight-color: transparent; font-size: 14px;"><ms-cmark-node style="display: contents;"><span class="ng-star-inserted">Hi Hiring Manager,</span></ms-cmark-node></p><ul class="ng-star-inserted"><li class="ng-star-inserted"><p>Achievement 1</p></li></ul>`;
            const clean = utils.cleanPastedHtml(dirtyGemini);
            expect(clean).not.toContain('_ngcontent');
            expect(clean).not.toContain('ng-star-inserted');
            expect(clean).not.toContain('ms-cmark-node');
            expect(clean).not.toContain('background-color: rgb(38, 45, 61)');
            expect(clean).not.toContain('color: rgb(212, 212, 212)');
            expect(clean).toContain('Hi Hiring Manager,');
            expect(clean).toContain('<li>Achievement 1</li>');

            // Test dark hex background stripping and redundant nested span unwrapping
            const dirtyHex = '<div style="background-color: #212121; color: #ffffff;"><span style=""><span><span>Clean Text</span></span></span><span></span></div>';
            const cleanHex = utils.cleanPastedHtml(dirtyHex);
            expect(cleanHex).not.toContain('#212121');
            expect(cleanHex).toContain('Clean Text');
            expect(cleanHex).not.toContain('<span style="">');
        });
    });
});

