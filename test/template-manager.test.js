import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateManager } from '../js/templates/template-manager.js';

describe('TemplateManager', () => {
    let manager;

    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="templates-list"></div>
            <div id="empty-state" class="hidden"></div>
            <div id="preview-modal" class="hidden"></div>
            <div id="preview-title"></div>
            <pre id="preview-html"></pre>
            <div id="preview-rendered"></div>
            <button id="close-preview"></button>
            <button id="seed-starter-templates-btn"></button>
            <button id="empty-seed-btn"></button>
            <div id="notification" class="hidden">
                <span id="notification-text"></span>
            </div>
        `;

        window.EmailEditorUtils = {
            sanitizeHtml: vi.fn((html) => html)
        };

        manager = new TemplateManager();
    });

    it('should load and save templates in localStorage', () => {
        const sample = [{ name: 'Welcome', html: '<p>Welcome</p>', timestamp: '2026-09-12T10:00:00Z' }];
        manager.saveTemplates(sample);

        const retrieved = manager.getTemplates();
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].name).toBe('Welcome');
    });

    it('should show empty state when no templates exist', () => {
        manager.init();
        const emptyState = document.getElementById('empty-state');
        expect(emptyState.classList.contains('hidden')).toBe(false);
    });

    it('should seed starter templates if available', () => {
        window.StarterTemplates = {
            getAll: () => [
                {
                    name: 'Onboarding Email',
                    subject: 'Welcome aboard!',
                    preheader: 'Get started',
                    html: '<p>Hi!</p>',
                    variables: [{ name: 'firstName', defaultValue: 'Alex' }]
                }
            ]
        };

        manager.init();
        manager.seedStarterTemplates();

        const templates = manager.getTemplates();
        expect(templates).toHaveLength(1);
        expect(templates[0].name).toBe('Onboarding Email');
        expect(document.getElementById('empty-state').classList.contains('hidden')).toBe(true);
    });

    it('should delete a template upon confirmation', () => {
        window.confirm = vi.fn().mockReturnValue(true);
        const sample = [{ name: 'To Delete', html: '<p>Bye</p>', timestamp: '12345' }];
        manager.saveTemplates(sample);
        manager.init();

        const deleteBtn = document.querySelector('[data-action="delete"]');
        expect(deleteBtn).toBeTruthy();

        deleteBtn.click();
        expect(manager.getTemplates()).toHaveLength(0);
    });
});
