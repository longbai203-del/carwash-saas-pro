/**
 * app.js - 应用主入口
 */
window.App = {
    _initialized: false,
    
    async init() {
        if (this._initialized) return;
        console.log('[App] 初始化...');
        
        try {
            const saved = localStorage.getItem('cw_config');
            if (saved) {
                const config = JSON.parse(saved);
                AppStore.set('config', { ...AppStore.get('config'), ...config });
            }
        } catch(e) {}
        
        await this.loadData();
        this.updateUI();
        this.bindEvents();
        this.setupRealtime();
        
        this._initialized = true;
        console.log('[App] 初始化完成');
    },
    
    async loadData() {
        try {
            AppStore.set('isLoading', true);
            
            const [users, orders, customers, inventory, attendance, branches] = await Promise.all([
                AppApi.getUsers(),
                AppApi.getOrders(),
                AppApi.getCustomers(),
                AppApi.getInventory(),
                AppApi.getAttendance(),
                AppApi.getBranches()
            ]);
            
            AppStore.update({
                allUsers: users || [],
                allOrders: orders || [],
                allCustomers: customers || [],
                allInventory: inventory || [],
                allAttendance: attendance || [],
                allBranches: branches || [],
                isLoading: false
            });
            
        } catch (error) {
            console.error('[App] 加载数据失败:', error);
            AppStore.set('isLoading', false);
        }
    },
    
    updateUI() {
        const user = AppStore.get('currentUser');
        if (!user) return;
        
        const role = user.role || 'employee';
        const perms = AppConfig.permissions[role] || [];
        
        document.querySelectorAll('[data-module]').forEach(el => {
            const module = el.dataset.module;
            const show = perms.includes(module);
            el.style.display = show ? 'flex' : 'none';
        });
        
        const roleLabels = { owner: '老板', manager: '店长', cashier: '收银员', employee: '员工' };
        document.getElementById('userRoleDisplay').textContent = (roleLabels[role] || role);
        document.getElementById('currentRoleSpan').textContent = roleLabels[role] || role;
        document.getElementById('currentUserSpan').textContent = user.name || user.username || 'Admin';
        document.getElementById('headerUsername').textContent = user.name || user.username || 'Admin';
        
        this.updateBranchSelector();
    },
    
    updateBranchSelector() {
        const sel = document.getElementById('branchSelector');
        if (!sel) return;
        const branches = AppStore.get('allBranches') || [];
        sel.innerHTML = '<option value="all">🏪 全部门店</option>' +
            branches.map(b => '<option value="' + b.id + '">' + b.name + '</option>').join('');
    },
    
    bindEvents() {
        document.querySelectorAll('[data-module]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const module = el.dataset.module;
                AppStore.set('currentModule', module);
                AppLoader.load(module);
            });
        });
        
        document.getElementById('branchSelector')?.addEventListener('change', function() {
            AppStore.set('currentBranch', this.value);
            const currentModule = AppStore.get('currentModule');
            if (currentModule) AppLoader.load(currentModule);
            AppUtils.toast('已切换门店', 'info');
        });
    },
    
    setupRealtime() {
        if (window._realtimeSubscription) {
            window._realtimeSubscription.unsubscribe();
        }
        
        window._realtimeSubscription = supabase
            .channel('app-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                const orders = AppStore.get('allOrders') || [];
                orders.unshift(payload.new);
                AppStore.set('allOrders', orders);
                AppUtils.toast('🔔 新订单: ' + payload.new.plate_number + ' ' + payload.new.total + ' SAR', 'success');
                
                const currentModule = AppStore.get('currentModule');
                if (currentModule && AppLoader._active === currentModule) {
                    AppLoader.load(currentModule);
                }
            })
            .subscribe();
    },
    
    switchModule(moduleName) {
        AppStore.set('currentModule', moduleName);
        AppLoader.load(moduleName);
    }
};

window.showToast = AppUtils.toast;

console.log('[App] 加载完成');
