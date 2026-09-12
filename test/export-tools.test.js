import { describe, it, expect } from 'vitest';
import '../shared-utils.js';

describe('Email Export Tools and Snippet Generator', () => {
    const EmailExportTools = window.EmailExportTools || window.EmailEditorUtils.EmailExportTools;
    const EmailComponentSnippets = window.EmailComponentSnippets || window.EmailEditorUtils.EmailComponentSnippets;

    describe('EmailExportTools.generatePlainText', () => {
        it('should strip HTML tags and preserve text hierarchy', () => {
            const html = `
                <style>body { color: red; }</style>
                <h1>Welcome to TempEd</h1>
                <p>Build emails faster than ever.</p>
            `;
            const plain = EmailExportTools.generatePlainText(html);
            expect(plain).not.toContain('<style>');
            expect(plain).not.toContain('<h1>');
            expect(plain).toContain('Welcome to TempEd');
            expect(plain).toContain('Build emails faster than ever.');
        });

        it('should convert hyperlinks to Text (URL) format', () => {
            const html = '<p>Check out our <a href="https://example.com/pricing">pricing page</a> today.</p>';
            const plain = EmailExportTools.generatePlainText(html);
            expect(plain).toContain('pricing page (https://example.com/pricing)');
        });

        it('should format unordered lists as bullet points', () => {
            const html = '<ul><li>First item</li><li>Second item</li></ul>';
            const plain = EmailExportTools.generatePlainText(html);
            expect(plain).toMatch(/[*•-]\s+First item/);
            expect(plain).toMatch(/[*•-]\s+Second item/);
        });

        it('should return empty string when html is empty or falsy', () => {
            expect(EmailExportTools.generatePlainText('')).toBe('');
            expect(EmailExportTools.generatePlainText(null)).toBe('');
        });

        it('should handle h3-h6 headings, empty anchor text, and html entities', () => {
            const html = `
                <h3>Subheader Section</h3>
                <h4>Small Subsection</h4>
                <a href="https://example.com/raw-link"></a>
                <p>&amp; &lt; &gt; &quot; &#39; &nbsp;</p>
            `;
            const plain = EmailExportTools.generatePlainText(html);
            expect(plain).toContain('Subheader Section');
            expect(plain).toContain('https://example.com/raw-link');
            expect(plain).toContain('& < > " \'');
        });
    });

    describe('EmailExportTools.generateEml', () => {
        it('should generate valid RFC-822 MIME structure with boundary', () => {
            const eml = EmailExportTools.generateEml({
                subject: 'Test Subject Line',
                html: '<p>Hello from TempEd!</p>',
                from: 'sender@example.com',
                to: 'recipient@example.com'
            });

            expect(eml).toContain('Subject: Test Subject Line');
            expect(eml).toContain('From: sender@example.com');
            expect(eml).toContain('To: recipient@example.com');
            expect(eml).toContain('MIME-Version: 1.0');
            expect(eml).toContain('Content-Type: multipart/alternative;');
            expect(eml).toContain('text/plain');
            expect(eml).toContain('text/html');
            expect(eml).toContain('Hello from TempEd!');
        });

        it('should use default values when options are omitted', () => {
            const eml = EmailExportTools.generateEml({});
            expect(eml).toContain('From: sender@example.com');
            expect(eml).toContain('To: recipient@example.com');
            expect(eml).toContain('Subject: Email Preview');
        });
    });

    describe('EmailComponentSnippets', () => {
        it('should generate Outlook-compatible bulletproof button with MSO conditional comments', () => {
            const buttonHtml = EmailComponentSnippets.getBulletproofButton('Click Here', 'https://example.com');
            expect(buttonHtml).toContain('<!--[if mso]>');
            expect(buttonHtml).toContain('v:roundrect');
            expect(buttonHtml).toContain('https://example.com');
            expect(buttonHtml).toContain('Click Here');
        });

        it('should generate responsive 2-column grid table', () => {
            const gridHtml = EmailComponentSnippets.getTwoColumnGrid('<p>Column 1</p>', '<p>Column 2</p>');
            expect(gridHtml).toContain('<table');
            expect(gridHtml).toContain('Column 1');
            expect(gridHtml).toContain('Column 2');
            expect(gridHtml).toContain('width="100%"');
        });

        it('should generate safe divider snippet', () => {
            const dividerHtml = EmailComponentSnippets.getDivider();
            expect(dividerHtml).toContain('<hr');
            expect(dividerHtml).toContain('border:none');
        });

        it('should generate CAN-SPAM compliant footer snippet with company address', () => {
            const footerHtml = EmailComponentSnippets.getUnsubscribeFooter('Acme Corp', '123 Market St, SF');
            expect(footerHtml).toContain('Acme Corp');
            expect(footerHtml).toContain('123 Market St, SF');
            expect(footerHtml).toMatch(/unsubscribe/i);
        });

        it('should expose convenience getters for all 4 snippets', () => {
            expect(EmailComponentSnippets.bulletproofButton).toContain('<!--[if mso]>');
            expect(EmailComponentSnippets.twoColumnGrid).toContain('<table');
            expect(EmailComponentSnippets.divider).toContain('<hr');
            expect(EmailComponentSnippets.complianceFooter).toMatch(/unsubscribe/i);
        });
    });
});
