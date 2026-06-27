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
        list.innerHTML = todayOrders.map(o => 
            <div class="flex justify-between p-2 border-b hover:bg-gray-50">
                <span class="text-sm"></span>
                <span class="font-medium"></span>
                <span class="font-bold text-blue-600"> SAR</span>
            </div>
        ).join('') || '<div class="text-center text-gray-400 py-4">今日暂无订单</div>';
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
        win.document.write(
            <html><head><title>发票</title>
            <style>body{font-family:sans-serif;padding:40px;text-align:center;}
            .inv{max-width:400px;margin:auto;border:1px solid #ddd;padding:30px;border-radius:12px;}
            .tot{font-size:28px;font-weight:bold;color:#0091D5;}</style>
            </head><body>
            <div class="inv"><h2>🧼 CarWash Pro</h2>
            <p></p>
            <p>税号: </p><hr>
            <p><strong>车牌:</strong> </p>
            <p><strong>日期:</strong> </p><hr>
            <p class="tot">总计: </p>
            <p style="font-size:12px;color:#999;">感谢光临</p></div>
            <script>setTimeout(()=>window.print(),300)<\/script>
            </body></html>
        );
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
