import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('EmailEditor Orchestrator (editor-app.js)', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="editor-container">
                <textarea id="html-input"></textarea>
                <div id="email-preview" contenteditable="true"></div>
                <input id="subject-input" value="Test Subject" />
                <input id="preheader-input" value="Test Preheader" />
                <input id="from-name-input" value="Sender" />
                <input id="from-email-input" value="sender@example.com" />
                <table id="variables-table"><tbody></tbody></table>
                <button id="add-variable-btn"></button>
                <span id="word-count"></span>
                <span id="char-count"></span>
                <span id="auto-save-status"></span>
                <span id="last-saved"></span>
                <div id="notification" class="hidden"><span id="notification-text"></span></div>
                <div id="export-dropdown-menu" class="hidden"></div>
                <button id="export-menu-btn"></button>
            </div>
        `;
    });

    it('editor-app.js file exists and exports EmailEditor', () => {
        const filePath = path.resolve(__dirname, '../js/editor/editor-app.js');
        expect(fs.existsSync(filePath)).toBe(true);
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain('const EmailEditor =');
        expect(content).toContain('window.EmailEditor = EmailEditor;');
    });

    it('contains deliverability and preflight methods', () => {
        const filePath = path.resolve(__dirname, '../js/editor/editor-app.js');
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain('runPreflightInspection');
        expect(content).toContain('showPreflightModal');
        expect(content).toContain('hidePreflightModal');
        expect(content).toContain('insertComplianceFooter');
        expect(content).toContain('insertComponent');
        expect(content).toContain('exportHtmlFile');
        expect(content).toContain('exportTxtFile');
        expect(content).toContain('exportEmlFile');
    });

    describe('Spam Rewrite & parseReplacementMapping', () => {
        let parseReplacementMapping;

        beforeEach(() => {
            const filePath = path.resolve(__dirname, '../js/editor/editor-app.js');
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const match = fileContent.match(/EmailEditor\.parseReplacementMapping = function\(text\) \{([\s\S]*?)\n        \};/);
            expect(match).toBeTruthy();
            parseReplacementMapping = new Function('text', match[1]);
        });

        it('parses empty array "[]" as an empty array without error', () => {
            const result = parseReplacementMapping('[]');
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(0);
        });

        it('parses empty array in markdown code fences without error', () => {
            const markdown = '```json\n[]\n```';
            const result = parseReplacementMapping(markdown);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(0);
        });

        it('parses empty string or null as empty array', () => {
            expect(parseReplacementMapping('')).toEqual([]);
            expect(parseReplacementMapping(null)).toEqual([]);
            expect(parseReplacementMapping(undefined)).toEqual([]);
        });

        it('parses valid JSON array with replacement objects', () => {
            const json = JSON.stringify([
                { from: 'free', to: 'complimentary' },
                { from: 'act now', to: 'get started' }
            ]);
            const result = parseReplacementMapping(json);
            expect(result).toEqual([
                { from: 'free', to: 'complimentary' },
                { from: 'act now', to: 'get started' }
            ]);
        });

        it('parses markdown-fenced JSON array with replacement objects', () => {
            const markdown = '```json\n[\n  {"from": "risk free", "to": "guaranteed"}\n]\n```';
            const result = parseReplacementMapping(markdown);
            expect(result).toEqual([
                { from: 'risk free', to: 'guaranteed' }
            ]);
        });

        it('parses fallback arrow format line by line', () => {
            const text = 'free -> complimentary\nact now -> get started';
            const result = parseReplacementMapping(text);
            expect(result).toEqual([
                { from: 'free', to: 'complimentary' },
                { from: 'act now', to: 'get started' }
            ]);
        });

        it('filters out invalid objects missing from/to strings', () => {
            const mixed = JSON.stringify([
                { from: 'free', to: 'complimentary' },
                { from: 123, to: 'bad' },
                { other: 'stuff' },
                null
            ]);
            const result = parseReplacementMapping(mixed);
            expect(result).toEqual([
                { from: 'free', to: 'complimentary' }
            ]);
        });

        it('confirms editor-app.js handles empty mapping without throwing', () => {
            const filePath = path.resolve(__dirname, '../js/editor/editor-app.js');
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            // Must not have the old throwing check: if (!Array.isArray(mapping) || mapping.length === 0) throw new Error('No valid replacements returned')
            expect(fileContent).not.toContain('mapping.length === 0) {\r\n                    throw new Error(\'No valid replacements returned\')');
            expect(fileContent).not.toContain('mapping.length === 0) {\n                    throw new Error(\'No valid replacements returned\')');
            // Must have graceful handling of mapping.length === 0
            expect(fileContent).toContain('if (mapping.length === 0) {');
            expect(fileContent).toContain('No spam replacements needed — your email is clean!');
        });

        it('contains showHealthModal and hideHealthModal methods and does not display undefined size', () => {
            const filePath = path.resolve(__dirname, '../js/editor/editor-app.js');
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            expect(fileContent).toContain('showHealthModal');
            expect(fileContent).toContain('hideHealthModal');
            // sizeDisplay should not naively interpolate undefined
            expect(fileContent).not.toMatch(/sizeDisplay\.textContent\s*=\s*`\(\$\{report\.checks\.size\.formattedSize\}\)`/);
        });
    });
});
