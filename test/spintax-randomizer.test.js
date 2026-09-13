import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Spintax Dynamic Randomizer Subsystem', () => {
    let dom, window, document, VariableManager, EmailEditorUtils;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><body><div id="variables-container"></div></body></html>');
        window = dom.window;
        document = dom.window.document;
        global.window = window;
        global.document = document;

        const utilsCode = fs.readFileSync(path.resolve(__dirname, '../shared-utils.js'), 'utf-8');
        dom.window.eval(utilsCode);
        EmailEditorUtils = dom.window.EmailEditorUtils;

        const vmCode = fs.readFileSync(path.resolve(__dirname, '../js/editor/variable-manager.js'), 'utf-8');
        dom.window.eval(vmCode);
        VariableManager = dom.window.VariableManager;
    });

    it('exports spintax helper methods on VariableManager and EmailEditorUtils', () => {
        expect(typeof VariableManager.spinSingleBrace).toBe('function');
        expect(typeof VariableManager.countSpintaxVariations).toBe('function');
        expect(typeof VariableManager.spinText).toBe('function');
        expect(typeof EmailEditorUtils.spinText).toBe('function');
        expect(typeof EmailEditorUtils.countSpintaxVariations).toBe('function');
    });

    it('resolves standard single-brace spintax {A|B|C} predictably with randomFn', () => {
        const text = 'Hello {friend|colleague|partner}!';
        
        // Pick 1st choice (0.0 -> index 0)
        const choice1 = VariableManager.spinSingleBrace(text, () => 0.0);
        expect(choice1).toBe('Hello friend!');

        // Pick 2nd choice (0.4 -> index 1)
        const choice2 = VariableManager.spinSingleBrace(text, () => 0.4);
        expect(choice2).toBe('Hello colleague!');

        // Pick 3rd choice (0.9 -> index 2)
        const choice3 = VariableManager.spinSingleBrace(text, () => 0.9);
        expect(choice3).toBe('Hello partner!');
    });

    it('resolves nested single-brace spintax {Good {morning|afternoon}|Hello}', () => {
        const nested = '{Good {morning|afternoon}|Hi} there!';

        // Pick first branch ("Good {morning|afternoon}"), then first sub-branch ("morning")
        const resMorning = VariableManager.spinSingleBrace(nested, () => 0.0);
        expect(resMorning).toBe('Good morning there!');

        // Pick second branch ("Hi")
        const resHi = VariableManager.spinSingleBrace(nested, () => 0.9);
        expect(resHi).toBe('Hi there!');
    });

    it('counts combination variations accurately', () => {
        const template = '{{Hi|Hey|Hello}} {{full_name}}, {Thanks|Regards|Best}!';
        // 3 greetings * 3 sign-offs = 9 combinations
        const count = VariableManager.countSpintaxVariations(template);
        expect(count).toBe(9);

        const singleVar = 'Hello {{full_name|there}}, welcome!';
        expect(VariableManager.countSpintaxVariations(singleVar)).toBe(1);
    });

    it('resolves double-curly spintax {{Hi|Hey|Hello}} with randomizeSpintax: true', () => {
        const template = '{{Hi|Hey|Hello}} {{full_name}}!';
        const variables = new Map([['full_name', 'Rahul']]);

        // When not randomized, keeps default first item
        const def = VariableManager.replaceVariables(template, variables, { wrapPills: false, randomizeSpintax: false });
        expect(def).toBe('Hi Rahul!');

        // When randomized with mock returning index 1 ("Hey")
        const randHey = VariableManager.replaceVariables(template, variables, { 
            wrapPills: false, 
            randomizeSpintax: true, 
            randomFn: () => 0.4 
        });
        expect(randHey).toBe('Hey Rahul!');

        // When randomized with mock returning index 2 ("Hello")
        const randHello = VariableManager.replaceVariables(template, variables, { 
            wrapPills: false, 
            randomizeSpintax: true, 
            randomFn: () => 0.9 
        });
        expect(randHello).toBe('Hello Rahul!');
    });

    it('randomizes subject line spintax via replaceSubjectVariables', () => {
        const subject = 'Quick question for {{company_name}}: {Call|Meeting|Chat}?';
        const variables = new Map([['company_name', 'Stripe']]);

        const subj1 = VariableManager.replaceSubjectVariables(subject, variables, {
            randomizeSpintax: true,
            randomFn: () => 0.0
        });
        expect(subj1).toBe('Quick question for Stripe: Call?');

        const subj2 = VariableManager.replaceSubjectVariables(subject, variables, {
            randomizeSpintax: true,
            randomFn: () => 0.9
        });
        expect(subj2).toBe('Quick question for Stripe: Chat?');
    });
});
