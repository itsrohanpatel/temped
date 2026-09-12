/**
 * TempEd Pro - Modal Controller
 * Manages modal lifecycles (pre-flight, health, starters, link prompt, help) and toast notifications.
 */

export class ModalController {
    constructor() {
        this.linkResolver = null;
        this.toastTimer = null;
        this.initLinkModalEvents();
    }

    openModal(modalId) {
        const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeModal(modalId) {
        const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    toggleModal(modalId, force) {
        const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
        if (modal) {
            const shouldOpen = force !== undefined ? force : modal.classList.contains('hidden');
            if (shouldOpen) {
                this.openModal(modal);
            } else {
                this.closeModal(modal);
            }
        }
    }

    bindModalBackdrops(modalIds = []) {
        modalIds.forEach(id => {
            const modal = typeof id === 'string' ? document.getElementById(id) : id;
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modal);
                    }
                });
            }
        });
    }

    showToast(message, type = 'info', duration = 3000) {
        const notification = document.getElementById('notification');
        const textEl = document.getElementById('notification-text');
        const iconEl = document.getElementById('notification-icon');

        if (!notification) return;

        if (textEl) textEl.textContent = message;

        // Reset classes
        notification.className = 'fixed top-16 right-6 text-white px-4 py-2.5 rounded-xl shadow-xl font-semibold flex items-center gap-2 transform transition-all duration-300 z-[60] text-xs';

        let iconClass = 'fa-info-circle';
        if (type === 'success') {
            notification.classList.add('bg-emerald-600');
            iconClass = 'fa-check-circle';
        } else if (type === 'error') {
            notification.classList.add('bg-rose-600');
            iconClass = 'fa-exclamation-circle';
        } else if (type === 'warning') {
            notification.classList.add('bg-amber-600');
            iconClass = 'fa-exclamation-triangle';
        } else {
            notification.classList.add('bg-indigo-600');
        }

        if (iconEl) {
            iconEl.className = `fas ${iconClass}`;
        }

        notification.classList.remove('hidden');
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';

        if (this.toastTimer) {
            clearTimeout(this.toastTimer);
        }

        this.toastTimer = setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(12px)';
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 300);
        }, duration);
    }

    initLinkModalEvents() {
        const confirmBtn = document.getElementById('confirm-link-btn');
        const cancelBtn = document.getElementById('cancel-link-btn');
        const closeBtn = document.getElementById('close-link-modal');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const urlInput = document.getElementById('link-url-input');
                const textInput = document.getElementById('link-text-input');
                const targetCheckbox = document.getElementById('link-new-tab');

                const data = {
                    url: urlInput ? urlInput.value.trim() : '',
                    text: textInput ? textInput.value.trim() : '',
                    targetBlank: targetCheckbox ? targetCheckbox.checked : true
                };

                this.closeModal('link-modal');
                if (this.linkResolver) {
                    this.linkResolver(data);
                    this.linkResolver = null;
                }
            });
        }

        const handleCancel = () => {
            this.closeModal('link-modal');
            if (this.linkResolver) {
                this.linkResolver(null);
                this.linkResolver = null;
            }
        };

        if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
        if (closeBtn) closeBtn.addEventListener('click', handleCancel);
    }

    promptLink(initialData = {}) {
        return new Promise((resolve) => {
            this.linkResolver = resolve;

            const urlInput = document.getElementById('link-url-input');
            const textInput = document.getElementById('link-text-input');
            const targetCheckbox = document.getElementById('link-new-tab');

            if (urlInput) urlInput.value = initialData.url || '';
            if (textInput) textInput.value = initialData.text || '';
            if (targetCheckbox) targetCheckbox.checked = initialData.targetBlank !== false;

            this.openModal('link-modal');
            if (urlInput) urlInput.focus();
        });
    }
}

if (typeof window !== 'undefined') {
    window.ModalController = ModalController;
}
