import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsManager } from '../js/settings/settings-manager.js';

describe('SettingsManager', () => {
    let settings;

    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <input id="gemini-api-key" />
            <textarea id="system-prompt"></textarea>
            <select id="ai-model"><option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option></select>
            <input id="num-subjects" />
            <input type="radio" name="temp-mode" value="normal" checked />
            <input type="radio" name="temp-mode" value="advanced" />
            <div id="normal-temp-container"></div>
            <div id="advanced-temp-container" class="hidden"></div>
            <input id="ai-temperature" value="1.0" />
            <span id="temperature-value">1.0</span>

            <input id="ai-temperature-optimize" value="1.0" />
            <span id="temperature-value-optimize">1.0</span>
            <input id="ai-temperature-suggest" value="1.0" />
            <span id="temperature-value-suggest">1.0</span>
            <input id="ai-temperature-tone" value="1.0" />
            <span id="temperature-value-tone">1.0</span>
            <input id="ai-temperature-subject" value="1.0" />
            <span id="temperature-value-subject">1.0</span>
            <input id="ai-temperature-rewrite" value="1.0" />
            <span id="temperature-value-rewrite">1.0</span>

            <textarea id="prompt-optimize"></textarea>
            <textarea id="prompt-suggest"></textarea>
            <textarea id="prompt-tone"></textarea>
            <textarea id="prompt-subject"></textarea>
            <textarea id="prompt-rewrite"></textarea>

            <div id="custom-spam-words-list"></div>
            <input id="new-spam-word" />
            <select id="new-spam-category"><option value="urgency">urgency</option></select>
            <button id="add-spam-word-btn"></button>

            <textarea id="signature-html"></textarea>
            <div id="signature-preview"></div>
            <button id="save-signature"></button>
            <button id="clear-signature"></button>
            <button id="insert-signature-to-editor"></button>

            <button id="save-ai-config"></button>
            <button id="toggle-api-key"></button>
            <button id="save-prompt-templates"></button>
            <button id="reset-prompt-templates"></button>
            <button id="reset-all-settings"></button>
            <div id="notification" style="display: none;"></div>
        `;

        window.confirm = vi.fn().mockReturnValue(true);
        settings = new SettingsManager();
    });

    it('should load default configuration into form elements', () => {
        settings.loadSettings();
        expect(document.getElementById('ai-model').value).toBe('gemini-2.5-flash-lite');
        expect(document.getElementById('num-subjects').value).toBe('10');
        expect(document.getElementById('prompt-optimize').value).toContain('{content}');
    });

    it('should save AI configuration to localStorage', () => {
        document.getElementById('gemini-api-key').value = 'secret-test-key';
        document.getElementById('system-prompt').value = 'Custom instructions';
        document.getElementById('num-subjects').value = '5';
        document.getElementById('ai-temperature').value = '0.4';

        settings.saveAIConfig();

        expect(localStorage.getItem('gemini-api-key')).toBe('secret-test-key');
        expect(localStorage.getItem('system-prompt')).toBe('Custom instructions');
        expect(localStorage.getItem('num-subjects')).toBe('5');
        expect(localStorage.getItem('ai-temperature')).toBe('0.4');
    });

    it('should manage custom spam words', () => {
        document.getElementById('new-spam-word').value = 'miracle guarantee';
        document.getElementById('new-spam-category').value = 'urgency';

        settings.addCustomSpamWord();

        const words = JSON.parse(localStorage.getItem('custom-spam-words') || '[]');
        expect(words).toHaveLength(1);
        expect(words[0].word).toBe('miracle guarantee');
        expect(words[0].category).toBe('urgency');
    });

    it('should save and clear email signature', () => {
        document.getElementById('signature-html').value = '<p>Best Regards,<br>John</p>';
        settings.saveSignature();
        expect(localStorage.getItem('email-signature')).toBe('<p>Best Regards,<br>John</p>');

        settings.clearSignature();
        expect(localStorage.getItem('email-signature')).toBeNull();
        expect(document.getElementById('signature-html').value).toBe('');
    });

    it('should reset all settings when confirmed', () => {
        window.confirm = vi.fn().mockReturnValue(true);
        localStorage.setItem('gemini-api-key', 'old-key');
        localStorage.setItem('email-signature', 'old-sig');

        settings.resetAllSettings();

        expect(localStorage.getItem('gemini-api-key')).toBeNull();
        expect(localStorage.getItem('email-signature')).toBeNull();
    });
});
