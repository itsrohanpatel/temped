import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalController } from '../js/editor/modal-controller.js';

describe('ModalController', () => {
    let controller;
    let container;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="preflight-modal" class="hidden"></div>
            <button id="open-preflight-btn"></button>
            <button id="close-preflight-modal"></button>
            <button id="close-preflight-btn"></button>

            <div id="health-modal" class="hidden"></div>
            <button id="close-health-modal"></button>
            <button id="health-modal-ok-btn"></button>

            <div id="starter-templates-modal" class="hidden"></div>
            <button id="close-starters-modal"></button>
            <button id="close-starters-btn"></button>

            <div id="link-modal" class="hidden">
                <input id="link-url-input" value="" />
                <input id="link-text-input" value="" />
                <input id="link-new-tab" type="checkbox" />
            </div>
            <button id="close-link-modal"></button>
            <button id="cancel-link-btn"></button>
            <button id="confirm-link-btn"></button>

            <div id="help-modal" class="hidden"></div>
            <button id="close-help"></button>

            <div id="notification" class="hidden">
                <span id="notification-text"></span>
                <i id="notification-icon"></i>
            </div>
        `;

        controller = new ModalController();
    });

    it('should open and close modals by ID', () => {
        controller.openModal('help-modal');
        expect(document.getElementById('help-modal').classList.contains('hidden')).toBe(false);

        controller.closeModal('help-modal');
        expect(document.getElementById('help-modal').classList.contains('hidden')).toBe(true);
    });

    it('should show toast notifications with custom types', () => {
        vi.useFakeTimers();
        controller.showToast('Test Message', 'success');

        const toast = document.getElementById('notification');
        const text = document.getElementById('notification-text');
        expect(toast.classList.contains('hidden')).toBe(false);
        expect(text.textContent).toBe('Test Message');

        vi.advanceTimersByTime(3500);
        expect(toast.classList.contains('hidden')).toBe(true);
        vi.useRealTimers();
    });

    it('should support link modal open with initial values and resolve on confirm', async () => {
        const linkPromise = controller.promptLink({ url: 'https://example.com', text: 'Example', targetBlank: true });
        
        const urlInput = document.getElementById('link-url-input');
        const textInput = document.getElementById('link-text-input');
        const targetCheckbox = document.getElementById('link-new-tab');

        expect(urlInput.value).toBe('https://example.com');
        expect(textInput.value).toBe('Example');
        expect(targetCheckbox.checked).toBe(true);
        expect(document.getElementById('link-modal').classList.contains('hidden')).toBe(false);

        // User edits and clicks confirm
        urlInput.value = 'https://updated.com';
        document.getElementById('confirm-link-btn').click();

        const result = await linkPromise;
        expect(result).toEqual({
            url: 'https://updated.com',
            text: 'Example',
            targetBlank: true
        });
        expect(document.getElementById('link-modal').classList.contains('hidden')).toBe(true);
    });

    it('should resolve null when link modal is cancelled', async () => {
        const linkPromise = controller.promptLink();
        document.getElementById('cancel-link-btn').click();

        const result = await linkPromise;
        expect(result).toBeNull();
        expect(document.getElementById('link-modal').classList.contains('hidden')).toBe(true);
    });

    it('should attach backdrop click to close active modal', () => {
        const modal = document.getElementById('preflight-modal');
        controller.bindModalBackdrops(['preflight-modal', 'health-modal']);

        controller.openModal('preflight-modal');
        expect(modal.classList.contains('hidden')).toBe(false);

        modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(modal.classList.contains('hidden')).toBe(true);
    });
});
