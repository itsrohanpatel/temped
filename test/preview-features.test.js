import { describe, it, expect, beforeEach } from 'vitest';
import '../shared-utils.js';
import '../spam-filter.js';

describe('Preview Features & Utilities', () => {
    describe('Preheader Text Injection', () => {
        it('injects hidden preheader snippet after <body> tag', () => {
            const html = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello World</h1></body></html>';
            const preheader = 'Special discount inside!';
            const result = window.EmailEditorUtils.injectPreheader(html, preheader);

            expect(result).toContain('Special discount inside!');
            expect(result).toContain('display:none');
            expect(result).toContain('max-height:0px');
            // Ensure placed after body
            const bodyIndex = result.indexOf('<body');
            const preheaderIndex = result.indexOf('Special discount inside!');
            const h1Index = result.indexOf('<h1>Hello World</h1>');
            expect(bodyIndex).toBeLessThan(preheaderIndex);
            expect(preheaderIndex).toBeLessThan(h1Index);
        });

        it('injects at the beginning of HTML if no <body> tag is present', () => {
            const html = '<div>Plain template fragment</div>';
            const preheader = 'Preview snippet';
            const result = window.EmailEditorUtils.injectPreheader(html, preheader);

            expect(result.startsWith('<div style="display:none;font-size:1px;')).toBe(true);
            expect(result).toContain('Preview snippet');
        });

        it('returns original HTML if preheader is empty', () => {
            const html = '<body>Content</body>';
            expect(window.EmailEditorUtils.injectPreheader(html, '')).toBe(html);
            expect(window.EmailEditorUtils.injectPreheader(html, '   ')).toBe(html);
        });
    });

    describe('Viewport Management', () => {
        let container;

        beforeEach(() => {
            container = document.createElement('div');
            container.id = 'email-preview-container';
        });

        it('applies correct width styling for desktop, tablet, and mobile', () => {
            window.EmailEditorUtils.setPreviewViewport(container, 'desktop');
            expect(container.style.maxWidth).toBe('600px');

            window.EmailEditorUtils.setPreviewViewport(container, 'tablet');
            expect(container.style.maxWidth).toBe('768px');

            window.EmailEditorUtils.setPreviewViewport(container, 'mobile');
            expect(container.style.maxWidth).toBe('375px');
        });

        it('defaults to 100% or 600px for unknown viewport', () => {
            window.EmailEditorUtils.setPreviewViewport(container, 'custom');
            expect(container.style.maxWidth).toBe('600px');
        });
    });

    describe('Dark Mode Simulation', () => {
        let previewEl;

        beforeEach(() => {
            previewEl = document.createElement('div');
            previewEl.id = 'email-preview';
        });

        it('toggles dark mode class and styles', () => {
            const isDarkNow = window.EmailEditorUtils.togglePreviewDarkMode(previewEl);
            expect(isDarkNow).toBe(true);
            expect(previewEl.classList.contains('preview-dark-mode')).toBe(true);

            const isDarkSecond = window.EmailEditorUtils.togglePreviewDarkMode(previewEl);
            expect(isDarkSecond).toBe(false);
            expect(previewEl.classList.contains('preview-dark-mode')).toBe(false);
        });
    });

    describe('Variable Auto-Discovery', () => {
        it('detects all variables with and without fallbacks from templates', () => {
            const content = `
                Hello {{first_name|there}},
                Your company {{company_name}} has won an award!
                Contact us at {{support_email|help@example.com}}.
                {{first_name}}
            `;
            const existingVars = { first_name: 'John' };
            const discovered = window.EmailEditorUtils.autoDiscoverVariables(content, existingVars);

            expect(discovered).toEqual({
                first_name: 'John',
                company_name: '',
                support_email: 'help@example.com'
            });
        });
    });
});
