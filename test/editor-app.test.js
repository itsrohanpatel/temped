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
});
