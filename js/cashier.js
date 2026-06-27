// ================================================================
//  cashier.js - POS/收银模块
// ================================================================

const CashierModule = {
    _boundUpdatePrice: null,
    _boundAmountChange: null,

    init() {
        console.log('💰 CashierModule 初始化');
        // 检查DOM是否存在
        if (!document.getElementById('posService')) {
            console.warn('⚠️ POS元素未加载，延迟重试');
            setTimeout(() => this.init(), 300);
            return;
        }
        this.refresh();
        this.bindEvents();
    },

    destroy() {
        console.log('💰 CashierModule 销毁');
        const service = document.getElementById('posService');
        if (service && this._boundUpdatePrice) {
            service.removeEventListener('change', this._boundUpdatePrice);
        }
        const amount = document.getElementById('posAmount');
        if (amount && this._boundAmountChange) {
            amount.removeEventListener('input', this._boundAmountChange);
        }
    },

    refresh() {
        this.refreshPOS();
        this.updatePOSPrice();
    },

    bindEvents() {
        const service = document.getElementById('posService');
        if (service) {
            this._boundUpdatePrice = () => this.updatePOSPrice();
            service.addEventListener('change', this._boundUpdatePrice);
        }
        const amount = document.getElementById('posAmount');
        if (amount) {
            this._boundAmountChange = function() {
                const val = parseFloat(this.value) || 0;
                const vat = val * (config.vatRate || 15) / 100;
                const subtotal = document.getElementById('posSubtotal');
                const vatEl = document.getElementById('posVat');
                const totalEl = document.getElementById('posTotal');
                if (subtotal) subtotal.textContent = val.toFixed(2) + ' SAR';
                if (vatEl) vatEl.textContent = vat.toFixed(2) + ' SAR';
                if (totalEl) totalEl.textContent = (val + vat).toFixed(2) + ' SAR';
            };
            amount.addEventListener('input', this._boundAmountChange);
        }
    },

    refreshPOS() {
        const custSel = document.getElementById('posCustomer');
        if (custSel) {
            const val = custSel.value;
            custSel.innerHTML = '<option value="">散客</option>' +
                (allCustomers || []).map(c => `<option value="${c.id}">${c.name} (${c.plate_number || ''})</option>`).join('');
            if (val) custSel.value = val;
        }
        const empSel = document.getElementById('posEmployee');
        if (empSel) {
            const staff = (allUsers || []).filter(u => u.role !== 'owner' && u.status === 'approved');
            empSel.innerHTML = staff.map(u => `<option value="${u.id}">${u.name || u.username}</option>`).join('');
            if (currentUser) {
                for (let opt of empSel.options) {
                    if (opt.value === currentUser.id) { opt.selected = true; break; }
                }
            }
        }
        this.updatePOSPrice();
    },

    updatePOSPrice() {
        const service = document.getElementById('posService');
        const amount = document.getElementById('posAmount');
        const subtotal = document.getElementById('posSubtotal');
        const vatEl = document.getElementById('posVat');
        const totalEl = document.getElementById('posTotal');
        if (!service || !amount) return;

        const prices = { '基础清洗': 30, '深度清洗': 55, '外部抛光': 65, '内部护理': 70, '全车精洗': 110 };
        const val = prices[service.value] || 30;
        const vat = val * (config.vatRate || 15) / 100;
        amount.value = val;
        if (subtotal) subtotal.textContent = val.toFixed(2) + ' SAR';
        if (vatEl) vatEl.textContent = vat.toFixed(2) + ' SAR';
        if (totalEl) totalEl.textContent = (val + vat).toFixed(2) + ' SAR';
    },

    async saveOrder() {
        if (!currentUser) { showToast('请先登录'); return; }
        const plate = document.getElementById('posPlate')?.value?.trim()?.toUpperCase();
        if (!plate) { showToast('请输入车牌号'); return; }
        const amount = parseFloat(document.getElementById('posAmount')?.value) || 0;
        if (amount <= 0) { showToast('金额必须大于0'); return; }

        try {
            const employeeId = document.getElementById('posEmployee')?.value || null;
            const serviceName = document.getElementById('posService')?.value;
            const paymentMethod = document.getElementById('posPayment')?.value;
            const vat = amount * (config.vatRate || 15) / 100;
            const total = amount + vat;
            const today = new Date().toISOString().split('T')[0];
            const orderNumber = 'ORD-' + today.replace(/-/g, '') + '-' +
                String((allOrders || []).filter(o => (o.date || '').startsWith(today)).length + 1).padStart(4, '0');
            const orderData = {
                order_number: orderNumber,
                plate_number: plate,
                employee_id: employeeId,
                staff_name: employeeId ? (allUsers || []).find(u => u.id === employeeId)?.name : currentUser.name,
                service_name: serviceName,
                amount: amount,
                vat: vat,
                total: total,
                payment_method: paymentMethod,
                status: 'completed',
                date: today
            };
            const { data, error } = await supabaseClient.from('orders').insert([orderData]).select();
            if (error) throw new Error(error.message);
            if (data && data.length > 0) allOrders.unshift(data[0]);
            if (typeof refreshAll === 'function') refreshAll();
            showToast('✅ 订单保存成功: ' + total.toFixed(2) + ' SAR');
            const plateInput = document.getElementById('posPlate');
            if (plateInput) plateInput.value = '';
        } catch (error) {
            showToast('❌ 保存失败: ' + error.message);
        }
    }
};

window.CashierModule = CashierModule;
window.refreshPOS = function() { CashierModule.refreshPOS(); };
window.updatePOSPrice = function() { CashierModule.updatePOSPrice(); };
window.posSaveOrder = function() { CashierModule.saveOrder(); };
console.log('✅ cashier.js 已加载');