import { describe, it, expect } from 'vitest';
import '../shared-utils.js';

describe('PreFlightInspector Deliverability Checks', () => {
    const PreFlightInspector = window.PreFlightInspector || window.EmailEditorUtils.PreFlightInspector;

    describe('checkHtmlSize (Gmail 102KB clipping check)', () => {
        it('should handle falsy html input', () => {
            const result = PreFlightInspector.checkHtmlSize('');
            expect(result.status).toBe('pass');
            expect(result.sizeKb).toBe(0);
        });

        it('should pass emails well under 95KB', () => {
            const smallHtml = '<html><body><h1>Hello World</h1><p>Normal size email.</p></body></html>';
            const result = PreFlightInspector.checkHtmlSize(smallHtml);
            expect(result.status).toBe('pass');
            expect(result.bytes).toBeGreaterThan(0);
            expect(result.sizeKb).toBeLessThan(95);
            expect(result.message).toContain('Safe');
        });

        it('should warn when email HTML is between 95KB and 102KB', () => {
            // 98KB payload
            const borderHtml = '<html><body>' + 'x'.repeat(98 * 1024) + '</body></html>';
            const result = PreFlightInspector.checkHtmlSize(borderHtml);
            expect(result.status).toBe('warn');
            expect(result.sizeKb).toBeGreaterThanOrEqual(95);
            expect(result.sizeKb).toBeLessThanOrEqual(102);
            expect(result.message).toMatch(/approaching/i);
        });

        it('should fail with clipping alert when email HTML exceeds 102KB', () => {
            // 105KB payload
            const largeHtml = '<html><body>' + 'x'.repeat(105 * 1024) + '</body></html>';
            const result = PreFlightInspector.checkHtmlSize(largeHtml);
            expect(result.status).toBe('fail');
            expect(result.sizeKb).toBeGreaterThan(102);
            expect(result.message).toMatch(/clip/i);
        });
    });

    describe('checkCompliance (CAN-SPAM / GDPR Requirements)', () => {
        it('should return failure when html is falsy', () => {
            const result = PreFlightInspector.checkCompliance('');
            expect(result.status).toBe('fail');
            expect(result.hasUnsubscribe).toBe(false);
        });

        it('should pass when both unsubscribe link and postal address are present', () => {
            const compliantHtml = `
                <div>
                    <p>Great offers inside!</p>
                    <footer>
                        <a href="https://example.com/unsubscribe">Unsubscribe from this list</a>
                        <p>Acme Corp, 100 Innovation Way, Suite 400, San Francisco, CA 94107</p>
                    </footer>
                </div>
            `;
            const result = PreFlightInspector.checkCompliance(compliantHtml);
            expect(result.hasUnsubscribe).toBe(true);
            expect(result.hasPhysicalAddress).toBe(true);
            expect(result.status).toBe('pass');
        });

        it('should recognize template variable tokens for unsubscribe and address', () => {
            const tokenHtml = `
                <div>
                    <p>Welcome!</p>
                    <a href="{{unsubscribe_url}}">Opt out</a>
                    <p>{{company_address}}</p>
                </div>
            `;
            const result = PreFlightInspector.checkCompliance(tokenHtml);
            expect(result.hasUnsubscribe).toBe(true);
            expect(result.hasPhysicalAddress).toBe(true);
            expect(result.status).toBe('pass');
        });

        it('should fail when unsubscribe link is missing', () => {
            const nonCompliantHtml = '<div><p>Buy now!</p><footer>Acme Corp, 100 Main St.</footer></div>';
            const result = PreFlightInspector.checkCompliance(nonCompliantHtml);
            expect(result.hasUnsubscribe).toBe(false);
            expect(result.status).toBe('fail');
            expect(result.message).toMatch(/unsubscribe/i);
        });

        it('should warn when unsubscribe is present but physical address is missing', () => {
            const noAddressHtml = '<div><a href="https://example.com/unsubscribe">Unsubscribe</a></div>';
            const result = PreFlightInspector.checkCompliance(noAddressHtml);
            expect(result.hasUnsubscribe).toBe(true);
            expect(result.hasPhysicalAddress).toBe(false);
            expect(result.status).toBe('warn');
            expect(result.message).toMatch(/postal address/i);
        });
    });

    describe('checkImageAltAttributes', () => {
        it('should return pass when html is empty or falsy', () => {
            const result = PreFlightInspector.checkImageAltAttributes('');
            expect(result.status).toBe('pass');
            expect(result.totalImages).toBe(0);
        });

        it('should pass when all images have non-empty alt text', () => {
            const html = '<div><img src="logo.png" alt="Company Logo"><img src="banner.jpg" alt="Spring Sale"></div>';
            const result = PreFlightInspector.checkImageAltAttributes(html);
            expect(result.status).toBe('pass');
            expect(result.totalImages).toBe(2);
            expect(result.missingAltCount).toBe(0);
        });

        it('should detect images missing alt attribute or having empty alt', () => {
            const html = '<div><img src="logo.png"><img src="icon.png" alt=""><img src="photo.jpg" alt="Valid"><img alt=""></div>';
            const result = PreFlightInspector.checkImageAltAttributes(html);
            expect(result.status).toBe('warn');
            expect(result.totalImages).toBe(4);
            expect(result.missingAltCount).toBe(3);
            expect(result.culprits).toContain('unknown-src');
        });

        it('should pass gracefully when no images are in the email', () => {
            const html = '<p>Just plain text email.</p>';
            const result = PreFlightInspector.checkImageAltAttributes(html);
            expect(result.status).toBe('pass');
            expect(result.totalImages).toBe(0);
        });
    });

    describe('checkLinks', () => {
        it('should return pass when html is empty or falsy', () => {
            const result = PreFlightInspector.checkLinks('');
            expect(result.status).toBe('pass');
            expect(result.totalLinks).toBe(0);
        });

        it('should return pass with no-links message when 0 links exist', () => {
            const result = PreFlightInspector.checkLinks('<p>No links here</p>');
            expect(result.status).toBe('pass');
            expect(result.totalLinks).toBe(0);
            expect(result.message).toContain('No links found');
        });

        it('should detect insecure http:// links and placeholder href="#"', () => {
            const html = `
                <div>
                    <a href="http://insecure-site.com">Click</a>
                    <a href="#">Placeholder</a>
                    <a href="https://secure.com">Secure</a>
                </div>
            `;
            const result = PreFlightInspector.checkLinks(html);
            expect(result.status).toBe('warn');
            expect(result.totalLinks).toBe(3);
            expect(result.insecureCount).toBe(1);
            expect(result.placeholderCount).toBe(1);
        });

        it('should pass when all links are secure https or mailto', () => {
            const html = '<div><a href="https://example.com">Visit</a><a href="mailto:support@example.com">Contact</a></div>';
            const result = PreFlightInspector.checkLinks(html);
            expect(result.status).toBe('pass');
            expect(result.insecureCount).toBe(0);
            expect(result.placeholderCount).toBe(0);
        });
    });

    describe('checkTextToHtmlRatio', () => {
        it('should handle falsy html', () => {
            const result = PreFlightInspector.checkTextToHtmlRatio('');
            expect(result.status).toBe('pass');
            expect(result.ratio).toBe(0);
        });

        it('should warn on low text-to-code ratio with heavy html markup', () => {
            const heavyHtml = '<table><tr><td><div><span>' + '<b>'.repeat(400) + 'A' + '</b>'.repeat(400) + '</span></div></td></tr></table>';
            const result = PreFlightInspector.checkTextToHtmlRatio(heavyHtml);
            expect(result.status).toBe('warn');
            expect(result.ratio).toBeLessThan(15);
        });

        it('should pass on balanced text-to-code ratio', () => {
            const balancedHtml = '<p>' + 'This is regular email content for our subscribers. '.repeat(50) + '</p>';
            const result = PreFlightInspector.checkTextToHtmlRatio(balancedHtml);
            expect(result.status).toBe('pass');
            expect(result.ratio).toBeGreaterThan(15);
        });
    });

    describe('runAllChecks (consolidated inspector report)', () => {
        const compliantHtml = `
            <!DOCTYPE html>
            <html>
            <body>
                <h1>Weekly Digest</h1>
                <img src="https://example.com/logo.png" alt="Logo">
                <p>Read our latest posts: <a href="https://example.com/posts">Blog</a></p>
                <footer>
                    <a href="https://example.com/unsubscribe">Unsubscribe</a>
                    <p>123 Dev Lane, Austin, TX 78701</p>
                </footer>
            </body>
            </html>
        `;

        it('should return a complete health scorecard using positional arguments', () => {
            const subject = 'Your weekly tech update';
            const preheader = 'Hand-curated developer news and engineering insights';
            const report = PreFlightInspector.runAllChecks(subject, preheader, compliantHtml);
            expect(report.verdict).toBe('ready');
            expect(report.overallStatus).toBe('ready');
            expect(report.checks.length).toBeGreaterThanOrEqual(5);
            expect(report.passedChecks).toBeGreaterThanOrEqual(5);
        });

        it('should support object argument signature runAllChecks(html, { subject, preheader })', () => {
            const report = PreFlightInspector.runAllChecks(compliantHtml, {
                subject: 'Your weekly tech update',
                preheader: 'Hand-curated developer news and engineering insights'
            });
            expect(report.verdict).toBe('ready');
            expect(report.checks.size).toBeDefined();
            expect(report.checks.altText).toBeDefined();
            expect(report.checks.find(c => c.id === 'compliance')).toBeUndefined();
        });

        it('should not fail preflight when unsubscribe or postal address is absent (CAN-SPAM removed from preflight)', () => {
            const emailWithoutFooter = '<p>Hi team, here is the sprint review doc: <a href="https://example.com/doc">Review</a></p>';
            const report = PreFlightInspector.runAllChecks('Sprint Review Completed', 'Review notes inside', emailWithoutFooter);
            expect(report.verdict).toBe('ready');
            expect(report.overallStatus).toBe('ready');
            expect(report.checks.find(c => c.id === 'compliance')).toBeUndefined();
        });

        it('should flag empty, short, and overly long subject lines', () => {
            const emptySub = PreFlightInspector.runAllChecks('', 'Preheader', compliantHtml);
            expect(emptySub.checks.find(c => c.id === 'subject').status).toBe('fail');

            const shortSub = PreFlightInspector.runAllChecks('Short', 'Preheader', compliantHtml);
            expect(shortSub.checks.find(c => c.id === 'subject').status).toBe('warn');

            const longSub = PreFlightInspector.runAllChecks('A'.repeat(70), 'Preheader', compliantHtml);
            expect(longSub.checks.find(c => c.id === 'subject').status).toBe('warn');
        });

        it('should flag missing or empty preheader text', () => {
            const noPreheader = PreFlightInspector.runAllChecks('Valid Subject Line Here', '', compliantHtml);
            expect(noPreheader.checks.find(c => c.id === 'preheader').status).toBe('warn');
            expect(noPreheader.verdict).toBe('good');
            expect(noPreheader.overallStatus).toBe('warning');
        });

        it('should return needs_attention and overallStatus fail when critical checks fail', () => {
            const nonCompliant = '<p>Broken email</p>';
            const report = PreFlightInspector.runAllChecks('', '', nonCompliant);
            expect(report.verdict).toBe('needs_attention');
            expect(report.overallStatus).toBe('fail');
        });
    });
});
