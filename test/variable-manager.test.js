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

    it('extractPlaceholders extracts unique placeholder keys including hyphens, underscores and spintax', () => {
        const text = `{{Hi|Hey|Hello}} {{full_name}}, {{company_name}} {{Thanks|Regards|Best}} {{sender-name}}`;
        const names = VariableManager.extractPlaceholders(text);
        expect(names).toEqual(['Hi', 'full_name', 'company_name', 'Thanks', 'sender-name']);
    });

    it('extractVariableDefinitions returns structured tokens with defaultValue and options', () => {
        const text = `{{Hi|Hey|Hello}} {{full_name}}, {{company_name}} - {{Thanks|Regards|Best}}, {{sender-name}} {{first_name|there}}`;
        const defs = VariableManager.extractVariableDefinitions(text);
        expect(defs).toEqual([
            {
                token: '{{Hi|Hey|Hello}}',
                name: 'Hi',
                defaultValue: 'Hi',
                options: ['Hi', 'Hey', 'Hello']
            },
            {
                token: '{{full_name}}',
                name: 'full_name',
                defaultValue: '',
                options: []
            },
            {
                token: '{{company_name}}',
                name: 'company_name',
                defaultValue: '',
                options: []
            },
            {
                token: '{{Thanks|Regards|Best}}',
                name: 'Thanks',
                defaultValue: 'Thanks',
                options: ['Thanks', 'Regards', 'Best']
            },
            {
                token: '{{sender-name}}',
                name: 'sender-name',
                defaultValue: '',
                options: []
            },
            {
                token: '{{first_name|there}}',
                name: 'first_name',
                defaultValue: 'there',
                options: ['there']
            }
        ]);
    });

    it('replaceVariables resolves spintax and fallbacks to default option when unset in map', () => {
        const text = '{{Hi|Hey|Hello}} {{full_name}}, {{Thanks|Regards|Best}} {{sender-name}}';
        const variables = new Map([
            ['full_name', 'Rahul'],
            ['sender-name', 'Rohan Patel']
        ]);

        const rendered = VariableManager.replaceVariables(text, variables, { wrapPills: false });
        expect(rendered).toBe('Hi Rahul, Thanks Rohan Patel');
    });

    it('replaceVariables uses mapped value if set for spintax variable', () => {
        const text = '{{Hi|Hey|Hello}} {{full_name}}!';
        const variables = new Map([
            ['Hi', 'Hey'],
            ['full_name', 'Rahul']
        ]);

        const rendered = VariableManager.replaceVariables(text, variables, { wrapPills: false });
        expect(rendered).toBe('Hey Rahul!');
    });

    it('replaceVariables includes data-original-token attribute when wrapPills is true', () => {
        const text = '{{Hi|Hey|Hello}} {{sender-name}}';
        const variables = new Map([['sender-name', 'Alice']]);

        const rendered = VariableManager.replaceVariables(text, variables, { wrapPills: true });
        expect(rendered).toContain('data-original-token="{{Hi|Hey|Hello}}"');
        expect(rendered).toContain('data-variable="Hi"');
        expect(rendered).toContain('>Hi</span>');
        expect(rendered).toContain('data-original-token="{{sender-name}}"');
        expect(rendered).toContain('data-variable="sender-name"');
        expect(rendered).toContain('>Alice</span>');
    });

    it('replaceSubjectVariables resolves spintax and fallbacks correctly', () => {
        const subject = '{{Hi|Hey}} {{full_name}} - inquiry for {{company_name}}';
        const variables = new Map([
            ['full_name', 'Rahul'],
            ['company_name', 'Infosys']
        ]);
        expect(VariableManager.replaceSubjectVariables(subject, variables)).toBe('Hi Rahul - inquiry for Infosys');
    });

    it('does NOT double-replace or corrupt attributes when multiple variables are in Map', () => {
        const text = '{{Hi|Hey|Hello}} {{full_name}}, I saw {{company_name}} is hiring. {{Thanks|Regards|Best}}, {{sender-name}}';
        const variables = new Map([
            ['Hi', 'Hi'],
            ['full_name', 'Rahul'],
            ['company_name', 'Infosys'],
            ['Thanks', 'Thanks'],
            ['sender-name', 'Rohan Patel']
        ]);

        const rendered = VariableManager.replaceVariables(text, variables, { wrapPills: true });
        // Must NOT leak quote or contenteditable outside tag
        expect(rendered).not.toContain('Rahul" contenteditable="false">Rahul');
        expect(rendered).not.toContain('Infosys" contenteditable="false">Infosys');
        expect(rendered).not.toContain('Rohan Patel" contenteditable="false">Rohan Patel');

        // Check each span is well-formed
        expect(rendered).toContain('data-variable="full_name" data-original-token="{{full_name}}" contenteditable="false">Rahul</span>');
        expect(rendered).toContain('data-variable="company_name" data-original-token="{{company_name}}" contenteditable="false">Infosys</span>');
        expect(rendered).toContain('data-variable="sender-name" data-original-token="{{sender-name}}" contenteditable="false">Rohan Patel</span>');
    });

    it('parseBulkVariables correctly parses comma-separated, newline, and key-value formats', () => {
        const raw = `
            first_name=Alex
            last_name="Taylor"
            company: Acme Corp
            role = Head of Growth
            email, phone, address
            {{meeting_link}}
            first_name=Duplicate
        `;
        const parsed = VariableManager.parseBulkVariables(raw);
        expect(parsed).toEqual([
            { name: 'first_name', value: 'Alex' },
            { name: 'last_name', value: 'Taylor' },
            { name: 'company', value: 'Acme Corp' },
            { name: 'role', value: 'Head of Growth' },
            { name: 'email', value: '' },
            { name: 'phone', value: '' },
            { name: 'address', value: '' },
            { name: 'meeting_link', value: '' }
        ]);
    });

    it('bulkAddVariables adds rows to container and triggers update callback', () => {
        const container = document.getElementById('variables-container');
        const onUpdate = vi.fn();

        const raw = 'candidate_name=Sarah, role=Senior Engineer, date=Tomorrow';
        const res = VariableManager.bulkAddVariables(container, raw, onUpdate);

        expect(res.added).toBe(3);
        expect(res.total).toBe(3);
        expect(container.children.length).toBe(3);
        expect(onUpdate).toHaveBeenCalled();

        const vars = VariableManager.getVariables(container);
        expect(vars.get('candidate_name')).toBe('Sarah');
        expect(vars.get('role')).toBe('Senior Engineer');
        expect(vars.get('date')).toBe('Tomorrow');

        // Test duplicate protection & empty value updating
        const updateRaw = 'candidate_name=Other, date=UpdatedDate, new_var=123';
        const res2 = VariableManager.bulkAddVariables(container, updateRaw, onUpdate);
        expect(res2.added).toBe(1); // only new_var added
        expect(container.children.length).toBe(4);
    });

    it('filterVariableMatches returns matching suggestions for autocomplete queries', () => {
        const currentVars = new Map([
            ['user_name', 'Alice'],
            ['company_name', 'TechCorp']
        ]);

        // Query matching active variable
        const matchesUser = VariableManager.filterVariableMatches('user', currentVars);
        expect(matchesUser.some(m => m.name === 'user_name' && m.type === 'active')).toBe(true);

        // Query matching standard variable
        const matchesFirst = VariableManager.filterVariableMatches('first', currentVars);
        expect(matchesFirst.some(m => m.name === 'first_name' && m.type === 'standard')).toBe(true);

        // Query matching spintax
        const matchesSpin = VariableManager.filterVariableMatches('spin', currentVars);
        expect(matchesSpin.some(m => m.type === 'spintax')).toBe(true);
    });
});

