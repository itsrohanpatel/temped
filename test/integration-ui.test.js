import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('TempEd Pro Production Suite UI Integration Tests', () => {
    const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');
    const templatesHtml = fs.readFileSync(path.resolve(__dirname, '../templates.html'), 'utf-8');
    const sharedStylesCss = fs.readFileSync(path.resolve(__dirname, '../shared-styles.css'), 'utf-8');

    describe('Security and Hardening in index.html', () => {
        it('includes DOMPurify script in <head>', () => {
            expect(indexHtml).toMatch(/<script\s+src="[^"]*dompurify[^"]*"/i);
        });

        it('escapes attributes in addVariableRow', () => {
            expect(indexHtml).toMatch(/safeName\s*=.*EmailEditorUtils\.escapeAttr/);
            expect(indexHtml).toMatch(/safeValue\s*=.*EmailEditorUtils\.escapeAttr/);
        });

        it('sanitizes formatted HTML in showAIResponse', () => {
            expect(indexHtml).toMatch(/sanitizedHTML\s*=.*EmailEditorUtils\.sanitizeHtml/);
            expect(indexHtml).toMatch(/ai-content['"]\)\.innerHTML\s*=\s*sanitizedHTML/);
        });
    });

    describe('Pre-Flight Deliverability Inspector UI Integration', () => {
        it('includes Pre-Flight button in editor preview header', () => {
            expect(indexHtml).toContain('id="preflight-inspector-btn"');
            expect(indexHtml).toMatch(/preflight-inspector-btn[\s\S]*?Pre-Flight/);
        });

        it('includes preflight-modal with all 5 check cards and summary banner', () => {
            expect(indexHtml).toContain('id="preflight-modal"');
            expect(indexHtml).toContain('id="preflight-checks-ratio"');
            expect(indexHtml).toContain('id="preflight-overall-badge"');
            expect(indexHtml).toContain('id="preflight-check-size"');
            expect(indexHtml).toContain('id="preflight-check-compliance"');
            expect(indexHtml).toContain('id="preflight-check-alt"');
            expect(indexHtml).toContain('id="preflight-check-links"');
            expect(indexHtml).toContain('id="preflight-check-ratio"');
            expect(indexHtml).toContain('id="preflight-insert-footer-btn"');
            expect(indexHtml).toContain('id="preflight-rerun-btn"');
        });

        it('defines preflight inspection methods in EmailEditor', () => {
            expect(indexHtml).toContain('runPreflightInspection()');
            expect(indexHtml).toContain('showPreflightModal()');
            expect(indexHtml).toContain('hidePreflightModal()');
            expect(indexHtml).toContain('insertComplianceFooter()');
        });
    });

    describe('Component Inserter UI Integration', () => {
        it('includes component inserter select in toolbar with bulletproof options', () => {
            expect(indexHtml).toContain('id="insert-component-select"');
            expect(indexHtml).toContain('value="bulletproofButton"');
            expect(indexHtml).toContain('value="twoColumnGrid"');
            expect(indexHtml).toContain('value="divider"');
            expect(indexHtml).toContain('value="complianceFooter"');
        });

        it('defines insertComponent handler in EmailEditor', () => {
            expect(indexHtml).toContain('insertComponent(componentKey)');
            expect(indexHtml).toMatch(/window\.EmailComponentSnippets\[componentKey\]/);
        });
    });

    describe('Starter Templates Gallery UI Integration', () => {
        it('includes starter templates buttons in navbar and variable pills', () => {
            expect(indexHtml).toContain('id="starter-templates-btn"');
            expect(indexHtml).toContain('id="starter-gallery-btn"');
        });

        it('includes starter-templates-modal and grid in index.html', () => {
            expect(indexHtml).toContain('id="starter-templates-modal"');
            expect(indexHtml).toContain('id="starter-templates-grid"');
        });

        it('defines gallery modal and template loading methods in EmailEditor', () => {
            expect(indexHtml).toContain('showStarterTemplatesModal()');
            expect(indexHtml).toContain('hideStarterTemplatesModal()');
            expect(indexHtml).toContain('renderStarterTemplatesModal()');
            expect(indexHtml).toContain('loadStarterTemplate(templateId)');
        });
    });

    describe('Export Suite UI Integration', () => {
        it('includes export dropdown button and options in HTML code header', () => {
            expect(indexHtml).toContain('id="export-dropdown-container"');
            expect(indexHtml).toContain('id="export-menu-btn"');
            expect(indexHtml).toContain('id="export-dropdown-menu"');
            expect(indexHtml).toContain('id="export-html-btn"');
            expect(indexHtml).toContain('id="export-txt-btn"');
            expect(indexHtml).toContain('id="export-eml-btn"');
            expect(indexHtml).toContain('id="copy-rendered-btn"');
        });

        it('defines export methods for HTML, TXT, EML, and rendered clipboard', () => {
            expect(indexHtml).toContain('exportHtmlFile()');
            expect(indexHtml).toContain('exportTxtFile()');
            expect(indexHtml).toContain('exportEmlFile()');
            expect(indexHtml).toContain('copyRenderedToClipboard()');
        });
    });

    describe('Starter Templates in templates.html Library', () => {
        it('includes seed starter templates buttons in templates.html', () => {
            expect(templatesHtml).toContain('id="seed-starter-templates-btn"');
            expect(templatesHtml).toContain('id="empty-seed-btn"');
        });

        it('defines seedStarterTemplates in TemplateManager on templates.html', () => {
            expect(templatesHtml).toContain('seedStarterTemplates()');
            expect(templatesHtml).toMatch(/window\.StarterTemplates\.getAll/);
        });
    });

    describe('Status Pill CSS Classes in shared-styles.css', () => {
        it('defines pass, warn, and fail status pill styles', () => {
            expect(sharedStylesCss).toContain('.status-pill-pass');
            expect(sharedStylesCss).toContain('.status-pill-warn');
            expect(sharedStylesCss).toContain('.status-pill-fail');
        });
    });
});
