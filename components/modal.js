/**
 * components/modal.js - 模态框组件
 */
window.ModalComponent = {
    _modalId: 'globalModal',
    _overlayId: 'modalOverlay',

    createContainer() {
        if (document.getElementById(this._modalId)) return;
        const overlay = document.createElement('div');
        overlay.id = this._overlayId;
        overlay.className = 'modal-glass hidden';
        overlay.onclick = (e) => { if (e.target === overlay) this.close(); };
        const modal = document.createElement('div');
        modal.id = this._modalId;
        modal.className = 'bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto';
        modal.onclick = (e) => e.stopPropagation();
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    },

    open(options = {}) {
        this.createContainer();
        const modal = document.getElementById(this._modalId);
        const overlay = document.getElementById(this._overlayId);
        if (!modal || !overlay) return;
        const { title, content, width, onClose } = options;
        if (width) modal.style.maxWidth = width;
        let html = '';
        if (title) {
            html += '<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-blue-600">' + title + '</h3><button onclick="ModalComponent.close()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button></div>';
        }
        html += (content || '');
        modal.innerHTML = html;
        overlay.classList.remove('hidden');
        this._onClose = onClose || null;
    },

    close() {
        const overlay = document.getElementById(this._overlayId);
        if (overlay) overlay.classList.add('hidden');
        if (this._onClose) {
            this._onClose();
            this._onClose = null;
        }
    },

    confirm(message, title = '确认') {
        return new Promise((resolve) => {
            const content = '<div class="py-4"><p class="text-gray-700">' + message + '</p></div><div class="flex gap-3 mt-4"><button onclick="ModalComponent.close(); resolve(true)" class="btn-success flex-1 py-2 rounded-lg">确认</button><button onclick="ModalComponent.close(); resolve(false)" class="btn-outline flex-1 py-2 rounded-lg">取消</button></div>';
            this.open({ title, content });
            window._modalResolve = resolve;
        });
    },

    form(options) {
        return new Promise((resolve) => {
            const { title, fields, submitText = '提交', cancelText = '取消' } = options;
            let formHtml = '<div class="space-y-4">';
            fields.forEach(f => {
                const value = f.value || '';
                formHtml += '<div class="form-group"><label>' + f.label + '</label>';
                if (f.type === 'select') {
                    formHtml += '<select id="modal_field_' + f.name + '" class="w-full p-2 border rounded">';
                    f.options.forEach(o => {
                        formHtml += '<option value="' + o.value + '" ' + (o.selected ? 'selected' : '') + '>' + o.label + '</option>';
                    });
                    formHtml += '</select>';
                } else if (f.type === 'textarea') {
                    formHtml += '<textarea id="modal_field_' + f.name + '" class="w-full p-2 border rounded" rows="3">' + value + '</textarea>';
                } else {
                    formHtml += '<input id="modal_field_' + f.name + '" type="' + (f.type || 'text') + '" class="w-full p-2 border rounded" placeholder="' + (f.placeholder || '') + '" value="' + value + '">';
                }
                formHtml += '</div>';
            });
            formHtml += '<div class="flex gap-3 mt-4"><button onclick="ModalComponent._submitForm()" class="btn-primary flex-1 py-2 rounded-lg">' + submitText + '</button><button onclick="ModalComponent.close()" class="btn-outline flex-1 py-2 rounded-lg">' + cancelText + '</button></div></div>';
            this.open({ title, content: formHtml });
            window._modalFormResolve = resolve;
            window._modalFormFields = fields;
        });
    },

    _submitForm() {
        const fields = window._modalFormFields || [];
        const result = {};
        fields.forEach(f => {
            const el = document.getElementById('modal_field_' + f.name);
            if (el) result[f.name] = el.value;
        });
        if (window._modalFormResolve) window._modalFormResolve(result);
        this.close();
    }
};

console.log('[ModalComponent] 加载完成');
