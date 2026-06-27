# ============================================================
# 补全 CarWash SaaS 缺失文件 (修复版)
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  补全 CarWash SaaS 缺失文件 (修复版)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 使用 Here-String 和转义字符
# 所有内联代码块统一处理

# ============================================================
# 1. js/router.js
# ============================================================
Write-Host "📝 创建 js/router.js..." -ForegroundColor Yellow

$routerJS = @"
/**
 * router.js - 路由管理器
 */
window.AppRouter = {
    routes: {},
    currentRoute: null,
    defaultRoute: 'dashboard',

    init() {
        console.log('[Router] 初始化...');
        window.addEventListener('hashchange', () => { this.handleRoute(); });
        this.handleRoute();
    },

    register(route, moduleName) {
        this.routes[route] = moduleName;
        return this;
    },

    registerAll(routes) {
        Object.keys(routes).forEach(key => {
            this.routes[key] = routes[key];
        });
        return this;
    },

    handleRoute() {
        const hash = window.location.hash.replace('#', '') || this.defaultRoute;
        const moduleName = this.routes[hash] || this.routes[this.defaultRoute];
        if (moduleName) {
            this.navigate(moduleName, false);
        }
    },

    navigate(moduleName, updateHash = true) {
        if (this.currentRoute === moduleName) return;
        const user = AppStore.get('currentUser');
        if (user) {
            const perms = AppConfig.permissions[user.role] || [];
            if (!perms.includes(moduleName)) {
                AppUtils.toast('您没有权限访问此页面', 'warning');
                return;
            }
        }
        this.currentRoute = moduleName;
        if (updateHash) {
            window.location.hash = moduleName;
        }
        AppStore.set('currentModule', moduleName);
        AppLoader.load(moduleName);
    },

    getCurrentRoute() {
        return this.currentRoute;
    },

    back() {
        window.history.back();
    }
};

console.log('[Router] 加载完成');
"@

$routerJS | Out-File -Encoding UTF8 -FilePath "js/router.js"

# ============================================================
# 2. services/supabase.js
# ============================================================
Write-Host "📝 创建 services/supabase.js..." -ForegroundColor Yellow

$supabaseJS = @"
/**
 * services/supabase.js - Supabase 客户端封装
 */
window.SupabaseService = {
    _client: null,
    _initialized: false,

    init(url, anonKey) {
        if (this._initialized) return this._client;
        this._client = supabase.createClient(url, anonKey);
        this._initialized = true;
        console.log('[SupabaseService] 初始化完成');
        return this._client;
    },

    getClient() {
        if (!this._initialized) {
            throw new Error('SupabaseService 未初始化');
        }
        return this._client;
    },

    async query(table, options = {}) {
        const client = this.getClient();
        let query = client.from(table).select(options.select || '*');
        if (options.filter) {
            Object.keys(options.filter).forEach(key => {
                query = query.eq(key, options.filter[key]);
            });
        }
        if (options.order) {
            query = query.order(options.order.by, { ascending: options.order.ascending || false });
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data;
    },

    async insert(table, data) {
        const client = this.getClient();
        const { data: result, error } = await client.from(table).insert(data).select();
        if (error) throw new Error(error.message);
        return result;
    },

    async update(table, id, data) {
        const client = this.getClient();
        const { data: result, error } = await client.from(table).update(data).eq('id', id).select();
        if (error) throw new Error(error.message);
        return result;
    },

    async delete(table, id) {
        const client = this.getClient();
        const { error } = await client.from(table).delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    subscribe(channel, callback) {
        const client = this.getClient();
        return client
            .channel(channel)
            .on('postgres_changes', { event: '*', schema: 'public' }, callback)
            .subscribe();
    }
};

console.log('[SupabaseService] 加载完成');
"@

$supabaseJS | Out-File -Encoding UTF8 -FilePath "services/supabase.js"

# ============================================================
# 3. services/authService.js
# ============================================================
Write-Host "📝 创建 services/authService.js..." -ForegroundColor Yellow

$authServiceJS = @"
/**
 * services/authService.js - 认证服务
 */
window.AuthService = {
    async register(username, password, name, role) {
        const passwordHash = CryptoJS.SHA256(password).toString();
        return SupabaseService.insert('users', [{
            username,
            password_hash: passwordHash,
            role: role || 'employee',
            name: name || username,
            status: 'pending',
            registered_at: new Date().toISOString()
        }]);
    },

    async login(username, password) {
        const users = await SupabaseService.query('users');
        const user = users.find(u => u.username === username);
        if (!user) throw new Error('用户不存在');
        if (user.status === 'pending') throw new Error('账号正在审核中');
        if (user.status === 'rejected') throw new Error('账号已被拒绝');
        if (user.status !== 'approved') throw new Error('账号状态异常');
        const hash = CryptoJS.SHA256(password).toString();
        if (user.password_hash !== hash) throw new Error('密码错误');
        return user;
    },

    async resetPassword(username, newPassword) {
        const users = await SupabaseService.query('users', { filter: { username } });
        if (!users || users.length === 0) throw new Error('用户不存在');
        if (users[0].status !== 'approved') throw new Error('账号未审核通过');
        const passwordHash = CryptoJS.SHA256(newPassword).toString();
        return SupabaseService.update('users', users[0].id, { password_hash: passwordHash });
    },

    async changePassword(username, oldPassword, newPassword) {
        const users = await SupabaseService.query('users', { filter: { username } });
        if (!users || users.length === 0) throw new Error('用户不存在');
        const oldHash = CryptoJS.SHA256(oldPassword).toString();
        if (users[0].password_hash !== oldHash) throw new Error('当前密码错误');
        const newHash = CryptoJS.SHA256(newPassword).toString();
        return SupabaseService.update('users', users[0].id, { password_hash: newHash });
    },

    async approveUser(userId) {
        return SupabaseService.update('users', userId, {
            status: 'approved',
            approved_at: new Date().toISOString()
        });
    },

    async rejectUser(userId) {
        return SupabaseService.update('users', userId, {
            status: 'rejected',
            approved_at: new Date().toISOString()
        });
    },

    async getPendingUsers() {
        return SupabaseService.query('users', {
            filter: { status: 'pending' },
            order: { by: 'registered_at', ascending: false }
        });
    },

    async getAllUsers() {
        return SupabaseService.query('users', {
            order: { by: 'created_at', ascending: false }
        });
    },

    async createAdmin(username, password) {
        const passwordHash = CryptoJS.SHA256(password).toString();
        return SupabaseService.insert('users', [{
            username,
            password_hash: passwordHash,
            role: 'owner',
            name: username,
            status: 'approved',
            registered_at: new Date().toISOString(),
            approved_at: new Date().toISOString()
        }]);
    }
};

console.log('[AuthService] 加载完成');
"@

$authServiceJS | Out-File -Encoding UTF8 -FilePath "services/authService.js"

# ============================================================
# 4. services/orderService.js
# ============================================================
Write-Host "📝 创建 services/orderService.js..." -ForegroundColor Yellow

$orderServiceJS = @"
/**
 * services/orderService.js - 订单服务
 */
window.OrderService = {
    generateOrderNumber() {
        const today = new Date();
        const prefix = 'ORD-' + today.getFullYear() +
            String(today.getMonth() + 1).padStart(2, '0') +
            String(today.getDate()).padStart(2, '0');
        const count = (AppStore.get('allOrders') || [])
            .filter(o => o.date === AppUtils.today()).length + 1;
        return prefix + '-' + String(count).padStart(4, '0');
    },

    async createOrder(orderData) {
        const order = {
            order_number: this.generateOrderNumber(),
            plate_number: orderData.plate_number,
            customer_id: orderData.customer_id || null,
            employee_id: orderData.employee_id || null,
            staff_name: orderData.staff_name,
            service_name: orderData.service_name,
            amount: orderData.amount,
            vat: orderData.vat || 0,
            total: orderData.total,
            payment_method: orderData.payment_method,
            status: orderData.status || 'pending',
            date: orderData.date || AppUtils.today(),
            created_at: new Date().toISOString()
        };
        const result = await SupabaseService.insert('orders', [order]);
        if (result && result.length > 0) {
            const orders = AppStore.get('allOrders') || [];
            orders.unshift(result[0]);
            AppStore.set('allOrders', orders);
            return result[0];
        }
        return null;
    },

    async getOrders(filters = {}) {
        const options = { order: { by: 'created_at', ascending: false }, limit: 200 };
        if (filters.date) options.filter = { date: filters.date };
        if (filters.status) options.filter = { ...options.filter, status: filters.status };
        if (filters.customer_id) options.filter = { ...options.filter, customer_id: filters.customer_id };
        return SupabaseService.query('orders', options);
    },

    async getTodayOrders() {
        return this.getOrders({ date: AppUtils.today() });
    },

    async updateStatus(orderId, status) {
        return SupabaseService.update('orders', orderId, {
            status: status,
            updated_at: new Date().toISOString()
        });
    },

    async updateOrder(orderId, data) {
        data.updated_at = new Date().toISOString();
        return SupabaseService.update('orders', orderId, data);
    },

    async deleteOrder(orderId) {
        return SupabaseService.delete('orders', orderId);
    },

    async getStats() {
        const orders = await this.getOrders();
        const today = AppUtils.today();
        const todayOrders = orders.filter(o => o.date === today);
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const todayTotal = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
        const pending = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'in_progress');
        return {
            totalOrders: orders.length,
            totalRevenue: total,
            todayOrders: todayOrders.length,
            todayRevenue: todayTotal,
            pendingOrders: pending.length,
            avgOrder: orders.length > 0 ? total / orders.length : 0
        };
    },

    async getTopServices() {
        const orders = await this.getOrders();
        const stats = {};
        orders.forEach(o => {
            const name = o.service_name || '基础';
            stats[name] = (stats[name] || 0) + 1;
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([name, count]) => ({ name, count }));
    },

    async getTopStaff() {
        const orders = await this.getOrders();
        const stats = {};
        orders.forEach(o => {
            const name = o.staff_name || '未知';
            stats[name] = (stats[name] || 0) + (o.total || 0);
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([name, revenue]) => ({ name, revenue }));
    },

    async getDailyReport(date) {
        const orders = await SupabaseService.query('orders', {
            filter: { date: date || AppUtils.today() }
        });
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const vat = orders.reduce((s, o) => s + (o.vat || 0), 0);
        const byPayment = {};
        orders.forEach(o => {
            const method = o.payment_method || 'other';
            byPayment[method] = (byPayment[method] || 0) + (o.total || 0);
        });
        return { orders, total, vat, count: orders.length, byPayment };
    },

    calculateCommission(order) {
        const rate = AppStore.get('config')?.commissionRate || 5;
        return order.total * rate / 100;
    }
};

console.log('[OrderService] 加载完成');
"@

$orderServiceJS | Out-File -Encoding UTF8 -FilePath "services/orderService.js"

# ============================================================
# 5. services/inventoryService.js
# ============================================================
Write-Host "📝 创建 services/inventoryService.js..." -ForegroundColor Yellow

$inventoryServiceJS = @"
/**
 * services/inventoryService.js - 库存服务
 */
window.InventoryService = {
    async getInventory() {
        return SupabaseService.query('inventory');
    },

    async getItem(id) {
        const items = await SupabaseService.query('inventory', { filter: { id } });
        return items && items.length > 0 ? items[0] : null;
    },

    async createProduct(data) {
        const product = {
            name: data.name,
            category: data.category || '其他',
            unit: data.unit || '个',
            quantity: data.quantity || 0,
            cost: data.cost || 0,
            min_qty: data.min_qty || 5,
            created_at: new Date().toISOString()
        };
        const result = await SupabaseService.insert('inventory', [product]);
        if (result && result.length > 0) {
            const inventory = AppStore.get('allInventory') || [];
            inventory.push(result[0]);
            AppStore.set('allInventory', inventory);
            return result[0];
        }
        return null;
    },

    async updateProduct(id, data) {
        data.last_updated = new Date().toISOString();
        const result = await SupabaseService.update('inventory', id, data);
        if (result && result.length > 0) {
            const inventory = AppStore.get('allInventory') || [];
            const idx = inventory.findIndex(i => i.id === id);
            if (idx !== -1) inventory[idx] = result[0];
            AppStore.set('allInventory', inventory);
            return result[0];
        }
        return null;
    },

    async stockIn(productId, quantity, unitPrice, supplier, note) {
        const product = await this.getItem(productId);
        if (!product) throw new Error('产品不存在');
        const newQuantity = (product.quantity || 0) + quantity;
        await this.updateProduct(productId, { quantity: newQuantity, cost: unitPrice || product.cost });
        const log = {
            inventory_id: productId,
            product_name: product.name,
            quantity: quantity,
            unit_price: unitPrice || 0,
            total_price: (unitPrice || 0) * quantity,
            supplier: supplier || '未知',
            note: note || '',
            created_by: AppStore.get('currentUser')?.name || '系统',
            created_at: new Date().toISOString()
        };
        await SupabaseService.insert('stock_in', [log]);
        return { product, newQuantity, log };
    },

    async stockOut(productId, quantity, reason, note) {
        const product = await this.getItem(productId);
        if (!product) throw new Error('产品不存在');
        if ((product.quantity || 0) < quantity) {
            throw new Error('库存不足！当前库存: ' + product.quantity);
        }
        const newQuantity = (product.quantity || 0) - quantity;
        await this.updateProduct(productId, { quantity: newQuantity });
        const log = {
            inventory_id: productId,
            product_name: product.name,
            quantity: quantity,
            reason: reason || '日常消耗',
            note: note || '',
            created_by: AppStore.get('currentUser')?.name || '系统',
            created_at: new Date().toISOString()
        };
        await SupabaseService.insert('stock_out', [log]);
        return { product, newQuantity, log };
    },

    async getLowStock() {
        const inventory = await this.getInventory();
        return inventory.filter(i => (i.quantity || 0) <= (i.min_qty || 5));
    },

    async getStats() {
        const inventory = await this.getInventory();
        const totalItems = inventory.length;
        const totalQuantity = inventory.reduce((s, i) => s + (i.quantity || 0), 0);
        const totalValue = inventory.reduce((s, i) => s + ((i.quantity || 0) * (i.cost || 0)), 0);
        const lowStock = inventory.filter(i => (i.quantity || 0) <= (i.min_qty || 5));
        return { totalItems, totalQuantity, totalValue, lowStockCount: lowStock.length, lowStockItems: lowStock };
    },

    async searchProducts(keyword) {
        const inventory = await this.getInventory();
        return inventory.filter(i => i.name.includes(keyword) || (i.category && i.category.includes(keyword)));
    }
};

console.log('[InventoryService] 加载完成');
"@

$inventoryServiceJS | Out-File -Encoding UTF8 -FilePath "services/inventoryService.js"

# ============================================================
# 6. components/navbar.js
# ============================================================
Write-Host "📝 创建 components/navbar.js..." -ForegroundColor Yellow

$navbarJS = @"
/**
 * components/navbar.js - 导航栏组件
 */
window.NavbarComponent = {
    render(container) {
        const user = AppStore.get('currentUser');
        const roleLabels = { owner: '老板', manager: '店长', cashier: '收银员', employee: '员工' };
        const html = '
            <nav class="bg-white shadow-sm py-3 px-6 flex justify-between items-center border-b border-gray-100">
                <div class="flex items-center gap-3">
                    <i class="fas fa-car text-blue-500 text-xl"></i>
                    <span class="text-xl font-bold text-gray-800">CarWash Pro</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-sm text-gray-600 hidden md:inline">👤 ' + (user?.name || user?.username || '未登录') + '</span>
                    <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">' + (roleLabels[user?.role] || user?.role || '未登录') + '</span>
                    <button onclick="AppAuth.logout()" class="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full hover:bg-red-100">退出</button>
                </div>
            </nav>
        ';
        if (container) container.innerHTML = html;
        return html;
    }
};

console.log('[NavbarComponent] 加载完成');
"@

$navbarJS | Out-File -Encoding UTF8 -FilePath "components/navbar.js"

# ============================================================
# 7. components/sidebar.js
# ============================================================
Write-Host "📝 创建 components/sidebar.js..." -ForegroundColor Yellow

$sidebarJS = @"
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
        { module: 'settings', icon: 'fa-cog', label: '系统设置' }
    ],

    render(container) {
        const user = AppStore.get('currentUser');
        const perms = user ? AppConfig.permissions[user.role] || [] : [];
        let html = '
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
        ';
        this._menuItems.forEach(item => {
            const show = perms.includes(item.module) || perms.length === 0;
            if (show) {
                html += '<a href="#" data-module="' + item.module + '" class="sidebar-link ' + (item.module === 'dashboard' ? 'nav-item-active' : '') + '"><i class="fas ' + item.icon + ' w-5"></i><span>' + item.label + '</span></a>';
            }
        });
        html += '
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
                        <span id="currentUserSpan">' + (user?.name || user?.username || '未登录') + '</span>
                        <span class="mx-1">·</span>
                        <span id="currentRoleSpan" class="text-gray-500"></span>
                    </div>
                </div>
            </aside>
        ';
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
"@

$sidebarJS | Out-File -Encoding UTF8 -FilePath "components/sidebar.js"

# ============================================================
# 8. components/modal.js
# ============================================================
Write-Host "📝 创建 components/modal.js..." -ForegroundColor Yellow

$modalJS = @"
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
"@

$modalJS | Out-File -Encoding UTF8 -FilePath "components/modal.js"

# ============================================================
# 9. components/datatable.js
# ============================================================
Write-Host "📝 创建 components/datatable.js..." -ForegroundColor Yellow

$datatableJS = @"
/**
 * components/datatable.js - 数据表格组件
 */
window.DataTableComponent = {
    _instances: {},

    create(options) {
        const { id, columns, data, actions, pageSize = 20, searchable = true } = options;
        const container = document.getElementById(id);
        if (!container) return null;

        let html = '';
        if (searchable) {
            html += '<div class="flex gap-3 mb-4 flex-wrap"><input type="text" id="' + id + '_search" placeholder="搜索..." class="p-2 border rounded-lg text-sm flex-1 min-w-[150px]" oninput="DataTableComponent.filter(' + "'" + id + "'" + ')"><span class="text-sm text-gray-400 self-center" id="' + id + '_count">共 ' + data.length + ' 条</span></div>';
        }
        html += '<div class="overflow-x-auto"><table class="w-full text-sm" id="' + id + '_table"><thead><tr class="border-b bg-gray-50">';
        columns.forEach(col => {
            html += '<th class="p-2 text-right">' + col.label + '</th>';
        });
        if (actions) html += '<th class="p-2 text-right">操作</th>';
        html += '</tr></thead><tbody id="' + id + '_body"></tbody></table></div>';

        if (data.length > pageSize) {
            html += '<div class="flex justify-between items-center mt-3 text-sm text-gray-500" id="' + id + '_pagination"><span id="' + id + '_page_info">第 1 / ' + Math.ceil(data.length / pageSize) + ' 页</span><div class="flex gap-2"><button onclick="DataTableComponent.prevPage(' + "'" + id + "'" + ')" class="px-3 py-1 border rounded hover:bg-gray-50">上一页</button><button onclick="DataTableComponent.nextPage(' + "'" + id + "'" + ')" class="px-3 py-1 border rounded hover:bg-gray-50">下一页</button></div></div>';
        }

        container.innerHTML = html;

        this._instances[id] = { columns, data, actions, pageSize, filteredData: data, currentPage: 1 };
        this._render(id);
        return this._instances[id];
    },

    _render(id) {
        const instance = this._instances[id];
        if (!instance) return;
        const { columns, actions, pageSize } = instance;
        const data = instance.filteredData || [];
        const currentPage = instance.currentPage || 1;
        const start = (currentPage - 1) * pageSize;
        const end = Math.min(start + pageSize, data.length);
        const pageData = data.slice(start, end);
        const totalPages = Math.ceil(data.length / pageSize) || 1;

        const tbody = document.getElementById(id + '_body');
        if (!tbody) return;
        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="100" class="p-4 text-center text-gray-400">暂无数据</td></tr>';
            return;
        }

        let html = '';
        pageData.forEach((row, index) => {
            html += '<tr class="border-b hover:bg-gray-50">';
            columns.forEach(col => {
                const value = row[col.key] !== undefined ? row[col.key] : '';
                html += '<td class="p-2">' + (col.format ? col.format(value, row) : value) + '</td>';
            });
            if (actions) {
                html += '<td class="p-2">' + actions(row, index) + '</td>';
            }
            html += '</tr>';
        });
        tbody.innerHTML = html;

        const pageInfo = document.getElementById(id + '_page_info');
        if (pageInfo) pageInfo.textContent = '第 ' + currentPage + ' / ' + totalPages + ' 页';
        const countEl = document.getElementById(id + '_count');
        if (countEl) countEl.textContent = '共 ' + data.length + ' 条';
    },

    filter(id) {
        const instance = this._instances[id];
        if (!instance) return;
        const searchInput = document.getElementById(id + '_search');
        const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (!keyword) {
            instance.filteredData = instance.data;
        } else {
            instance.filteredData = instance.data.filter(row => {
                return Object.values(row).some(val => String(val).toLowerCase().includes(keyword));
            });
        }
        instance.currentPage = 1;
        this._render(id);
    },

    prevPage(id) {
        const instance = this._instances[id];
        if (!instance || instance.currentPage <= 1) return;
        instance.currentPage--;
        this._render(id);
    },

    nextPage(id) {
        const instance = this._instances[id];
        if (!instance) return;
        const totalPages = Math.ceil((instance.filteredData || []).length / instance.pageSize) || 1;
        if (instance.currentPage >= totalPages) return;
        instance.currentPage++;
        this._render(id);
    },

    refresh(id, newData) {
        const instance = this._instances[id];
        if (!instance) return;
        instance.data = newData || instance.data;
        instance.filteredData = instance.data;
        instance.currentPage = 1;
        this._render(id);
    },

    destroy(id) {
        const container = document.getElementById(id);
        if (container) container.innerHTML = '';
        delete this._instances[id];
    }
};

console.log('[DataTableComponent] 加载完成');
"@

$datatableJS | Out-File -Encoding UTF8 -FilePath "components/datatable.js"

# ============================================================
# 完成
# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ 所有缺失文件已补全完成！" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📂 新增文件列表:" -ForegroundColor Yellow
Write-Host "    ├── js/router.js"
Write-Host "    ├── services/"
Write-Host "    │   ├── supabase.js"
Write-Host "    │   ├── authService.js"
Write-Host "    │   ├── orderService.js"
Write-Host "    │   └── inventoryService.js"
Write-Host "    └── components/"
Write-Host "        ├── navbar.js"
Write-Host "        ├── sidebar.js"
Write-Host "        ├── modal.js"
Write-Host "        └── datatable.js"
Write-Host ""
Write-Host "📌 现在你的项目结构完全符合目标架构！" -ForegroundColor Cyan
Write-Host ""
Read-Host "按回车键退出"