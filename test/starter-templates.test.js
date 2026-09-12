import { describe, it, expect } from 'vitest';
import '../shared-utils.js';

describe('Starter Templates Library', () => {
    const StarterTemplates = window.StarterTemplates || window.EmailEditorUtils.StarterTemplates;

    it('should provide exactly 6 curated starter templates', () => {
        const all = StarterTemplates.getAll();
        expect(all.length).toBe(6);
    });

    it('should include all required categories: onboarding, marketing, transactional, newsletter', () => {
        const expectedIds = ['welcome', 'announcement', 'newsletter', 'password_reset', 'receipt', 'webinar'];
        const all = StarterTemplates.getAll();
        const ids = all.map(t => t.id);
        expectedIds.forEach(id => {
            expect(ids).toContain(id);
        });
    });

    it('each template should have complete metadata and valid HTML', () => {
        StarterTemplates.getAll().forEach(template => {
            expect(template.id).toBeTruthy();
            expect(template.name).toBeTruthy();
            expect(template.subject).toBeTruthy();
            expect(template.html).toBeTruthy();
            expect(template.html).toContain('<table');
            expect(Array.isArray(template.variables)).toBe(true);
            expect(template.variables.length).toBeGreaterThan(0);
        });
    });

    it('getTemplate should retrieve template by id and return fallback if not found', () => {
        const welcome = StarterTemplates.getTemplate('welcome');
        expect(welcome).not.toBeNull();
        expect(welcome.name).toMatch(/welcome|onboarding/i);

        const nonexistent = StarterTemplates.getTemplate('unknown-id');
        expect(nonexistent).toBeNull();
    });

    it('welcome template should contain variable placeholders with fallback syntax', () => {
        const welcome = StarterTemplates.getTemplate('welcome');
        expect(welcome.html).toMatch(/\{\{first_name(?:\|[^{}]+)?\}\}/);
    });

    it('receipt template should contain itemized table and order variables', () => {
        const receipt = StarterTemplates.getTemplate('receipt');
        expect(receipt.html).toMatch(/\{\{order_id(?:\|[^{}]+)?\}\}/);
        expect(receipt.html).toContain('Total');
    });

    it('getById should delegate to getTemplate', () => {
        expect(StarterTemplates.getById('welcome')).toEqual(StarterTemplates.getTemplate('welcome'));
        expect(StarterTemplates.getById('nonexistent')).toBeNull();
    });

    it('all templates should be safe from unescaped script injections', () => {
        StarterTemplates.getAll().forEach(template => {
            expect(template.html).not.toMatch(/<script\b/i);
            expect(template.html).not.toMatch(/\bonerror\s*=/i);
        });
    });
});
