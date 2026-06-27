/**
 * audit.js - 审计日志模块
 */
window.AuditModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Audit] 初始化...');
        await this.waitForDOM();
        this.bindEvents();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Audit] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('auditLogList')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    bindEvents() {
        ['auditActionFilter', 'auditTableFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.loadData());
        });
    },

    async loadData() {
        try {
            const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
            if (data) AppState.allAuditLogs = data;
        } catch (e) { console.error(e); }
    },

    render() {
        const action = document.getElementById('auditActionFilter')?.value || 'all';
        const table = document.getElementById('auditTableFilter')?.value || 'all';
        let logs = AppState.allAuditLogs || [];
        if (action !== 'all') logs = logs.filter(l => l.action === action);
        if (table !== 'all') logs = logs.filter(l => l.table_name === table);

        const list = document.getElementById('auditLogList');
        if (!list) return;
        const actions = { INSERT: '🟢 新增', UPDATE: '🟡 修改', DELETE: '🔴 删除' };

        if (logs.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 py-8">暂无审计记录</div>';
            if (document.getElementById('auditCount')) document.getElementById('auditCount').textContent = '0';
            return;
        }

        let html = '';
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            html += '<div class="flex justify-between p-2 border-b hover:bg-gray-50">';
            html += '<div><span class="font-medium">' + (actions[log.action] || log.action) + '</span>';
            html += '<span class="text-gray-600 ml-2">' + log.table_name + '</span>';
            html += '<span class="text-xs text-gray-400 ml-2">' + (log.username || '系统') + '</span></div>';
            html += '<div class="text-right"><span class="text-xs text-gray-400">' + (log.created_at ? new Date(log.created_at).toLocaleString() : '') + '</span></div>';
            html += '</div>';
        }
        list.innerHTML = html;
        if (document.getElementById('auditCount')) document.getElementById('auditCount').textContent = logs.length;
    }
};

console.log('[Audit] 模块已注册');
