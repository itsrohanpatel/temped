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
    });
});
