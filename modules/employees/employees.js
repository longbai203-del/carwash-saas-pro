/**
 * employees.js - 员工审核管理模块
 */
window.EmployeesModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Employees] 初始化...');
        await this.waitForDOM();
        this.bindEvents();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Employees] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('usersReviewList')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    bindEvents() {
        const filter = document.getElementById('userStatusFilter');
        if (filter) filter.addEventListener('change', () => this.loadData());
    },

    async loadData() {
        try {
            const { data } = await supabase.from('users').select('*').order('registered_at', { ascending: false });
            if (data) AppState.allUsers = data;
        } catch (e) { console.error(e); }
    },

    render() {
        const statusFilter = document.getElementById('userStatusFilter')?.value || 'all';
        let users = AppState.allUsers || [];
        if (statusFilter !== 'all') users = users.filter(u => u.status === statusFilter);

        const list = document.getElementById('usersReviewList');
        if (!list) return;

        if (users.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 py-8">暂无用户</div>';
            return;
        }

        let html = '';
        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            const statusClass = u.status === 'pending' ? 'status-badge-pending' : u.status === 'approved' ? 'status-badge-approved' : 'status-badge-rejected';
            const statusLabel = u.status === 'pending' ? '⏳ 待审核' : u.status === 'approved' ? '✅ 已通过' : '❌ 已拒绝';
            const rowClass = u.status === 'pending' ? 'pending-user' : u.status === 'approved' ? 'approved-user' : 'rejected-user';
            const roleLabel = ROLE_PERMISSIONS?.[u.role]?.label || u.role;

            html += '<div class="' + rowClass + ' flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border">';
            html += '<div>';
            html += '<span class="font-bold">' + (u.name || u.username) + '</span>';
            html += '<span class="text-sm text-gray-400 ml-2">@' + u.username + '</span>';
            html += '<span class="role-badge role-' + u.role + '">' + roleLabel + '</span>';
            html += '<span class="status-badge ' + statusClass + ' ml-2">' + statusLabel + '</span>';
            html += '<div class="text-xs text-gray-400">注册: ' + (u.registered_at ? new Date(u.registered_at).toLocaleString() : '未知') + '</div>';
            html += '</div>';
            html += '<div class="flex gap-2">';

            if (u.status === 'pending') {
                html += '<button onclick="window.EmployeesModule.approve(\'' + u.id + '\')" class="btn-success btn-sm">✅ 通过</button>';
                html += '<button onclick="window.EmployeesModule.reject(\'' + u.id + '\')" class="btn-danger btn-sm">❌ 拒绝</button>';
            } else if (u.status === 'approved') {
                html += '<button onclick="window.EmployeesModule.reject(\'' + u.id + '\')" class="btn-warning btn-sm">⛔ 停用</button>';
            } else if (u.status === 'rejected') {
                html += '<button onclick="window.EmployeesModule.approve(\'' + u.id + '\')" class="btn-success btn-sm">✅ 恢复</button>';
            }

            html += '</div></div>';
        }
        list.innerHTML = html;
    },

    async approve(userId) {
        if (!AppState.currentUser || (AppState.currentUser.role !== 'owner' && AppState.currentUser.role !== 'manager')) {
            showToast('❌ 只有老板和店长可以审核');
            return;
        }
        try {
            await supabase.from('users').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', userId);
            const user = AppState.allUsers.find(u => u.id === userId);
            if (user) user.status = 'approved';
            showToast('✅ 用户已审核通过');
            this.render();
        } catch (e) { showToast('❌ 操作失败: ' + e.message); }
    },

    async reject(userId) {
        if (!AppState.currentUser || (AppState.currentUser.role !== 'owner' && AppState.currentUser.role !== 'manager')) {
            showToast('❌ 只有老板和店长可以审核');
            return;
        }
        if (!confirm('确认拒绝/停用该用户？')) return;
        try {
            await supabase.from('users').update({ status: 'rejected', approved_at: new Date().toISOString() }).eq('id', userId);
            const user = AppState.allUsers.find(u => u.id === userId);
            if (user) user.status = 'rejected';
            showToast('✅ 用户已拒绝/停用');
            this.render();
        } catch (e) { showToast('❌ 操作失败: ' + e.message); }
    }
};

console.log('[Employees] 模块已注册');
