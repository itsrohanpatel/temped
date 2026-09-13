import { describe, it, expect, beforeEach } from 'vitest';
import '../spam-filter.js';

describe('SpamEngine & Deliverability Health Tests', () => {
    it('initializes window.spamKeywords and window.SpamEngine', () => {
        expect(Array.isArray(window.spamKeywords)).toBe(true);
        expect(window.spamKeywords.length).toBeGreaterThan(100);
        expect(typeof window.SpamEngine).toBe('object');
    });

    describe('Mojibake Currency Regex Fixes', () => {
        it('matches multiple currency symbols correctly without mojibake', () => {
            const moneyKeyword = window.spamKeywords.find(k => k.keyword === '$$$' || k.keyword === '€€€');
            expect(moneyKeyword).toBeDefined();
            // Regex source should not contain Â or â
            expect(moneyKeyword.highlight.source).not.toContain('Â');
            expect(moneyKeyword.highlight.source).not.toContain('â');

            moneyKeyword.highlight.lastIndex = 0;
            expect(moneyKeyword.highlight.test('$$$')).toBe(true);
            moneyKeyword.highlight.lastIndex = 0;
            expect(moneyKeyword.highlight.test('£££')).toBe(true);
            moneyKeyword.highlight.lastIndex = 0;
            expect(moneyKeyword.highlight.test('€€€')).toBe(true);
            moneyKeyword.highlight.lastIndex = 0;
            expect(moneyKeyword.highlight.test('¥¥¥')).toBe(true);
        });

        it('matches "Earn $" for various currencies', () => {
            const earnMoney = window.spamKeywords.find(k => k.keyword === 'Earn $');
            expect(earnMoney).toBeDefined();
            expect(earnMoney.highlight.source).not.toContain('Â');
            expect(earnMoney.highlight.source).not.toContain('â');

            earnMoney.highlight.lastIndex = 0;
            expect(earnMoney.highlight.test('earn $')).toBe(true);
            earnMoney.highlight.lastIndex = 0;
            expect(earnMoney.highlight.test('Earn £')).toBe(true);
            earnMoney.highlight.lastIndex = 0;
            expect(earnMoney.highlight.test('earn €')).toBe(true);
        });
    });

    describe('Deliverability Health Score Calculation', () => {
        const engine = window.SpamEngine;

        it('calculates a high deliverability score for clean professional emails', () => {
            const subject = 'Quick question regarding your hiring strategy';
            const body = `Hi Sarah,
I noticed your team is expanding engineering roles this quarter.
We recently helped Quest Global reduce time-to-hire by 40% with pre-vetted specialists.
Would you be open to a 10-minute introductory call next Tuesday?
Best regards,
Alex
To unsubscribe, please click here: https://example.com/optout`;

            const report = engine.calculateHealthScore(subject, body);
            expect(report.score).toBeGreaterThanOrEqual(80);
            expect(report.grade).toBe('Great');
            expect(report.spamHits).toBe(0);
            expect(report.penalties.length).toBe(0);
        });

        it('penalizes aggressive spam trigger words', () => {
            const subject = 'FREE CASH BONUS FOR YOU TODAY ACT NOW';
            const body = 'Double your wealth 100% free with cash out and instant income. Click now or expire today!';

            const report = engine.calculateHealthScore(subject, body);
            expect(report.score).toBeLessThan(50);
            expect(report.grade).toBe('Poor');
            expect(report.spamHits).toBeGreaterThan(3);
            expect(report.categories).toHaveProperty('money');
            expect(report.categories).toHaveProperty('urgency');
        });

        it('detects and penalizes excessive punctuation and all-caps shouting', () => {
            const subject = 'ATTENTION!!! LIMITED TIME OFFER??? $$$';
            const body = 'ACT NOW! BUY TODAY! DO NOT WAIT! WHY DELAY???';

            const report = engine.calculateHealthScore(subject, body);
            expect(report.allCapsWordsCount).toBeGreaterThan(5);
            expect(report.hasExcessivePunctuation).toBe(true);
            const penalties = report.penalties.map(p => p.type);
            expect(penalties).toContain('all_caps');
            expect(penalties).toContain('excessive_punctuation');
        });

        it('evaluates subject line length recommendations', () => {
            const shortSubj = engine.calculateHealthScore('Hi', 'Valid body content');
            expect(shortSubj.subjectLengthStatus).toBe('too_short');

            const longSubj = engine.calculateHealthScore('This is an extremely long subject line that will definitely get truncated on mobile inboxes because it exceeds sixty characters', 'Valid body');
            expect(longSubj.subjectLengthStatus).toBe('too_long');

            const idealSubj = engine.calculateHealthScore('Invitation: Tech Leadership Roundtable', 'Valid body');
            expect(idealSubj.subjectLengthStatus).toBe('optimal');
        });

        it('detects missing compliance / unsubscribe footer', () => {
            const noOptOut = engine.calculateHealthScore('Meeting follow-up', 'Just checking in on the proposal.');
            expect(noOptOut.hasUnsubscribeFooter).toBe(false);

            const withOptOut = engine.calculateHealthScore('Meeting follow-up', 'Just checking in. Click here to unsubscribe.');
            expect(withOptOut.hasUnsubscribeFooter).toBe(true);
        });

        it('flags non-HTTPS and insecure links', () => {
            const insecure = engine.calculateHealthScore('Check this', 'Visit http://unsecure-site.com/login for details');
            expect(insecure.hasInsecureLinks).toBe(true);

            const secure = engine.calculateHealthScore('Check this', 'Visit https://secure-site.com for details');
            expect(secure.hasInsecureLinks).toBe(false);
        });
    });

    describe('HighlightWithinTextarea Plugin Integrity', () => {
        it('defines handleScroll and blockContainerScroll on prototype without throwing bind errors', () => {
            const fs = require('fs');
            const path = require('path');
            const code = fs.readFileSync(path.resolve(__dirname, '../spam-filter.js'), 'utf-8');
            expect(code).toContain('handleScroll:');
            expect(code).toContain('blockContainerScroll:');
        });
    });
});
