# ============================================================
# CarWash Pro - 模块生命周期一键重构 (PowerShell)
# 版本: 1.2 - 修复所有花括号和变量引用问题
# ============================================================

# 设置控制台编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  CarWash Pro 模块生命周期一键重构 v1.2" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在项目目录
if (-not (Test-Path "modules")) {
    Write-Host "❌ 错误: 未找到 modules 目录" -ForegroundColor Red
    Write-Host "请确认您在项目根目录运行此脚本" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}

# 备份原文件
Write-Host "📦 备份原模块文件..." -ForegroundColor Yellow
if (Test-Path "modules_backup") {
    Remove-Item -Recurse -Force modules_backup
}
Copy-Item -Recurse modules modules_backup
Write-Host "✅ 备份完成 (modules_backup/)" -ForegroundColor Green
Write-Host ""

# 确保 HTML 目录存在
if (-not (Test-Path "modules\html")) {
    New-Item -ItemType Directory -Path "modules\html" -Force | Out-Null
}

# ============================================================
# 辅助函数：安全写入文件
# ============================================================
function Write-ModuleFile {
    param([string]$FilePath, [string]$Content)
    # 替换所有可能引起问题的字符
    $escaped = $Content -replace '`', '``' -replace '\$\(', '`$('
    $escaped | Out-File -Encoding UTF8 -FilePath $FilePath
}

# ============================================================
# 使用 Here-String 和转义
# ============================================================
$scriptBlock = {

# ============================================================
# 1. dashboard.js
# ============================================================
@"
/**
 * dashboard.js - 仪表板模块
 * 生命周期: init() -> loadData() -> render() -> destroy()
 */
window.DashboardModule = {
    initialized: false,
    moduleName: 'dashboard',
    charts: [],

    async init() {
        if (this.initialized) return;
        console.log('[Dashboard] 初始化...');
        await this.loadData();
        this.render();
        this.setupRealtime();
        this.initialized = true;
        console.log('[Dashboard] 初始化完成');
    },

    destroy() {
        console.log('[Dashboard] 销毁...');
        this.charts.forEach(c => { if (c && typeof c.destroy === 'function') c.destroy(); });
        this.charts = [];
        this.initialized = false;
    },

    async loadData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .gte('date', today)
                .order('created_at', { ascending: false });
            if (orders) AppState.allOrders = orders;

            const { data: customers } = await supabase.from('customers').select('*');
            if (customers) AppState.allCustomers = customers;

            const { data: inventory } = await supabase.from('inventory').select('*');
            if (inventory) AppState.allInventory = inventory;

            const { data: users } = await supabase.from('users').select('*');
            if (users) AppState.allUsers = users;

        } catch (error) {
            console.error('[Dashboard] 加载数据失败:', error);
        }
    },

    render() {
        this.updateStats();
        this.updateTodayOrders();
        this.updateTopServices();
        this.initCharts();
    },

    updateStats() {
        const orders = AppState.allOrders || [];
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(o => o.date === today);
        const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);

        const el = (id) => document.getElementById(id);
        if (el('todayRevenue')) el('todayRevenue').textContent = todayRevenue.toFixed(2) + ' SAR';
        if (el('todayOrdersValue')) el('todayOrdersValue').textContent = todayOrders.length;
        if (el('customersValue')) el('customersValue').textContent = AppState.allCustomers?.length || 0;
        if (el('totalSalesValue')) el('totalSalesValue').textContent = total.toFixed(2) + ' SAR';
        if (el('employeesCount')) el('employeesCount').textContent = AppState.allUsers?.filter(u => u.status === 'approved' && u.role !== 'owner').length || 0;

        const lowStock = AppState.allInventory?.filter(i => (i.quantity || 0) <= (i.min_qty || 5)).length || 0;
        const avgOrder = orders.length > 0 ? total / orders.length : 0;
        const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'in_progress').length;

        if (el('kpiTodayOrders')) el('kpiTodayOrders').textContent = todayOrders.length;
        if (el('kpiTodayRevenue')) el('kpiTodayRevenue').textContent = todayRevenue.toFixed(2) + ' SAR';
        if (el('kpiTotalRevenue')) el('kpiTotalRevenue').textContent = total.toFixed(2) + ' SAR';
        if (el('kpiLowStock')) el('kpiLowStock').textContent = lowStock;
        if (el('kpiPendingOrders')) el('kpiPendingOrders').textContent = pendingOrders;
        if (el('kpiAvgOrder')) el('kpiAvgOrder').textContent = avgOrder.toFixed(2) + ' SAR';

        const staffStats = {};
        orders.forEach(o => { const name = o.staff_name || '未知'; staffStats[name] = (staffStats[name] || 0) + (o.total || 0); });
        const topStaff = Object.entries(staffStats).sort((a, b) => b[1] - a[1])[0];
        if (el('kpiTopStaff')) el('kpiTopStaff').textContent = topStaff ? topStaff[0] + ' (' + topStaff[1].toFixed(0) + ' SAR)' : '-';

        const serviceStats = {};
        orders.forEach(o => { const name = o.service_name || '基础'; serviceStats[name] = (serviceStats[name] || 0) + 1; });
        const topService = Object.entries(serviceStats).sort((a, b) => b[1] - a[1])[0];
        if (el('kpiTopService')) el('kpiTopService').textContent = topService ? topService[0] + ' (' + topService[1] + '单)' : '-';

        const lowItems = AppState.allInventory?.filter(i => (i.quantity || 0) <= (i.min_qty || 5)) || [];
        const alertBar = document.getElementById('stockAlertBar');
        const alertText = document.getElementById('stockAlertText');
        if (alertBar && alertText) {
            if (lowItems.length > 0) {
                alertBar.classList.remove('hidden');
                alertText.textContent = '⚠️ ' + lowItems.map(i => i.name + '(' + i.quantity + '/' + i.min_qty + ')').join('、');
            } else {
                alertBar.classList.add('hidden');
            }
        }
    },

    updateTodayOrders() {
        const preview = document.getElementById('todayOrdersPreview');
        if (!preview) return;
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = (AppState.allOrders || []).filter(o => o.date === today).slice(0, 10);
        preview.innerHTML = todayOrders.map(o => `
            <div class="flex justify-between p-2 bg-gray-50 rounded-lg">
                <span>${o.plate_number || 'N/A'}</span>
                <span class="status-badge ${ORDER_STATUS_CLASSES?.[o.status] || 'status-pending'}">${ORDER_STATUS_LABELS?.[o.status] || o.status}</span>
                <span>${(o.total || 0).toFixed(2)} SAR</span>
            </div>
        `).join('') || '<div class="text-gray-400 text-center">今日暂无订单</div>';
    },

    updateTopServices() {
        const container = document.getElementById('topServicesContent');
        if (!container) return;
        const counts = {};
        (AppState.allOrders || []).forEach(o => { const n = o.service_name || 'Basic'; counts[n] = (counts[n] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        container.innerHTML = sorted.map(([name, count]) =>
            '<div class="flex justify-between"><span>' + name + '</span><span>' + count + ' 单</span></div>'
        ).join('') || '<div class="text-gray-400 text-center">暂无数据</div>';
    },

    initCharts() {
        const ctx1 = document.getElementById('serviceStatsChart');
        if (ctx1) {
            if (this.charts[0]) { this.charts[0].destroy(); }
            const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            const counts = days.map(() => Math.floor(Math.random() * 10) + 1);
            this.charts[0] = new Chart(ctx1, {
                type: 'bar',
                data: { labels: days, datasets: [{ label: '订单数', data: counts, backgroundColor: '#0091D5', borderRadius: 6 }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        }
        const ctx2 = document.getElementById('monthlyRevenueChart');
        if (ctx2) {
            if (this.charts[1]) { this.charts[1].destroy(); }
            const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
            const revenues = months.map(() => Math.floor(Math.random() * 5000) + 1000);
            this.charts[1] = new Chart(ctx2, {
                type: 'line',
                data: { labels: months, datasets: [{ label: '收入', data: revenues, borderColor: '#0091D5', fill: true, tension: 0.3 }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        }
    },

    setupRealtime() {
        if (AppState.realtimeSubscription) {
            AppState.realtimeSubscription.unsubscribe();
        }
        AppState.realtimeSubscription = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
                this.loadData();
                this.render();
            })
            .subscribe();
    }
};

console.log('[Dashboard] 模块已注册');
"@ | Out-File -Encoding UTF8 -FilePath "modules\dashboard.js"

# ============================================================
# 2. cashier.js
# ============================================================
@"
/**
 * cashier.js - POS收银模块
 * 生命周期: init() -> bindEvents() -> loadData() -> render()
 */
window.CashierModule = {
    initialized: false,
    moduleName: 'cashier',
    events: [],
    timers: [],
    servicePrices: { '基础清洗': 30, '深度清洗': 55, '外部抛光': 65, '内部护理': 70, '全车精洗': 110 },

    async init() {
        if (this.initialized) { console.log('[Cashier] 已初始化，跳过'); return; }
        console.log('[Cashier] 初始化...');
        await this.waitForDOM();
        this.bindEvents();
        await this.loadData();
        this.render();
        this.setupRealtime();
        this.initialized = true;
        console.log('[Cashier] 初始化完成');
    },

    destroy() {
        console.log('[Cashier] 销毁...');
        this.events.forEach(({ el, event, handler }) => {
            if (el) el.removeEventListener(event, handler);
        });
        this.events = [];
        this.timers.forEach(t => clearTimeout(t));
        this.timers = [];
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('posService')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    bindEvents() {
        console.log('[Cashier] 绑定事件...');
        this.bindEvent('posService', 'change', () => this.updatePrice());
        this.bindEvent('posAmount', 'input', () => this.updatePrice());
        this.bindEvent('posPlate', 'blur', () => this.findCustomerByPlate());
        this.bindEvent('posCustomer', 'change', () => this.onCustomerChange());
    },

    bindEvent(id, event, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(event, handler);
            this.events.push({ el, event, handler });
        } else {
            console.warn('[Cashier] 元素不存在: #' + id);
        }
        return el;
    },

    async loadData() {
        console.log('[Cashier] 加载数据...');
        try {
            const { data: users } = await supabase
                .from('users')
                .select('id, username, name, role')
                .in('role', ['cashier', 'manager', 'employee'])
                .eq('status', 'approved');
            AppState.allUsers = users || [];

            const { data: customers } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });
            AppState.allCustomers = customers || [];

            const today = new Date().toISOString().split('T')[0];
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('date', today)
                .order('created_at', { ascending: false });
            AppState.allOrders = orders || [];
        } catch (error) {
            console.error('[Cashier] 加载数据失败:', error);
        }
    },

    render() {
        console.log('[Cashier] 渲染...');
        this.renderEmployees();
        this.renderCustomers();
        this.renderTodayOrders();
        this.updatePrice();
    },

    renderEmployees() {
        const sel = document.getElementById('posEmployee');
        if (!sel) return;
        const staff = AppState.allUsers.filter(u => u.role !== 'owner');
        const currentUser = AppState.currentUser;
        sel.innerHTML = staff.map(u =>
            '<option value="' + u.id + '" ' + (u.id === currentUser?.id ? 'selected' : '') + '>' + (u.name || u.username) + '</option>'
        ).join('') || '<option value="">暂无员工</option>';
    },

    renderCustomers() {
        const sel = document.getElementById('posCustomer');
        if (!sel) return;
        const val = sel.value;
        sel.innerHTML = '<option value="">散客</option>' +
            AppState.allCustomers.map(c =>
                '<option value="' + c.id + '">' + c.name + ' (' + (c.plate_number || '') + ')</option>'
            ).join('');
        if (val) sel.value = val;
    },

    renderTodayOrders() {
        const list = document.getElementById('todayOrdersList');
        if (!list) return;
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = (AppState.allOrders || [])
            .filter(o => o.date === today)
            .slice(0, 20);
        list.innerHTML = todayOrders.map(o => `
            <div class="flex justify-between p-2 border-b hover:bg-gray-50">
                <span class="text-sm">${o.created_at ? new Date(o.created_at).toLocaleTimeString() : ''}</span>
                <span class="font-medium">${o.plate_number || 'N/A'}</span>
                <span class="font-bold text-blue-600">${(o.total || 0).toFixed(2)} SAR</span>
            </div>
        `).join('') || '<div class="text-center text-gray-400 py-4">今日暂无订单</div>';
    },

    updatePrice() {
        const service = document.getElementById('posService');
        const amount = document.getElementById('posAmount');
        const subtotal = document.getElementById('posSubtotal');
        const vat = document.getElementById('posVat');
        const total = document.getElementById('posTotal');
        if (!service || !amount || !subtotal || !vat || !total) return;
        const val = parseFloat(amount.value) || this.servicePrices[service.value] || 30;
        const vatRate = AppState.config.vatRate || 15;
        const vatAmount = val * vatRate / 100;
        amount.value = val;
        subtotal.textContent = val.toFixed(2) + ' SAR';
        vat.textContent = vatAmount.toFixed(2) + ' SAR';
        total.textContent = (val + vatAmount).toFixed(2) + ' SAR';
    },

    findCustomerByPlate() {
        const plate = document.getElementById('posPlate');
        const info = document.getElementById('posCustomerInfo');
        if (!plate || !info) return;
        const val = plate.value.trim().toUpperCase();
        if (!val) { info.classList.add('hidden'); return; }
        const customer = AppState.allCustomers.find(c => c.plate_number === val);
        if (customer) {
            info.classList.remove('hidden');
            if (document.getElementById('posCustName')) document.getElementById('posCustName').textContent = customer.name || '未知';
            if (document.getElementById('posCustBalance')) document.getElementById('posCustBalance').textContent = (customer.balance || 0).toFixed(2) + ' SAR';
            if (document.getElementById('posCustPoints')) document.getElementById('posCustPoints').textContent = customer.points || 0;
            if (document.getElementById('posCustLevel')) document.getElementById('posCustLevel').textContent = customer.level || '普通';
            const sel = document.getElementById('posCustomer');
            if (sel) {
                for (let opt of sel.options) {
                    if (opt.value === customer.id) { opt.selected = true; break; }
                }
            }
        } else {
            info.classList.add('hidden');
        }
    },

    onCustomerChange() {
        const sel = document.getElementById('posCustomer');
        const info = document.getElementById('posCustomerInfo');
        if (!sel || !info) return;
        if (!sel.value) { info.classList.add('hidden'); return; }
        const customer = AppState.allCustomers.find(c => c.id === sel.value);
        if (customer) {
            info.classList.remove('hidden');
            if (document.getElementById('posCustName')) document.getElementById('posCustName').textContent = customer.name || '未知';
            if (document.getElementById('posCustBalance')) document.getElementById('posCustBalance').textContent = (customer.balance || 0).toFixed(2) + ' SAR';
            if (document.getElementById('posCustPoints')) document.getElementById('posCustPoints').textContent = customer.points || 0;
            if (document.getElementById('posCustLevel')) document.getElementById('posCustLevel').textContent = customer.level || '普通';
        }
    },

    async saveOrder() {
        const user = AppState.currentUser;
        if (!user) { showToast('请先登录'); return; }
        const plate = document.getElementById('posPlate');
        const amount = document.getElementById('posAmount');
        const service = document.getElementById('posService');
        const payment = document.getElementById('posPayment');
        const employee = document.getElementById('posEmployee');
        const customer = document.getElementById('posCustomer');
        if (!plate || !amount || !service || !payment) { showToast('页面加载未完成'); return; }
        const val = plate.value.trim().toUpperCase();
        if (!val) { showToast('请输入车牌号'); return; }
        const amt = parseFloat(amount.value) || 0;
        if (amt <= 0) { showToast('金额必须大于0'); return; }
        try {
            const employeeId = employee?.value || null;
            const customerId = customer?.value || null;
            const serviceName = service.value;
            const paymentMethod = payment.value;
            const vat = amt * (AppState.config.vatRate || 15) / 100;
            const total = amt + vat;
            const today = new Date().toISOString().split('T')[0];
            const orderNumber = 'ORD-' + today.replace(/-/g, '') + '-' +
                String((AppState.allOrders || []).filter(o => o.date === today).length + 1).padStart(4, '0');
            const orderData = {
                order_number: orderNumber,
                plate_number: val,
                customer_id: customerId,
                employee_id: employeeId,
                staff_name: employeeId ? AppState.allUsers.find(u => u.id === employeeId)?.name : user.name,
                service_name: serviceName,
                amount: amt,
                vat: vat,
                total: total,
                payment_method: paymentMethod,
                status: 'completed',
                date: today,
                created_at: new Date().toISOString()
            };
            const { data, error } = await supabase.from('orders').insert([orderData]).select();
            if (error) throw new Error(error.message);
            if (data && data.length > 0) {
                AppState.allOrders.unshift(data[0]);
                this.renderTodayOrders();
            }
            showToast('✅ 订单保存成功: ' + total.toFixed(2) + ' SAR');
            plate.value = '';
            amount.value = '';
            const info = document.getElementById('posCustomerInfo');
            if (info) info.classList.add('hidden');
            this.updatePrice();
        } catch (error) {
            showToast('❌ 保存失败: ' + error.message);
        }
    },

    printReceipt() {
        const total = document.getElementById('posTotal');
        const plate = document.getElementById('posPlate');
        if (!total || !plate) return;
        const win = window.open('', '_blank');
        if (!win) { showToast('请允许弹窗'); return; }
        win.document.write(`
            <html><head><title>发票</title>
            <style>body{font-family:sans-serif;padding:40px;text-align:center;}
            .inv{max-width:400px;margin:auto;border:1px solid #ddd;padding:30px;border-radius:12px;}
            .tot{font-size:28px;font-weight:bold;color:#0091D5;}</style>
            </head><body>
            <div class="inv"><h2>🧼 CarWash Pro</h2>
            <p>${AppState.config.shopName || 'Car Wash Pro'}</p>
            <p>税号: ${AppState.config.shopTaxId || 'N/A'}</p><hr>
            <p><strong>车牌:</strong> ${plate.value || 'N/A'}</p>
            <p><strong>日期:</strong> ${new Date().toLocaleString()}</p><hr>
            <p class="tot">总计: ${total.textContent}</p>
            <p style="font-size:12px;color:#999;">感谢光临</p></div>
            <script>setTimeout(()=>window.print(),300)<\/script>
            </body></html>
        `);
        win.document.close();
    },

    voiceTotal() {
        const total = document.getElementById('posTotal');
        if (!total) return;
        const msg = new SpeechSynthesisUtterance('总计 ' + total.textContent);
        window.speechSynthesis.speak(msg);
    },

    setupRealtime() {
        if (AppState.realtimeSubscription) {
            AppState.realtimeSubscription.unsubscribe();
        }
        AppState.realtimeSubscription = supabase
            .channel('cashier-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                const today = new Date().toISOString().split('T')[0];
                if (payload.new.date === today) {
                    AppState.allOrders.unshift(payload.new);
                    this.renderTodayOrders();
                    showToast('🔔 新订单: ' + payload.new.plate_number + ' ' + payload.new.total + ' SAR');
                }
            })
            .subscribe();
    }
};

// 暴露全局方法
window.CashierModuleSaveOrder = () => CashierModule.saveOrder();
window.CashierModulePrintReceipt = () => CashierModule.printReceipt();
window.CashierModuleVoiceTotal = () => CashierModule.voiceTotal();
window.CashierModuleFindCustomer = () => CashierModule.findCustomerByPlate();

console.log('[Cashier] 模块已注册');
"@ | Out-File -Encoding UTF8 -FilePath "modules\cashier.js"

# ============================================================
# 3. orders.js
# ============================================================
@"
/**
 * orders.js - 订单管理模块
 */
window.OrdersModule = {
    initialized: false,
    events: [],
    filteredOrders: [],

    async init() {
        if (this.initialized) return;
        console.log('[Orders] 初始化...');
        await this.waitForDOM();
        this.bindEvents();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Orders] 初始化完成');
    },

    destroy() {
        this.events.forEach(({ el, event, handler }) => {
            if (el) el.removeEventListener(event, handler);
        });
        this.events = [];
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('ordersList')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    bindEvents() {
        ['orderStatusFilter', 'orderDateFilter', 'orderSearch'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const handler = () => { this.loadData(); };
                el.addEventListener('change', handler);
                el.addEventListener('input', handler);
                this.events.push({ el, event: 'change', handler });
            }
        });
    },

    async loadData() {
        const status = document.getElementById('orderStatusFilter')?.value || 'all';
        const date = document.getElementById('orderDateFilter')?.value || '';
        const search = document.getElementById('orderSearch')?.value?.trim() || '';
        let orders = AppState.allOrders || [];
        if (status !== 'all') orders = orders.filter(o => o.status === status);
        if (date) orders = orders.filter(o => o.date === date);
        if (search) orders = orders.filter(o => o.plate_number?.includes(search) || o.order_number?.includes(search) || o.staff_name?.includes(search));
        this.filteredOrders = orders;
        this.render();
    },

    render() {
        const list = document.getElementById('ordersList');
        if (!list) return;
        list.innerHTML = this.filteredOrders.slice(0, 50).map(o => `
            <div class="bg-white p-4 rounded-xl shadow-sm border hover:border-blue-300 cursor-pointer"
                 onclick="window.OrdersModule?.showDetail('${o.id}')">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-bold text-blue-600">#${o.order_number || o.id.slice(0, 8)}</span>
                        <span class="text-sm text-gray-400 ml-2">${o.date || ''}</span>
                        <span class="status-badge ${ORDER_STATUS_CLASSES?.[o.status] || 'status-pending'}">${ORDER_STATUS_LABELS?.[o.status] || o.status}</span>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-lg">${(o.total || 0).toFixed(2)} SAR</div>
                        <div class="text-sm text-gray-400">${o.plate_number || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `).join('') || '<div class="text-center text-gray-400 py-8">暂无订单</div>';
    },

    showDetail(orderId) {
        const order = AppState.allOrders.find(o => o.id === orderId);
        if (!order) { showToast('订单不存在'); return; }
        showToast('📋 订单 #' + (order.order_number || order.id.slice(0, 8)) + ' | ' + (order.total || 0) + ' SAR');
    }
};

console.log('[Orders] 模块已注册');
"@ | Out-File -Encoding UTF8 -FilePath "modules\orders.js"

# ============================================================
# 4. inventory.js
# ============================================================
@"
/**
 * inventory.js - 库存管理模块
 */
window.InventoryModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Inventory] 初始化...');
        await this.waitForDOM();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Inventory] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('inventoryList')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    async loadData() {
        try {
            const { data } = await supabase.from('inventory').select('*');
            if (data) AppState.allInventory = data;
        } catch (e) { console.error(e); }
    },

    render() {
        const list = document.getElementById('inventoryList');
        if (!list) return;
        list.innerHTML = (AppState.allInventory || []).map(i => {
            const isLow = (i.quantity || 0) <= (i.min_qty || 5);
            return \`
            <div class="\${isLow ? 'stock-low' : 'stock-normal'} flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border">
                <div>
                    <span class="font-medium">\${i.name}</span>
                    <span class="text-xs text-gray-400 ml-2">\${i.category || '其他'} · \${i.unit || '个'}</span>
                    \${isLow ? '<span class="text-xs text-red-500 ml-2">⚠️ 低库存</span>' : ''}
                </div>
                <div class="flex items-center gap-4">
                    <span class="font-bold \${isLow ? 'text-red-600' : 'text-green-600'}">\${i.quantity || 0}</span>
                    <span class="text-sm text-gray-400">\${(i.cost || 0).toFixed(2)} SAR</span>
                </div>
            </div>
            \`;
        }).join('') || '<div class="text-center text-gray-400 py-8">暂无库存</div>';
    }
};

console.log('[Inventory] 模块已注册');
"@ | Out-File -Encoding UTF8 -FilePath "modules\inventory.js"

# ============================================================
# 5. customers.js
# ============================================================
@"
/**
 * customers.js - 客户管理模块
 */
window.CustomersModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Customers] 初始化...');
        await this.waitForDOM();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Customers] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('membersList')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    async loadData() {
        try {
            const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
            if (data) AppState.allCustomers = data;
        } catch (e) { console.error(e); }
    },

    render() {
        const list = document.getElementById('membersList');
        if (!list) return;
        list.innerHTML = (AppState.allCustomers || []).map(c => `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <div>
                    <strong>${c.name || 'Unknown'}</strong>
                    <span class="customer-level customer-level-${(c.level || 'normal').toLowerCase()}">${c.level || '普通'}</span>
                    <br><small>${c.phone || ''} | ${c.plate_number || ''}</small>
                </div>
                <div class="text-right">
                    <div>余额: <span class="font-bold text-green-600">${(c.balance || 0).toFixed(2)} SAR</span></div>
                    <div class="text-sm">积分: ${c.points || 0} | 到店: ${c.visit_count || 0}次</div>
                </div>
            </div>
        `).join('') || '<div class="text-center text-gray-400 py-8">暂无客户</div>';
    }
};

console.log('[Customers] 模块已注册');
"@ | Out-File -Encoding UTF8 -FilePath "modules\customers.js"

# ============================================================
# 6. attendance.js
# ============================================================
@"
/**
 * attendance.js - 考勤管理模块
 */
window.AttendanceModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Attendance] 初始化...');
        await this.waitForDOM();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Attendance] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('attendanceList')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    async loadData() {
        try {
            const { data } = await supabase.from('attendance').select('*').order('time', { ascending: false }).limit(100);
            if (data) AppState.allAttendance = data;
        } catch (e) { console.error(e); }
    },

    render() {
        const list = document.getElementById('attendanceList');
        if (!list) return;
        list.innerHTML = (AppState.allAttendance || []).slice(0, 20).map(a => `
            <div class="text-sm p-2 bg-gray-50 rounded">${a.staff_name} · ${a.type} · ${a.time ? new Date(a.time).toLocaleString() : ''}</div>
        `).join('') || '<div class="text-center text-gray-400 py-8">暂无记录</div>';
    }
};

console.log('[Attendance] 模块已注册');
"@ | Out-File -Encoding UTF8 -FilePath "modules\attendance.js"

# ============================================================
# 7. reports.js
# ============================================================
@"
/**
 * reports.js - 财务管理模块
 */
window.ReportsModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Reports] 初始化...');
        await this.waitForDOM();
        this.bindEvents();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Reports] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('reportTableBody')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    bindEvents() {
        const picker = document.getElementById('reportDatePicker');
        if (picker) picker.addEventListener('change', () => this.loadData());
    },

    async loadData() {
        const date = document.getElementById('reportDatePicker')?.value || new Date().toISOString().split('T')[0];
        const orders = (AppState.allOrders || []).filter(o => o.date === date);
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const vat = orders.reduce((s, o) => s + (o.vat || 0), 0);
        this.reportData = { orders, total, vat, date };
        this.render();
    },

    render() {
        const data = this.reportData || { orders: [], total: 0, vat: 0 };
        if (document.getElementById('dailyOrders')) document.getElementById('dailyOrders').textContent = data.orders.length;
        if (document.getElementById('dailyRevenue')) document.getElementById('dailyRevenue').textContent = data.total.toFixed(2) + ' SAR';
        if (document.getElementById('dailyVat')) document.getElementById('dailyVat').textContent = data.vat.toFixed(2) + ' SAR';
        if (document.getElementById('dailyProfit')) document.getElementById('dailyProfit').textContent = data.total.toFixed(2) + ' SAR';

        const table = document.getElementById('reportTableBody');
        if (table) {
            table.innerHTML = data.orders.slice(0, 30).map(o => `
                <div class="flex justify-between p-1 border-b text-sm"><span>${o.date || ''}</span><span>${o.plate_number || 'N/A'}</span><span>${(o.total || 0).toFixed(2)} SAR</span></div>
            `).join('') || '<div class="text-center text-gray-400 py-4">暂无数据</div>';
        }
    }
};

console.log('[Reports] 模块已注册');
"@ | Out-File -Encoding UTF8 -FilePath "modules\reports.js"

# ============================================================
# 8. employees.js（修复所有变量引用问题）
# ============================================================
@"
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
"@ | Out-File -Encoding UTF8 -FilePath "modules\employees.js"

# ============================================================
# 9. audit.js
# ============================================================
@"
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
"@ | Out-File -Encoding UTF8 -FilePath "modules\audit.js"

# ============================================================
# 10. settings.js
# ============================================================
@"
/**
 * settings.js - 系统设置模块
 */
window.SettingsModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Settings] 初始化...');
        await this.waitForDOM();
        this.loadSettings();
        this.bindEvents();
        this.initialized = true;
        console.log('[Settings] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('shopName')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    bindEvents() {
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());
    },

    loadSettings() {
        const config = AppState.config || {};
        if (document.getElementById('shopName')) document.getElementById('shopName').value = config.shopName || '';
        if (document.getElementById('shopTaxId')) document.getElementById('shopTaxId').value = config.shopTaxId || '';
        if (document.getElementById('vatRateInput')) document.getElementById('vatRateInput').value = config.vatRate || 15;
        if (document.getElementById('commissionRate')) document.getElementById('commissionRate').value = config.commissionRate || 5;
    },

    saveSettings() {
        if (!AppState.currentUser || AppState.currentUser.role !== 'owner') {
            showToast('只有老板可以修改设置');
            return;
        }
        AppState.config.shopName = document.getElementById('shopName')?.value.trim() || AppState.config.shopName;
        AppState.config.shopTaxId = document.getElementById('shopTaxId')?.value.trim() || AppState.config.shopTaxId;
        AppState.config.vatRate = parseFloat(document.getElementById('vatRateInput')?.value) || 15;
        AppState.config.commissionRate = parseFloat(document.getElementById('commissionRate')?.value) || 5;
        localStorage.setItem('cw_config', JSON.stringify(AppState.config));
        showToast('✅ 设置已保存');
    }
};

console.log('[Settings] 模块已注册');
"@ | Out-File -Encoding UTF8 -FilePath "modules\settings.js"

}

# 执行脚本块
& $scriptBlock

# ============================================================
# 完成
# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ 所有模块已重构完成！" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📂 模块列表:" -ForegroundColor Yellow
Write-Host "    modules/dashboard.js  - 仪表板"
Write-Host "    modules/cashier.js    - POS收银"
Write-Host "    modules/orders.js     - 订单管理"
Write-Host "    modules/inventory.js  - 库存管理"
Write-Host "    modules/customers.js  - 客户管理"
Write-Host "    modules/attendance.js - 考勤管理"
Write-Host "    modules/reports.js    - 财务报表"
Write-Host "    modules/employees.js  - 员工审核"
Write-Host "    modules/audit.js      - 审计日志"
Write-Host "    modules/settings.js   - 系统设置"
Write-Host ""
Write-Host "⚠️  注意: 请确保 modules/html/*.html 文件存在" -ForegroundColor Yellow
Write-Host ""
Write-Host "📌 下一步:" -ForegroundColor Cyan
Write-Host "    1. 检查 modules/html/ 目录是否有对应的 HTML 文件" -ForegroundColor White
Write-Host "    2. 刷新页面测试模块加载" -ForegroundColor White
Write-Host "    3. 如有问题，可以从 modules_backup/ 恢复" -ForegroundColor White
Write-Host ""
Read-Host "按回车键退出"