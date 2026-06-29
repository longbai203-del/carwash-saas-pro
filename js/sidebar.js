/**
 * components/sidebar.js - 侧边栏组件
 */
window.SidebarComponent = {
    _menuItems: [
        { module: 'dashboard', icon: 'fa-chart-line', label: '仪表板' },
        { module: 'cashier', icon: 'fa-cash-register', label: 'POS收银' },
        { module: 'orders', icon: 'fa-clipboard-list', label: '订单管理' },
        { module: 'inventory', icon: 'fa-boxes', label: '库存管理' },
        { module: 'customers', icon: 'fa-users', label: '客户管理' },
        { module: 'attendance', icon: 'fa-clock', label: '考勤管理' },
        { module: 'reports', icon: 'fa-chart-bar', label: '财务管理' },
        { module: 'employees', icon: 'fa-user-tie', label: '员工审核' },
        { module: 'audit', icon: 'fa-history', label: '审计日志' },
        { module: 'vehicle-monitor', icon: 'fa-camera', label: '🚗 车辆监控' },
        { module: 'settings', icon: 'fa-cog', label: '系统设置' }
    ],

    render(container) {
        const user = AppStore.get('currentUser');
        const perms = user ? AppConfig.permissions[user.role] || [] : [];
        let html = `
            <aside class="w-64 bg-white shadow-xl z-20 flex flex-col border-r border-gray-100 h-screen">
                <div class="p-5 border-b border-gray-100 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
                        <i class="fas fa-car-wash text-white text-xl"></i>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-blue-600">CarWash Pro</h1>
                        <p class="text-xs text-gray-400">云端版 v2.0</p>
                    </div>
                </div>
                <div class="px-4 py-3 border-b border-gray-100">
                    <label class="text-xs text-gray-400 block mb-1">🏪 当前门店</label>
                    <select id="branchSelector" class="w-full p-2 border rounded-lg text-sm bg-gray-50">
                        <option value="all">全部门店</option>
                    </select>
                </div>
                <nav class="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        `;
        this._menuItems.forEach(item => {
            const show = perms.includes(item.module) || perms.length === 0;
            if (show) {
                html += '<a href="#" data-module="' + item.module + '" class="sidebar-link ' + (item.module === 'dashboard' ? 'nav-item-active' : '') + '"><i class="fas ' + item.icon + ' w-5"></i><span>' + item.label + '</span></a>';
            }
        });
        html += `
                </nav>
                <div class="p-4 border-t border-gray-100">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-cloud text-blue-500 text-xl"></i>
                            <div>
                                <p class="text-xs text-gray-400">同步状态</p>
                                <p class="text-sm font-semibold text-green-600">🟢 在线</p>
                            </div>
                        </div>
                        <span class="real-time-badge"><i class="fas fa-bolt"></i> 实时</span>
                    </div>
                    <div class="mt-2 text-xs text-gray-400">
                        <span id="currentUserSpan">` + (user?.name || user?.username || '未登录') + `</span>
                        <span class="mx-1">·</span>
                        <span id="currentRoleSpan" class="text-gray-500"></span>
                    </div>
                </div>
            </aside>
        `;
        if (container) {
            container.innerHTML = html;
            this.bindEvents(container);
        }
        return html;
    },

    bindEvents(container) {
        container.querySelectorAll('[data-module]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const module = el.dataset.module;
                AppStore.set('currentModule', module);
                AppLoader.load(module);
                container.querySelectorAll('[data-module]').forEach(item => {
                    item.classList.remove('nav-item-active');
                });
                el.classList.add('nav-item-active');
            });
        });
        const branchSel = container.querySelector('#branchSelector');
        if (branchSel) {
            branchSel.addEventListener('change', function() {
                AppStore.set('currentBranch', this.value);
                const currentModule = AppStore.get('currentModule');
                if (currentModule) AppLoader.load(currentModule);
                AppUtils.toast('已切换门店', 'info');
            });
        }
    },

    setActive(moduleName) {
        document.querySelectorAll('[data-module]').forEach(el => {
            el.classList.remove('nav-item-active');
            if (el.dataset.module === moduleName) {
                el.classList.add('nav-item-active');
            }
        });
    }
};

console.log('[SidebarComponent] 加载完成');