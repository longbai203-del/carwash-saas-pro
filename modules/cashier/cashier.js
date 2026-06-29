/**
 * cashier.js - POS收银模块 V7
 * 包含：服务网格、快捷服务、会员识别、购物车、打印
 */
(function() {
    'use strict';

    window.CashierModule = Object.create(ModuleBase);
    window.CashierModule.moduleName = 'cashier';

    // ============================================================
    // 服务数据（硬编码，确保始终显示）
    // ============================================================
    window.CashierModule.services = [
        // 洗车服务
        { id: 's1', name: '基础清洗', price: 30, category: 'wash', icon: '🧽', desc: '外部冲洗+擦干' },
        { id: 's2', name: '深度清洗', price: 55, category: 'wash', icon: '🧼', desc: '内外深度清洁' },
        { id: 's3', name: '全车精洗', price: 110, category: 'wash', icon: '🚗', desc: '内外全面清洁+打蜡' },
        // 美容服务
        { id: 's4', name: '外部抛光', price: 65, category: 'detail', icon: '✨', desc: '漆面抛光去划痕' },
        { id: 's5', name: '内部护理', price: 70, category: 'detail', icon: '🪑', desc: '内饰深度护理' },
        { id: 's6', name: '全车镀晶', price: 299, category: 'detail', icon: '💎', desc: '全车镀晶保护' },
        { id: 's7', name: '漆面陶瓷涂层', price: 450, category: 'detail', icon: '🔮', desc: '陶瓷涂层保护' },
        // 套餐
        { id: 'p1', name: '月度洗车卡', price: 299, category: 'package', icon: '📅', desc: '30天无限次基础洗' },
        { id: 'p2', name: '季度护理套餐', price: 899, category: 'package', icon: '📦', desc: '精洗+抛光+内部护理' },
        // 商品
        { id: 'pr1', name: '车用香薰', price: 25, category: 'product', icon: '🌺', desc: '车载香薰' },
        { id: 'pr2', name: '玻璃清洁液', price: 18, category: 'product', icon: '🧴', desc: '500ml玻璃清洁' },
        { id: 'pr3', name: '轮胎光亮剂', price: 22, category: 'product', icon: '⚫', desc: '轮胎养护' }
    ];

    // ===== 状态 =====
    window.CashierModule.cart = [];
    window.CashierModule.selectedCustomer = null;
    window.CashierModule.selectedPayment = null;
    window.CashierModule.currentFilter = 'all';
    window.CashierModule.recentServices = [];

    // ===== 服务价格配置（兼容旧代码）=====
    window.CashierModule.servicePrices = {
        '基础清洗': 30,
        '深度清洗': 55,
        '外部抛光': 65,
        '内部护理': 70,
        '全车精洗': 110,
        '全车镀晶': 299
    };

    // ===== 缓存 DOM =====
    window.CashierModule.cacheDom = function() {
        this.el = {
            customer: this.getEl('posCustomer'),
            employee: this.getEl('posEmployee'),
            service: this.getEl('posService'),
            payment: this.getEl('posPayment'),
            plate: this.getEl('posPlate'),
            amount: this.getEl('posAmount'),
            discountInput: this.getEl('posDiscountInput'),
            subtotal: this.getEl('posSubtotal'),
            vat: this.getEl('posVat'),
            discount: this.getEl('posDiscount'),
            total: this.getEl('posTotal'),
            todayList: this.getEl('todayOrdersList'),
            todayRevenue: this.getEl('todayRevenue'),
            todayOrderCount: this.getEl('todayOrderCount'),
            customerInfo: this.getEl('posCustomerInfo'),
            custName: this.getEl('posCustName'),
            custBalance: this.getEl('posCustBalance'),
            custPoints: this.getEl('posCustPoints'),
            custLevel: this.getEl('posCustLevel'),
            orderItemsList: this.getEl('orderItemsList'),
            cashierStatus: this.getEl('cashierStatus'),
            // 服务网格
            serviceGrid: this.getEl('serviceGrid'),
            serviceSearch: this.getEl('serviceSearch'),
            recentServices: this.getEl('recentServices'),
            // 购物车
            cartItems: this.getEl('cartItems'),
            cartSubtotal: this.getEl('cartSubtotal'),
            cartDiscount: this.getEl('cartDiscount'),
            cartVat: this.getEl('cartVat'),
            cartTotal: this.getEl('cartTotal'),
            selectedPayment: this.getEl('selectedPayment'),
            // 二维码
            showQR: this.getEl('posShowQR'),
            qrContent: this.getEl('posQRContent')
        };
        this.cart = [];
        this.recentServices = JSON.parse(localStorage.getItem('recentServices') || '[]');
    };

    // ===== 绑定事件 =====
    window.CashierModule.bindEvents = function() {
        var self = this;

        if (this.el.service) {
            this.el.service.addEventListener('change', function() {
                self.updatePrice();
            });
        }
        if (this.el.amount) {
            this.el.amount.addEventListener('input', function() {
                self.updatePrice();
            });
        }
        if (this.el.discountInput) {
            this.el.discountInput.addEventListener('input', function() {
                self.updatePrice();
            });
        }
        if (this.el.plate) {
            this.el.plate.addEventListener('blur', function() {
                self.findCustomer();
            });
            this.el.plate.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') self.findCustomer();
            });
        }
        if (this.el.customer) {
            this.el.customer.addEventListener('change', function() {
                self.onCustomerChange();
            });
        }
        if (this.el.serviceSearch) {
            this.el.serviceSearch.addEventListener('input', function() {
                self.renderServices();
            });
        }
    };

    // ===== 加载数据 =====
    window.CashierModule.loadData = function() {
        var self = this;
        var users = AppStore.get('allUsers') || [];
        var customers = AppStore.get('allCustomers') || [];
        var orders = AppStore.get('allOrders') || [];

        this.renderEmployees(users);
        this.renderCustomers(customers);
        this.renderTodayOrders(orders);
        this.renderServices();
        this.renderRecentServices();
        this.updatePrice();
        this.updateStatus();
        this.updateCart();

        var config = AppStore.get('config') || {};
        if (this.el.showQR) {
            this.el.showQR.checked = config.showQR !== false;
        }
        if (this.el.qrContent) {
            this.el.qrContent.value = config.qrContent || 'https://carwash.com';
        }
    };

    // ===== 更新状态 =====
    window.CashierModule.updateStatus = function() {
        if (this.el.cashierStatus) {
            var client = window.SupabaseService ? window.SupabaseService.getClient() : null;
            if (client) {
                this.el.cashierStatus.textContent = '🟢 在线';
                this.el.cashierStatus.className = 'text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full';
            } else {
                this.el.cashierStatus.textContent = '🔴 离线';
                this.el.cashierStatus.className = 'text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full';
            }
        }
    };

    // ============================================================
    // 服务网格
    // ============================================================

    window.CashierModule.renderServices = function() {
        var grid = this.el.serviceGrid;
        if (!grid) return;

        var filter = this.currentFilter || 'all';
        var search = this.el.serviceSearch ? this.el.serviceSearch.value.trim().toLowerCase() : '';

        var services = this.services.filter(function(s) {
            var matchFilter = filter === 'all' || s.category === filter;
            var matchSearch = !search || s.name.toLowerCase().indexOf(search) !== -1 || s.desc.toLowerCase().indexOf(search) !== -1;
            return matchFilter && matchSearch;
        });

        if (services.length === 0) {
            grid.innerHTML = '<div class="col-span-2 text-center text-gray-400 py-8 text-sm">未找到服务</div>';
            return;
        }

        var html = '';
        services.forEach(function(s) {
            html += '<div onclick="CashierModule.addToCart(\'' + s.id + '\')" ' +
                    'class="service-item bg-gray-50 hover:bg-blue-50 rounded-xl p-3 border hover:border-blue-300 cursor-pointer transition">' +
                    '<div class="flex items-start gap-2">' +
                    '<span class="text-xl">' + s.icon + '</span>' +
                    '<div class="flex-1">' +
                    '<div class="font-medium text-sm">' + s.name + '</div>' +
                    '<div class="text-xs text-gray-400">' + s.desc + '</div>' +
                    '<div class="text-xs font-bold text-blue-600 mt-1">' + s.price.toFixed(2) + ' SAR</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
        });
        grid.innerHTML = html;
    };

    window.CashierModule.filterServices = function(category) {
        if (category) {
            this.currentFilter = category;
            var btns = document.querySelectorAll('.tab-btn');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.remove('active');
                if (btns[i].dataset.cat === category) {
                    btns[i].classList.add('active');
                }
            }
        }
        this.renderServices();
    };

    // ============================================================
    // 最近使用
    // ============================================================

    window.CashierModule.renderRecentServices = function() {
        var el = this.el.recentServices;
        if (!el) return;

        var recent = this.recentServices.slice(0, 8);
        if (recent.length === 0) {
            el.innerHTML = '<span class="text-xs text-gray-400">暂无最近使用</span>';
            return;
        }

        var html = '';
        for (var i = 0; i < recent.length; i++) {
            var id = recent[i];
            var service = null;
            for (var j = 0; j < this.services.length; j++) {
                if (this.services[j].id === id) {
                    service = this.services[j];
                    break;
                }
            }
            if (service) {
                html += '<button onclick="CashierModule.addToCart(\'' + service.id + '\')" ' +
                        'class="text-xs bg-gray-100 hover:bg-blue-100 px-2 py-1 rounded-lg">' +
                        service.icon + ' ' + service.name +
                        '</button>';
            }
        }
        el.innerHTML = html;
    };

    // ============================================================
    // 添加到购物车
    // ============================================================

    window.CashierModule.addToCart = function(serviceId) {
        var service = null;
        for (var i = 0; i < this.services.length; i++) {
            if (this.services[i].id === serviceId) {
                service = this.services[i];
                break;
            }
        }
        if (!service) return;

        // 检查是否已存在
        var existing = null;
        for (var j = 0; j < this.cart.length; j++) {
            if (this.cart[j].id === serviceId) {
                existing = this.cart[j];
                break;
            }
        }
        if (existing) {
            existing.qty += 1;
        } else {
            this.cart.push({
                id: service.id,
                name: service.name,
                price: service.price,
                icon: service.icon,
                qty: 1
            });
        }

        // 更新最近使用
        this.recentServices = this.recentServices.filter(function(id) { return id !== serviceId; });
        this.recentServices.unshift(serviceId);
        if (this.recentServices.length > 20) this.recentServices.pop();
        localStorage.setItem('recentServices', JSON.stringify(this.recentServices));

        this.updateCart();
        this.renderRecentServices();
        this.toast('✅ 已添加: ' + service.name, 'success');
    };

    // ============================================================
    // 购物车
    // ============================================================

    window.CashierModule.updateCart = function() {
        var list = this.el.cartItems;
        if (!list) return;

        if (this.cart.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 py-8 text-sm">请选择服务或商品</div>';
            this.updateTotals();
            return;
        }

        var html = '';
        for (var i = 0; i < this.cart.length; i++) {
            var item = this.cart[i];
            var total = item.price * item.qty;
            html += '<div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">' +
                    '<div class="flex items-center gap-2">' +
                    '<span>' + item.icon + '</span>' +
                    '<span class="text-sm font-medium">' + item.name + '</span>' +
                    '<div class="flex items-center gap-1">' +
                    '<button onclick="CashierModule.changeQty(' + i + ', -1)" class="text-xs text-gray-400 hover:text-blue-600 w-5 h-5 rounded-full hover:bg-blue-50">-</button>' +
                    '<span class="text-xs w-5 text-center">' + item.qty + '</span>' +
                    '<button onclick="CashierModule.changeQty(' + i + ', 1)" class="text-xs text-gray-400 hover:text-blue-600 w-5 h-5 rounded-full hover:bg-blue-50">+</button>' +
                    '</div>' +
                    '</div>' +
                    '<div class="flex items-center gap-2">' +
                    '<span class="text-sm font-bold text-blue-600">' + total.toFixed(2) + ' SAR</span>' +
                    '<button onclick="CashierModule.removeFromCart(' + i + ')" class="text-red-400 hover:text-red-600 text-xs">✕</button>' +
                    '</div>' +
                    '</div>';
        }
        list.innerHTML = html;
        this.updateTotals();
    };

    window.CashierModule.changeQty = function(index, delta) {
        if (index < 0 || index >= this.cart.length) return;
        var item = this.cart[index];
        item.qty = Math.max(1, item.qty + delta);
        this.updateCart();
    };

    window.CashierModule.removeFromCart = function(index) {
        if (index < 0 || index >= this.cart.length) return;
        this.cart.splice(index, 1);
        this.updateCart();
    };

    window.CashierModule.clearCart = function() {
        if (this.cart.length === 0) return;
        this.cart = [];
        this.updateCart();
        this.toast('🗑️ 已清空购物车', 'info');
    };

    window.CashierModule.updateTotals = function() {
        var subtotal = 0;
        for (var i = 0; i < this.cart.length; i++) {
            subtotal += this.cart[i].price * this.cart[i].qty;
        }

        var discount = this._couponDiscount || 0;
        var vatRate = 15;
        var vat = (subtotal - discount) * vatRate / 100;
        var total = subtotal - discount + vat;

        if (this.el.cartSubtotal) this.el.cartSubtotal.textContent = subtotal.toFixed(2) + ' SAR';
        if (this.el.cartDiscount) this.el.cartDiscount.textContent = discount.toFixed(2) + ' SAR';
        if (this.el.cartVat) this.el.cartVat.textContent = vat.toFixed(2) + ' SAR';
        if (this.el.cartTotal) this.el.cartTotal.textContent = total.toFixed(2) + ' SAR';
    };

    // ============================================================
    // 选择快捷服务（兼容旧代码）
    // ============================================================

    window.CashierModule.selectService = function(name, price) {
        // 查找服务ID
        var serviceId = null;
        for (var i = 0; i < this.services.length; i++) {
            if (this.services[i].name === name) {
                serviceId = this.services[i].id;
                break;
            }
        }
        if (serviceId) {
            this.addToCart(serviceId);
        } else {
            // 兼容旧逻辑
            if (this.el.service) {
                var options = this.el.service.options;
                for (var j = 0; j < options.length; j++) {
                    if (options[j].value === name) {
                        options[j].selected = true;
                        break;
                    }
                }
            }
            if (this.el.amount) {
                this.el.amount.value = price;
            }
            this.updatePrice();
            this.toast('✅ 已选择: ' + name + ' (' + price + ' SAR)', 'success');
        }
    };

    // ===== 更新价格（兼容旧代码）=====
    window.CashierModule.updatePrice = function() {
        var service = this.el.service ? this.el.service.value : '基础清洗';
        var amount = this.el.amount ? parseFloat(this.el.amount.value) || this.servicePrices[service] || 30 : 30;
        var discount = this.el.discountInput ? parseFloat(this.el.discountInput.value) || 0 : 0;
        var config = AppStore.get('config') || {};
        var vatRate = config.vatRate || 15;

        if (discount > amount) {
            discount = amount;
            if (this.el.discountInput) this.el.discountInput.value = discount;
        }

        var vatAmount = (amount - discount) * vatRate / 100;
        var total = amount - discount + vatAmount;

        if (this.el.subtotal) this.el.subtotal.textContent = amount.toFixed(2) + ' SAR';
        if (this.el.vat) this.el.vat.textContent = vatAmount.toFixed(2) + ' SAR';
        if (this.el.discount) this.el.discount.textContent = discount.toFixed(2) + ' SAR';
        if (this.el.total) this.el.total.textContent = total.toFixed(2) + ' SAR';
    };

    // ============================================================
    // 查找客户
    // ============================================================

    window.CashierModule.findCustomer = function() {
        if (!this.el.plate) return;
        var plate = this.el.plate.value.trim().toUpperCase();
        if (!plate) {
            if (this.el.customerInfo) this.el.customerInfo.classList.add('hidden');
            this.selectedCustomer = null;
            return;
        }

        var customers = AppStore.get('allCustomers') || [];
        var customer = null;
        for (var i = 0; i < customers.length; i++) {
            if (customers[i].plate_number === plate) {
                customer = customers[i];
                break;
            }
        }

        if (customer) {
            this.selectedCustomer = customer;
            if (this.el.customerInfo) this.el.customerInfo.classList.remove('hidden');
            if (this.el.custName) this.el.custName.textContent = customer.name || '未知';
            if (this.el.custBalance) this.el.custBalance.textContent = (customer.balance || 0).toFixed(2) + ' SAR';
            if (this.el.custPoints) this.el.custPoints.textContent = customer.points || 0;
            if (this.el.custLevel) {
                var level = customer.level || '普通';
                this.el.custLevel.textContent = level;
                this.el.custLevel.className = 'customer-level customer-level-' + level.toLowerCase();
            }

            if (this.el.customer) {
                var options = this.el.customer.options;
                for (var j = 0; j < options.length; j++) {
                    if (options[j].value === customer.id) {
                        options[j].selected = true;
                        break;
                    }
                }
            }
            this.toast('👤 找到客户: ' + (customer.name || customer.phone), 'success');
        } else {
            this.selectedCustomer = null;
            if (this.el.customerInfo) this.el.customerInfo.classList.add('hidden');
            this.toast('⚠️ 未找到该车牌对应的客户', 'warning');
        }
    };

    window.CashierModule.onCustomerChange = function() {
        if (!this.el.customer || !this.el.customerInfo) return;
        var customerId = this.el.customer.value;
        if (!customerId) {
            this.el.customerInfo.classList.add('hidden');
            this.selectedCustomer = null;
            return;
        }

        var customers = AppStore.get('allCustomers') || [];
        var customer = null;
        for (var i = 0; i < customers.length; i++) {
            if (customers[i].id === customerId) {
                customer = customers[i];
                break;
            }
        }

        if (customer) {
            this.selectedCustomer = customer;
            this.el.customerInfo.classList.remove('hidden');
            if (this.el.custName) this.el.custName.textContent = customer.name || '未知';
            if (this.el.custBalance) this.el.custBalance.textContent = (customer.balance || 0).toFixed(2) + ' SAR';
            if (this.el.custPoints) this.el.custPoints.textContent = customer.points || 0;
            if (this.el.custLevel) {
                var level = customer.level || '普通';
                this.el.custLevel.textContent = level;
                this.el.custLevel.className = 'customer-level customer-level-' + level.toLowerCase();
            }
            if (this.el.plate && customer.plate_number) {
                this.el.plate.value = customer.plate_number;
            }
        }
    };

    // ============================================================
    // 渲染下拉列表
    // ============================================================

    window.CashierModule.renderEmployees = function(users) {
        if (!this.el.employee) return;
        users = users || [];
        var staff = [];
        for (var i = 0; i < users.length; i++) {
            if (users[i].status === 'approved') {
                staff.push(users[i]);
            }
        }
        var currentUser = AppStore.get('currentUser') || {};
        var html = '';
        for (var j = 0; j < staff.length; j++) {
            var u = staff[j];
            var selected = (u.id === currentUser.id) ? 'selected' : '';
            var label = (u.name || u.username) + (u.role ? ' (' + u.role + ')' : '');
            html += '<option value="' + u.id + '" ' + selected + '>' + label + '</option>';
        }
        this.el.employee.innerHTML = html || '<option value="">暂无员工</option>';
    };

    window.CashierModule.renderCustomers = function(customers) {
        if (!this.el.customer) return;
        customers = customers || [];
        var val = this.el.customer.value;
        var html = '<option value="">散客</option>';
        for (var i = 0; i < customers.length; i++) {
            var c = customers[i];
            var label = c.name + (c.plate_number ? ' (' + c.plate_number + ')' : '');
            html += '<option value="' + c.id + '">' + label + '</option>';
        }
        this.el.customer.innerHTML = html;
        if (val) this.el.customer.value = val;
    };

    window.CashierModule.renderTodayOrders = function(orders) {
        if (!this.el.todayList) return;
        orders = orders || [];
        var today = new Date().toISOString().split('T')[0];
        var todayOrders = [];
        for (var i = 0; i < orders.length; i++) {
            if (orders[i].date === today && orders[i].status !== 'cancelled') {
                todayOrders.push(orders[i]);
            }
        }

        var totalRevenue = 0;
        for (var j = 0; j < todayOrders.length; j++) {
            totalRevenue += parseFloat(todayOrders[j].total) || 0;
        }

        if (this.el.todayRevenue) {
            this.el.todayRevenue.textContent = totalRevenue.toFixed(2) + ' SAR';
        }
        if (this.el.todayOrderCount) {
            this.el.todayOrderCount.textContent = todayOrders.length;
        }

        if (todayOrders.length === 0) {
            this.el.todayList.innerHTML = '<div class="text-center text-gray-400 py-4">今日暂无订单</div>';
            return;
        }

        var html = '';
        for (var k = 0; k < Math.min(todayOrders.length, 20); k++) {
            var o = todayOrders[k];
            var time = o.created_at ? new Date(o.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
            var statusMap = {
                pending: '⏳',
                confirmed: '✅',
                in_progress: '🔄',
                completed: '✔️',
                cancelled: '❌'
            };
            html += '<div class="flex justify-between items-center p-2 border-b hover:bg-gray-50 rounded">';
            html += '<div class="flex items-center gap-3">';
            html += '<span class="text-xs text-gray-400">' + time + '</span>';
            html += '<span class="font-medium">' + (o.plate_number || 'N/A') + '</span>';
            html += '<span class="text-xs text-gray-400">' + (o.service_name || '') + '</span>';
            html += '<span class="text-xs">' + (statusMap[o.status] || '') + '</span>';
            html += '</div>';
            html += '<div class="font-bold text-blue-600">' + (parseFloat(o.total) || 0).toFixed(2) + ' SAR</div>';
            html += '</div>';
        }
        this.el.todayList.innerHTML = html;
    };

    // ============================================================
    // 支付方式选择
    // ============================================================

    window.CashierModule.selectPayment = function(method) {
        this.selectedPayment = method;
        var labels = {
            cash: '💰 现金',
            mada: '🇸🇦 mada',
            card: '💳 银行卡',
            apple_pay: '📱 Apple Pay',
            stc_pay: '📱 STC Pay',
            wallet: '👛 钱包余额'
        };
        if (this.el.selectedPayment) {
            this.el.selectedPayment.textContent = '✅ 已选择: ' + (labels[method] || method);
            this.el.selectedPayment.className = 'text-xs text-green-600 mt-1 text-center';
        }
        var btns = document.querySelectorAll('.payment-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.remove('border-blue-400', 'bg-blue-50');
            if (btns[i].dataset.payment === method) {
                btns[i].classList.add('border-blue-400', 'bg-blue-50');
            }
        }
    };

    // ============================================================
    // 保存订单
    // ============================================================

    window.CashierModule.saveOrder = function() {
        var self = this;
        var currentUser = AppStore.get('currentUser') || {};

        if (!currentUser.id) {
            this.toast('请先登录', 'error');
            return;
        }

        if (this.cart.length === 0) {
            this.toast('购物车为空，请添加服务', 'error');
            return;
        }

        if (!this.selectedPayment) {
            this.toast('请选择支付方式', 'error');
            return;
        }

        var plate = this.selectedCustomer ? (this.selectedCustomer.plate_number || 'GUEST') : 'GUEST';

        // 计算总计
        var subtotal = 0;
        for (var i = 0; i < this.cart.length; i++) {
            subtotal += this.cart[i].price * this.cart[i].qty;
        }
        var discount = this._couponDiscount || 0;
        var vatRate = 15;
        var vat = (subtotal - discount) * vatRate / 100;
        var total = subtotal - discount + vat;

        var today = new Date().toISOString().split('T')[0];
        var orders = AppStore.get('allOrders') || [];
        var todayOrders = [];
        for (var j = 0; j < orders.length; j++) {
            if (orders[j].date === today) todayOrders.push(orders[j]);
        }
        var orderNumber = 'ORD-' + today.replace(/-/g, '') + '-' + String(todayOrders.length + 1).padStart(4, '0');

        var serviceNames = '';
        for (var k = 0; k < this.cart.length; k++) {
            if (k > 0) serviceNames += ', ';
            serviceNames += this.cart[k].name + '×' + this.cart[k].qty;
        }

        var orderData = {
            order_number: orderNumber,
            plate_number: plate,
            customer_id: this.selectedCustomer ? this.selectedCustomer.id : null,
            employee_id: currentUser.id,
            staff_name: currentUser.name || currentUser.username,
            service_name: serviceNames,
            amount: subtotal,
            discount: discount,
            vat: vat,
            total: total,
            payment_method: this.selectedPayment,
            status: 'completed',
            date: today,
            created_at: new Date().toISOString()
        };

        AppApi.insert('orders', orderData)
            .then(function(data) {
                if (data && data.length > 0) {
                    var allOrders = AppStore.get('allOrders') || [];
                    allOrders.unshift(data[0]);
                    AppStore.set('allOrders', allOrders);

                    if (self.selectedCustomer) {
                        var customers = AppStore.get('allCustomers') || [];
                        for (var m = 0; m < customers.length; m++) {
                            if (customers[m].id === self.selectedCustomer.id) {
                                customers[m].visit_count = (customers[m].visit_count || 0) + 1;
                                customers[m].last_visit = new Date().toISOString();
                                break;
                            }
                        }
                        AppStore.set('allCustomers', customers);
                    }

                    self.toast('✅ 收款成功: ' + total.toFixed(2) + ' SAR', 'success');

                    // 清空购物车
                    self.cart = [];
                    self._couponDiscount = 0;
                    self.selectedPayment = null;
                    self.updateCart();
                    self.renderTodayOrders(allOrders);

                    if (self.el.selectedPayment) {
                        self.el.selectedPayment.textContent = '请选择支付方式';
                        self.el.selectedPayment.className = 'text-xs text-blue-600 mt-1 text-center';
                    }
                    var btns = document.querySelectorAll('.payment-btn');
                    for (var n = 0; n < btns.length; n++) {
                        btns[n].classList.remove('border-blue-400', 'bg-blue-50');
                    }

                    self.voiceTotal();
                }
            })
            .catch(function(error) {
                self.toast('❌ 收款失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 打印功能
    // ============================================================

    window.CashierModule.showPrintOptions = function() {
        var modal = document.getElementById('printOptionsModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.CashierModule.closePrintOptions = function() {
        var modal = document.getElementById('printOptionsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.CashierModule.printReceipt = function() {
        this.closePrintOptions();

        var total = this.el.cartTotal ? this.el.cartTotal.textContent : '0 SAR';
        var plate = this.selectedCustomer ? (this.selectedCustomer.plate_number || 'GUEST') : 'GUEST';

        var win = window.open('', '_blank', 'width=400,height=600');
        if (!win) {
            this.toast('请允许弹窗', 'error');
            return;
        }

        var config = AppStore.get('config') || {};
        var shopName = config.shopName || 'Car Wash Pro';
        var taxId = config.shopTaxId || 'N/A';

        var html = '<!DOCTYPE html><html><head><title>小票</title><style>' +
            'body { font-family: "Courier New", monospace; padding: 10px; max-width: 300px; margin: auto; font-size: 12px; text-align: center; }' +
            '.header { font-size: 18px; font-weight: bold; }' +
            '.line { border-top: 1px dashed #999; margin: 8px 0; }' +
            '.total { font-size: 20px; font-weight: bold; color: #0091D5; }' +
            '.footer { font-size: 10px; color: #666; margin-top: 8px; }' +
            '</style></head><body>' +
            '<div class="header">🧼 ' + shopName + '</div>' +
            '<div class="line"></div>' +
            '<p>车牌: <strong>' + plate + '</strong></p>' +
            '<p>日期: ' + new Date().toLocaleString() + '</p>' +
            '<div class="line"></div>';

        // 商品列表
        for (var i = 0; i < this.cart.length; i++) {
            var item = this.cart[i];
            html += '<p>' + item.name + ' ×' + item.qty + ' = ' + (item.price * item.qty).toFixed(2) + ' SAR</p>';
        }

        html += '<div class="line"></div>' +
            '<div class="total">' + total + '</div>' +
            '<div class="line"></div>' +
            '<p>✅ 感谢光临！</p>' +
            '<div class="footer">' + (config.receiptFooter || '欢迎再次光临') + '</div>' +
            '<script>setTimeout(function(){ window.print(); }, 500);<\/script>' +
            '</body></html>';

        win.document.write(html);
        win.document.close();
    };

    window.CashierModule.printTaxInvoice = function() {
        this.closePrintOptions();

        var total = this.el.cartTotal ? this.el.cartTotal.textContent : '0 SAR';
        var plate = this.selectedCustomer ? (this.selectedCustomer.plate_number || 'GUEST') : 'GUEST';

        var win = window.open('', '_blank', 'width=800,height=800');
        if (!win) {
            this.toast('请允许弹窗', 'error');
            return;
        }

        var config = AppStore.get('config') || {};
        var shopName = config.companyNameAr || config.shopName || 'شركة الخدمات البترولية';
        var taxId = config.vatNumber || config.shopTaxId || '300056462300003';
        var address = config.companyAddress || config.shopAddress || 'الرياض';
        var phone = config.companyPhone || config.shopPhone || '920002667';
        var crNumber = config.crNumber || '4030571509';

        var now = new Date();
        var dateStr = now.getFullYear() + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + String(now.getDate()).padStart(2, '0');
        var invoiceNumber = 'INV-' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + String(Date.now()).slice(-6);

        var html = '<!DOCTYPE html><html dir="rtl" lang="ar"><head><title>فاتورة ضريبية</title><style>' +
            'body { font-family: "Times New Roman", Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; }' +
            '.invoice { border: 1px solid #333; padding: 30px; border-radius: 8px; }' +
            '.header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px; }' +
            '.shop-name { font-size: 24px; font-weight: bold; color: #1a3a6b; }' +
            '.shop-details { font-size: 12px; color: #555; margin-top: 5px; }' +
            '.title { text-align: center; font-size: 20px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 10px 0; }' +
            '.table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }' +
            '.table th { background: #1a3a6b; color: white; padding: 8px; text-align: center; }' +
            '.table td { padding: 8px; text-align: center; border-bottom: 1px solid #ddd; }' +
            '.totals { width: 60%; margin-right: auto; margin-top: 15px; }' +
            '.totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }' +
            '.totals .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; }' +
            '.footer { margin-top: 20px; font-size: 11px; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; }' +
            '</style></head><body>' +
            '<div class="invoice">' +
            '<div class="header">' +
            '<div class="shop-name">🧼 ' + shopName + '</div>' +
            '<div class="shop-details">' + address + ' | 📞 ' + phone + '</div>' +
            '<div class="shop-details">الرقم الضريبي: ' + taxId + ' | سجل تجاري: ' + crNumber + '</div>' +
            '</div>' +
            '<div class="title">فاتورة ضريبية مبسطة</div>' +
            '<div class="title" style="font-size:14px;background:transparent;">Simplified Tax Invoice</div>' +
            '<p><strong>رقم الفاتورة:</strong> ' + invoiceNumber + '</p>' +
            '<p><strong>التاريخ:</strong> ' + dateStr + '</p>' +
            '<p><strong>رقم اللوحة:</strong> ' + plate + '</p>' +
            '<table class="table">' +
            '<thead><tr><th>#</th><th>الخدمة</th><th>الكمية</th><th>السعر</th><th>الضريبة</th><th>الإجمالي</th></tr></thead><tbody>';

        for (var i = 0; i < this.cart.length; i++) {
            var item = this.cart[i];
            var itemTotal = item.price * item.qty;
            var itemVat = itemTotal * 15 / 100;
            html += '<tr><td>' + (i + 1) + '</td><td>' + item.name + '</td><td>' + item.qty + '</td><td>' + item.price.toFixed(2) + '</td><td>' + itemVat.toFixed(2) + '</td><td>' + itemTotal.toFixed(2) + '</td></tr>';
        }

        html += '</tbody></table>' +
            '<div class="totals">' +
            '<div class="row grand-total"><span>المبلغ شامل الضريبة</span><span>' + total + '</span></div>' +
            '</div>' +
            '<div class="footer">شكراً لتعاملكم معنا</div>' +
            '</div>' +
            '<script>setTimeout(function(){ window.print(); }, 800);<\/script>' +
            '</body></html>';

        win.document.write(html);
        win.document.close();
    };

    // ============================================================
    // 语音播报
    // ============================================================

    window.CashierModule.voiceTotal = function() {
        var total = this.el.cartTotal ? this.el.cartTotal.textContent : '0 SAR';
        var msg = new SpeechSynthesisUtterance('收款成功，总计 ' + total);
        msg.lang = 'zh-CN';
        window.speechSynthesis.speak(msg);
    };

    // ============================================================
    // 清空订单
    // ============================================================

    window.CashierModule.clearOrder = function() {
        this.cart = [];
        this._couponDiscount = 0;
        this.selectedPayment = null;
        this.updateCart();
        if (this.el.selectedPayment) {
            this.el.selectedPayment.textContent = '请选择支付方式';
            this.el.selectedPayment.className = 'text-xs text-blue-600 mt-1 text-center';
        }
        var btns = document.querySelectorAll('.payment-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.remove('border-blue-400', 'bg-blue-50');
        }
        if (this.el.couponDisplay) {
            this.el.couponDisplay.classList.add('hidden');
            this.el.couponDisplay.textContent = '';
        }
        this.toast('🗑️ 已清空', 'info');
    };

    console.log('[Cashier] V7 模块已注册');
})();