import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('VariableManager Subsystem Tests', () => {
    let dom, window, document, VariableManager;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><body><div id="variables-container"></div></body></html>');
        window = dom.window;
        document = dom.window.document;
        global.window = window;
        global.document = document;

        // Load shared-utils for escapeAttr
        const utilsCode = fs.readFileSync(path.resolve(__dirname, '../shared-utils.js'), 'utf-8');
        dom.window.eval(utilsCode);

        // Load variable-manager.js
        const scriptCode = fs.readFileSync(path.resolve(__dirname, '../js/editor/variable-manager.js'), 'utf-8');
        dom.window.eval(scriptCode);
        VariableManager = dom.window.VariableManager;
    });

    it('exports VariableManager on global window', () => {
        expect(VariableManager).toBeDefined();
        expect(typeof VariableManager.getVariables).toBe('function');
        expect(typeof VariableManager.addVariableRow).toBe('function');
        expect(typeof VariableManager.replaceVariables).toBe('function');
        expect(typeof VariableManager.replaceSubjectVariables).toBe('function');
    });

    it('addVariableRow adds row with escaped attributes and binds change listeners', () => {
        const container = document.getElementById('variables-container');
        const onUpdate = vi.fn();

        VariableManager.addVariableRow(container, 'full"name', 'John "Doe"', onUpdate);
        expect(container.children.length).toBe(1);

        const row = container.children[0];
        const nameInput = row.querySelector('.variable-name');
        const valueInput = row.querySelector('.variable-value');

        expect(nameInput.value).toBe('full"name');
        expect(valueInput.value).toBe('John "Doe"');

        // Test update callback on input
        nameInput.dispatchEvent(new window.Event('input'));
        expect(onUpdate).toHaveBeenCalledTimes(1);

        // Test delete button
        const removeBtn = row.querySelector('.remove-variable-btn');
        removeBtn.click();
        expect(container.children.length).toBe(0);
        expect(onUpdate).toHaveBeenCalledTimes(2);
    });

    it('getVariables extracts map of current variables', () => {
        const container = document.getElementById('variables-container');
        VariableManager.addVariableRow(container, 'user_name', 'Alice');
        VariableManager.addVariableRow(container, 'role', 'Engineer');

        const map = VariableManager.getVariables(container);
        expect(map.get('user_name')).toBe('Alice');
        expect(map.get('role')).toBe('Engineer');
        expect(map.size).toBe(2);
    });

    it('replaceVariables replaces variables with whitespace tolerance and supports pill wrapping', () => {
        const variables = new Map([
            ['first_name', 'Bob'],
            ['company', 'Acme']
        ]);

        const plainHtml = '<p>Hi {{first_name}} at {{  company  }}!</p>';
        const renderedPills = VariableManager.replaceVariables(plainHtml, variables, { wrapPills: true });
        expect(renderedPills).toContain('data-variable="first_name"');
        expect(renderedPills).toContain('Bob');
        expect(renderedPills).toContain('Acme');

        const renderedPlain = VariableManager.replaceVariables(plainHtml, variables, { wrapPills: false });
        expect(renderedPlain).toBe('<p>Hi Bob at Acme!</p>');
    });

    it('replaceSubjectVariables replaces placeholders in subject string', () => {
        const variables = new Map([['discount', '50%']]);
        const subject = 'Your {{ discount }} off coupon';
        expect(VariableManager.replaceSubjectVariables(subject, variables)).toBe('Your 50% off coupon');
    });
});
