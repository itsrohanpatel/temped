import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('WysiwygEngine Subsystem Tests', () => {
    let dom, window, document, WysiwygEngine;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><body><div id="email-preview" contenteditable="true"></div><textarea id="html-input"></textarea></body></html>');
        window = dom.window;
        document = dom.window.document;
        global.window = window;
        global.document = document;
        global.NodeFilter = window.NodeFilter;

        // Load wysiwyg-engine.js in JSDOM environment
        const scriptCode = fs.readFileSync(path.resolve(__dirname, '../js/editor/wysiwyg-engine.js'), 'utf-8');
        dom.window.eval(scriptCode);
        WysiwygEngine = dom.window.WysiwygEngine;
    });

    it('exports WysiwygEngine on global window', () => {
        expect(WysiwygEngine).toBeDefined();
        expect(typeof WysiwygEngine.saveSelection).toBe('function');
        expect(typeof WysiwygEngine.restoreSelection).toBe('function');
        expect(typeof WysiwygEngine.styleAllLinks).toBe('function');
        expect(typeof WysiwygEngine.updateSourceFromPreview).toBe('function');
    });

    it('saveSelection and restoreSelection handle empty or invalid selections safely', () => {
        const preview = document.getElementById('email-preview');
        expect(WysiwygEngine.saveSelection(preview)).toBeNull();
        expect(() => WysiwygEngine.restoreSelection(preview, null)).not.toThrow();
        expect(() => WysiwygEngine.restoreSelection(preview, { start: 10, end: 10 })).not.toThrow();
    });

    it('restoreSelection sets caret at end if target position is past content (never index 0 / top)', () => {
        const preview = document.getElementById('email-preview');
        preview.innerHTML = '<p>Hello world</p>';
        
        // Target index 999 past length
        WysiwygEngine.restoreSelection(preview, { start: 999, end: 999 });
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            // Should be at the end, not start
            expect(range.startOffset).toBeGreaterThan(0);
        }
    });

    it('styleAllLinks formats anchor tags for email clients', () => {
        const preview = document.getElementById('email-preview');
        preview.innerHTML = '<p>Check <a href="https://example.com">here</a> for updates</p>';
        WysiwygEngine.styleAllLinks(preview);
        const link = preview.querySelector('a');
        expect(link.style.color).toBe('rgb(4, 0, 255)');
        expect(link.style.textDecoration).toBe('underline');
        expect(link.innerHTML).toContain('<font color="#0400ff"><u>here</u></font>');
    });

    it('updateSourceFromPreview converts variable spans to placeholders and strips spam marks', () => {
        const preview = document.getElementById('email-preview');
        const input = document.getElementById('html-input');
        preview.innerHTML = '<p>Hi <span data-variable="first_name">John</span>, <mark class="spam-category-urgency">hurry</mark>!</p>';

        const updated = WysiwygEngine.updateSourceFromPreview(preview, input);
        expect(updated).toBe(true);
        expect(input.value).toContain('Hi {{first_name}}, hurry!');
        expect(input.value).not.toContain('<span data-variable');
        expect(input.value).not.toContain('<mark');
    });

    it('clearSpamMarks unwraps marks while keeping text content', () => {
        const preview = document.getElementById('email-preview');
        preview.innerHTML = '<p>This is <mark>urgent</mark> now</p>';
        WysiwygEngine.clearSpamMarks(preview);
        expect(preview.querySelectorAll('mark').length).toBe(0);
        expect(preview.textContent).toBe('This is urgent now');
    });
});
