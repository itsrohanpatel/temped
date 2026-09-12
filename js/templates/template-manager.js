/**
 * TempEd Pro - Template Manager Module
 * Manages email template library, previews, exports, and starter template seeding.
 */

export class TemplateManager {
    constructor() {
        this.container = null;
        this.empty = null;
        this.modal = null;
        this.previewTitle = null;
        this.previewHtml = null;
        this.previewRendered = null;
    }

    init() {
        this.container = document.getElementById('templates-list');
        this.empty = document.getElementById('empty-state');
        this.modal = document.getElementById('preview-modal');
        this.previewTitle = document.getElementById('preview-title');
        this.previewHtml = document.getElementById('preview-html');
        this.previewRendered = document.getElementById('preview-rendered');
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        const closeBtn = document.getElementById('close-preview');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggleModal(false));
        }

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.toggleModal(false);
            });
        }

        const seedBtn = document.getElementById('seed-starter-templates-btn');
        if (seedBtn) seedBtn.addEventListener('click', () => this.seedStarterTemplates());

        const emptySeedBtn = document.getElementById('empty-seed-btn');
        if (emptySeedBtn) emptySeedBtn.addEventListener('click', () => this.seedStarterTemplates());
    }

    seedStarterTemplates() {
        if (typeof window === 'undefined' || !window.StarterTemplates) return;
        const existing = this.getTemplates();
        const existingNames = new Set(existing.map(t => (t.name || '').toLowerCase()));
        const starters = window.StarterTemplates.getAll();
        let addedCount = 0;

        starters.forEach((s, idx) => {
            if (!existingNames.has(s.name.toLowerCase())) {
                existing.push({
                    name: s.name,
                    subject: s.subject,
                    preheader: s.preheader,
                    html: s.html,
                    variables: s.variables.map(v => ({ name: v.name, value: v.defaultValue })),
                    timestamp: new Date(Date.now() - idx * 60000).toISOString()
                });
                addedCount++;
            }
        });

        this.saveTemplates(existing);
        this.render();
        if (addedCount > 0) {
            this.notify(`Successfully loaded ${addedCount} starter templates!`);
        } else {
            this.notify('All starter templates are already in your library.');
        }
    }

    getTemplates() {
        try {
            if (typeof localStorage === 'undefined') return [];
            return JSON.parse(localStorage.getItem('emailTemplates') || '[]');
        } catch (_) {
            return [];
        }
    }

    saveTemplates(list) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('emailTemplates', JSON.stringify(list));
        }
    }

    render() {
        if (!this.container) return;
        const templates = this.getTemplates().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

        if (!templates.length) {
            this.container.innerHTML = '';
            if (this.empty) this.empty.classList.remove('hidden');
            return;
        }

        if (this.empty) this.empty.classList.add('hidden');
        this.container.innerHTML = templates.map((t) => this.templateCard(t)).join('');

        this.container.querySelectorAll('[data-action="use"]').forEach(btn => btn.addEventListener('click', (e) => this.useTemplate(e)));
        this.container.querySelectorAll('[data-action="preview"]').forEach(btn => btn.addEventListener('click', (e) => this.previewTemplate(e)));
        this.container.querySelectorAll('[data-action="delete"]').forEach(btn => btn.addEventListener('click', (e) => this.deleteTemplate(e)));
        this.container.querySelectorAll('[data-action="export"]').forEach(btn => btn.addEventListener('click', (e) => this.exportTemplate(e)));
    }

    templateCard(t) {
        const name = this.escape(t.name || 'Template');
        const time = t.timestamp ? new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        const snippet = (t.html || '').replace(/<[^>]*>/g, '').trim().slice(0, 100);
        const id = t.timestamp;
        const varCount = (t.variables || []).length;

        return `
        <div class="card p-5 flex flex-col justify-between" data-id="${this.escapeAttr(id)}">
            <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                    <h3 class="font-bold text-sm text-slate-900 truncate" title="${this.escapeAttr(t.name)}">${name}</h3>
                    <span class="text-[11px] text-slate-400 shrink-0">${time}</span>
                </div>
                <p class="text-xs text-slate-500 mb-4 line-clamp-3 leading-relaxed min-h-[3rem]">${this.escape(snippet || 'No HTML preview available')}...</p>
            </div>

            <div>
                <div class="flex items-center gap-2 mb-3 pt-3 border-t border-slate-100">
                    <button class="btn btn-primary flex-1 text-xs py-1.5" data-action="use" data-name="${this.escapeAttr(t.name)}">
                        <i class="fas fa-check mr-1"></i> Use
                    </button>
                    <button class="btn btn-secondary flex-1 text-xs py-1.5" data-action="preview" data-id="${this.escapeAttr(id)}">
                        <i class="fas fa-eye mr-1"></i> Preview
                    </button>
                </div>
                <div class="flex items-center justify-between text-xs pt-1">
                    <span class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <i class="fas fa-tag mr-1 text-slate-400"></i>${varCount} Variable${varCount === 1 ? '' : 's'}
                    </span>
                    <div class="flex items-center gap-1">
                        <button class="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100" data-action="export" data-id="${this.escapeAttr(id)}" title="Export JSON">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50" data-action="delete" data-id="${this.escapeAttr(id)}" title="Delete Template">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    useTemplate(e) {
        const name = e.currentTarget.getAttribute('data-name');
        if (!name) return;
        localStorage.setItem('template-to-load', name);
        this.notify('Template loaded. Redirecting to editor...');
        if (typeof window !== 'undefined' && window.location) {
            window.location.href = 'index.html';
        }
    }

    previewTemplate(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const templates = this.getTemplates();
        const t = templates.find(item => item.timestamp === id);
        if (!t) return;
        if (this.previewTitle) this.previewTitle.textContent = t.name || 'Template Preview';
        if (this.previewHtml) this.previewHtml.textContent = t.html || '';
        if (this.previewRendered) {
            const sanitize = window.EmailEditorUtils?.sanitizeHtml || ((h) => h);
            this.previewRendered.innerHTML = sanitize(t.html || '');
        }
        this.toggleModal(true);
    }

    deleteTemplate(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const templates = this.getTemplates();
        const idx = templates.findIndex(t => t.timestamp === id);
        if (idx === -1) return;
        const t = templates[idx];
        if (typeof window !== 'undefined' && window.confirm && !window.confirm(`Delete template "${t.name}"?`)) return;
        templates.splice(idx, 1);
        this.saveTemplates(templates);
        this.render();
        this.notify('Template deleted');
    }

    exportTemplate(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const templates = this.getTemplates();
        const t = templates.find(item => item.timestamp === id);
        if (!t) return;
        const dataStr = JSON.stringify(t, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(t.name || 'template').replace(/[^a-z0-9_-]+/gi, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.notify('Template exported');
    }

    toggleModal(show) {
        if (!this.modal) return;
        if (show) this.modal.classList.remove('hidden');
        else this.modal.classList.add('hidden');
    }

    notify(msg, type = 'success') {
        const n = document.getElementById('notification');
        const text = document.getElementById('notification-text');
        if (!n || !text) return;
        text.textContent = msg;
        n.className = `fixed top-16 right-6 text-white px-4 py-2.5 rounded-xl shadow-xl font-semibold flex items-center gap-2 transform transition-all duration-300 z-[60] text-xs ${type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'}`;
        n.classList.remove('hidden');
        if (typeof n.offsetWidth !== 'undefined') void n.offsetWidth;
        n.style.opacity = '1';
        n.style.transform = 'translateX(0)';
        setTimeout(() => {
            n.style.opacity = '0';
            n.style.transform = 'translateX(12px)';
            setTimeout(() => n.classList.add('hidden'), 300);
        }, 3000);
    }

    escape(s) {
        return String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    }

    escapeAttr(s) {
        return String(s || '').replace(/["'<>&]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
}

if (typeof window !== 'undefined') {
    window.TemplateManager = TemplateManager;
    window.TemplatesPage = new TemplateManager();
}
