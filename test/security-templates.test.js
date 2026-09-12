import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

describe('Security and Template Hardening', () => {
    let window, document, EmailEditorUtils;

    beforeEach(() => {
        const dom = new JSDOM('<!DOCTYPE html><html><body><div id="notification"></div></body></html>', {
            runScripts: 'dangerously'
        });
        window = dom.window;
        document = dom.window.document;
        global.window = window;
        global.document = document;

        // Load shared-utils in jsdom environment
        const utilsCode = fs.readFileSync(path.resolve(__dirname, '../shared-utils.js'), 'utf8');
        dom.window.eval(utilsCode);
        EmailEditorUtils = dom.window.EmailEditorUtils;
    });

    describe('EmailEditorUtils.sanitizeHtml', () => {
        it('should sanitize script tags and event handlers from HTML', () => {
            const dirty = '<p>Hello <script>alert("xss")</script><img src=x onerror="alert(1)"> world</p>';
            const clean = EmailEditorUtils.sanitizeHtml(dirty);

            expect(clean).not.toContain('<script>');
            expect(clean).not.toContain('onerror=');
            expect(clean).toContain('<p>Hello');
            expect(clean).toContain('world</p>');
        });

        it('should preserve safe styling, tables, and links in emails', () => {
            const emailHtml = '<div style="color: blue;"><a href="https://example.com">Click</a><table><tr><td>Test</td></tr></table></div>';
            const clean = EmailEditorUtils.sanitizeHtml(emailHtml);

            expect(clean).toContain('href="https://example.com"');
            expect(clean).toContain('<table>');
            expect(clean).toContain('Test');
        });

        it('should call DOMPurify with data-variable and contenteditable attributes when available', () => {
            let capturedOptions = null;
            window.DOMPurify = {
                sanitize: (html, opts) => {
                    capturedOptions = opts;
                    return html;
                }
            };
            const testHtml = '<span data-variable="name" contenteditable="false">John</span>';
            const res = EmailEditorUtils.sanitizeHtml(testHtml);
            expect(res).toBe(testHtml);
            expect(capturedOptions.ADD_ATTR).toContain('data-variable');
            expect(capturedOptions.ADD_ATTR).toContain('contenteditable');
            delete window.DOMPurify;
        });
    });

    describe('EmailEditorUtils.buildWordRegex', () => {
        it('should create regex matching exact word boundaries without over-escaping', () => {
            const regex = EmailEditorUtils.buildWordRegex('free');
            expect(regex.test('This is free now')).toBe(true);
            expect(regex.test('This is carefree now')).toBe(false);
            expect(regex.test('\\bfree\\b')).toBe(false); // Does not expect literal backslashes
        });

        it('should safely escape regex special characters in keyword', () => {
            const regex = EmailEditorUtils.buildWordRegex('$$$ (win!)');
            expect(regex instanceof window.RegExp || regex instanceof RegExp).toBe(true);
            expect(regex.test('You $$$ (win!) here')).toBe(true);
        });
    });

    describe('Templates Library HTML & Rendering', () => {
        it('templates.html should load shared-utils.js and DOMPurify', () => {
            const templatesHtml = fs.readFileSync(path.resolve(__dirname, '../templates.html'), 'utf8');
            expect(templatesHtml).toContain('shared-utils.js');
            expect(templatesHtml).toMatch(/dompurify/i);
        });

        it('templates.html preview should sanitize rendered HTML', () => {
            const templatesHtml = fs.readFileSync(path.resolve(__dirname, '../templates.html'), 'utf8');
            const templateManagerJs = fs.existsSync(path.resolve(__dirname, '../js/templates/template-manager.js'))
                ? fs.readFileSync(path.resolve(__dirname, '../js/templates/template-manager.js'), 'utf8')
                : '';
            const code = templatesHtml + '\n' + templateManagerJs;
            // The assignment to previewRendered.innerHTML should pass through sanitizeHtml or DOMPurify
            expect(code).toMatch(/previewRendered\.innerHTML\s*=\s*(?:window\.EmailEditorUtils\.sanitizeHtml|DOMPurify\.sanitize|sanitize)/);
        });

        it('templates.html templateCard should escape attribute values and IDs', () => {
            const templatesHtml = fs.readFileSync(path.resolve(__dirname, '../templates.html'), 'utf8');
            const templateManagerJs = fs.existsSync(path.resolve(__dirname, '../js/templates/template-manager.js'))
                ? fs.readFileSync(path.resolve(__dirname, '../js/templates/template-manager.js'), 'utf8')
                : '';
            const code = templatesHtml + '\n' + templateManagerJs;
            expect(code).toContain('data-id="${this.escapeAttr(id)}"');
        });
    });

    describe('Settings Page HTML & Custom Spam Words', () => {
        it('settings.html should not contain duplicate id="notification"', () => {
            const settingsHtml = fs.readFileSync(path.resolve(__dirname, '../settings.html'), 'utf8');
            const matches = settingsHtml.match(/id=["']notification["']/g);
            expect(matches).not.toBeNull();
            expect(matches.length).toBe(1);
        });

        it('settings.html should escape custom spam words in DOM to prevent XSS', () => {
            const settingsHtml = fs.readFileSync(path.resolve(__dirname, '../settings.html'), 'utf8');
            const settingsManagerJs = fs.existsSync(path.resolve(__dirname, '../js/settings/settings-manager.js'))
                ? fs.readFileSync(path.resolve(__dirname, '../js/settings/settings-manager.js'), 'utf8')
                : '';
            const code = settingsHtml + '\n' + settingsManagerJs;
            // Check that keyword is escaped rather than raw interpolation
            expect(code).toMatch(/this\.escape(?:Html)?\(word\.(?:keyword|word)\)/);
        });

        it('settings.html should construct regex using single backslash word boundaries', () => {
            const settingsHtml = fs.readFileSync(path.resolve(__dirname, '../settings.html'), 'utf8');
            const settingsManagerJs = fs.existsSync(path.resolve(__dirname, '../js/settings/settings-manager.js'))
                ? fs.readFileSync(path.resolve(__dirname, '../js/settings/settings-manager.js'), 'utf8')
                : '';
            const code = settingsHtml + '\n' + settingsManagerJs;
            // The broken 4-backslash pattern '\\\\b' in code should not be present
            expect(code).not.toContain("'\\\\\\\\b'");
        });
    });
});
