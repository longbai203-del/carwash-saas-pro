/**
 * cashier.js - POS收银模块 V2.0
 * 三栏式布局：客户 | 服务 | 购物车
 * 包含：快捷搜索、最近服务、混合支付、服务状态联动、队列
 */
(function() {
    'use strict';

    window.CashierModule = Object.create(ModuleBase);
    window.CashierModule.moduleName = 'cashier';

    // ============================================================
    // 服务数据
    // ============================================================
    window.CashierModule.services = [
        // 洗车服务
        { id: 's1', name: '基础清洗', price: 30, category: 'wash', icon: '🧽', desc: '外部冲洗+擦干', popular: true },
        { id: 's2', name: '深度清洗', price: 55, category: 'wash', icon: '🧼', desc: '内外深度清洁', popular: true },
        { id: 's3', name: '全车精洗', price: 110, category: 'wash', icon: '🚗', desc: '内外全面清洁+打蜡', popular: true },
        // 美容服务
        { id: 's4', name: '外部抛光', price: 65, category: 'detail', icon: '✨', desc: '漆面抛光去划痕' },
        { id: 's5', name: '内部护理', price: 70, category: 'detail', icon: '🪑', desc: '内饰深度护理' },
        { id: 's6', name: '全车镀晶', price: 299, category: 'detail', icon: '💎', desc: '全车镀晶保护' },
        // 套餐
        { id: 'p1', name: '月度洗车卡', price: 299, category: 'package', icon: '📅', desc: '30天无限次基础洗' },
        { id: 'p2', name: '季度护理套餐', price: 899, category: 'package', icon: '📦', desc: '精洗+抛光+内部护理' },
        // 商品
        { id: 'pr1', name: '车用香薰', price: 25, category: 'product', icon: '🌺', desc: '车载香薰' },
        { id: 'pr2', name: '玻璃清洁液', price: 18, category: 'product', icon: '🧴', desc: '500ml玻璃清洁' },
        { id: 'pr3', name: '轮胎光亮剂', price: 22, category: 'product', icon: '⚫', desc: '轮胎养护' }
    ];

    // ============================================================
    // 状态
    // ============================================================
    window.CashierModule.cart = [];
    window.CashierModule.selectedCustomer = null;
    window.CashierModule.selectedPayment = null;
    window.CashierModule.currentFilter = 'all';
    window.CashierModule.recentServices = [];
    window.CashierModule.currentOrderStatus = 'pending';
    window.CashierModule._couponDiscount = 0;
    window.CashierModule._pointsDiscount = 0;

    // ============================================================
    // 缓存 DOM
    // ============================================================
    window.CashierModule.cacheDom = function() {
        this.el = {
            // 顶部
            quickSearch: this.getEl('posQuickSearch'),
            cashierName: this.getEl('posCashierName'),
            cashierStatus: this.getEl('cashierStatus'),
            // 客户区
            plate: this.getEl('posPlate'),
            phone: this.getEl('posPhone'),
            customerCard: this.getEl('customerCard'),
            custDisplayName: this.getEl('custDisplayName'),
            custDisplayPhone: this.getEl('custDisplayPhone'),
            custDisplayPlate: this.getEl('custDisplayPlate'),
            custDisplayLevel: this.getEl('custDisplayLevel'),
            custDisplayBalance: this.getEl('custDisplayBalance'),
            custDisplayPoints: this.getEl('custDisplayPoints'),
            custDisplayVisits: this.getEl('custDisplayVisits'),
            custDisplayPackage: this.getEl('custDisplayPackage'),
            custLastVisit: this.getEl('custLastVisit'),
            lastVisitCard: this.getEl('lastVisitCard'),
            vehiclePhotoCard: this.getEl('vehiclePhotoCard'),
            vehiclePhotoPreview: this.getEl('vehiclePhotoPreview'),
            // 服务区
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
            couponInput: this.getEl('couponInput'),
            checkoutBtn: this.getEl('checkoutBtn'),
            // 混合支付
            splitPaymentArea: this.getEl('splitPaymentArea'),
            splitCash: this.getEl('splitCash'),
            splitMada: this.getEl('splitMada'),
            splitCard: this.getEl('splitCard'),
            splitRemaining: this.getEl('splitRemaining'),
            // 队列
            queuePending: this.getEl('queuePending'),
            queueInProgress: this.getEl('queueInProgress'),
            queueCompleted: this.getEl('queueCompleted'),
            queueDelivered: this.getEl('queueDelivered'),
            todayRevenue: this.getEl('todayRevenue'),
            todayOrderCount: this.getEl('todayOrderCount')
        };
        this.cart = [];
        this.recentServices = JSON.parse(localStorage.getItem('recentServices') || '[]');
    };

    // ============================================================
    // 绑定事件
    // ============================================================
    window.CashierModule.bindEvents = function() {
        var self = this;

        // 快速搜索 - 回车
        if (this.el.quickSearch) {
            this.el.quickSearch.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') self.quickSearch();
            });
        }

        // 车牌 - 回车
        if (this.el.plate) {
            this.el.plate.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') self.searchPlate();
            });
        }

        // 服务搜索
        if (this.el.serviceSearch) {
            this.el.serviceSearch.addEventListener('input', function() {
                self.renderServices();
            });
        }

        // 混合支付输入
        ['splitCash', 'splitMada', 'splitCard'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', function() {
                    self.updateSplitRemaining();
                });
            }
        });
    };

    // ============================================================
    // 加载数据
    // ============================================================
    window.CashierModule.loadData = function() {
        var self = this;
        var users = AppStore.get('allUsers') || [];
        var customers = AppStore.get('allCustomers') || [];
        var orders = AppStore.get('allOrders') || [];

        // 设置收银员
        var user = AppStore.get('currentUser');
        if (user && this.el.cashierName) {
            this.el.cashierName.textContent = user.name || user.username;
        }

        this.renderServices();
        this.renderRecentServices();
        this.updateCart();
        this.updateQueue(orders);
        this.updateTodayStats(orders);
        this.updateStatus();

        // 加载门店列表
        this.loadStores();
    };

    // ============================================================
    // 门店
    // ============================================================
    window.CashierModule.loadStores = function() {
        var stores = AppStore.get('allStores') || [];
        var sel = document.getElementById('posStoreSelect');
        if (sel) {
            var html = '';
            stores.forEach(function(s) {
                html += '<option value="' + s.id + '">' + s.name + '</option>';
            });
            sel.innerHTML = html || '<option value="main">总部店</option>';
        }
    };

    // ============================================================
    // 状态
    // ============================================================
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
    // 快速搜索
    // ============================================================
    window.CashierModule.quickSearch = function() {
        var query = this.el.quickSearch ? this.el.quickSearch.value.trim() : '';
        if (!query) {
            this.toast('请输入车牌或手机号', 'error');
            return;
        }

        // 尝试按车牌搜索
        if (this.el.plate) {
            this.el.plate.value = query.toUpperCase();
        }
        this.searchPlate();
    };

    // ============================================================
    // 车牌搜索
    // ============================================================
    window.CashierModule.searchPlate = function() {
        var plate = this.el.plate ? this.el.plate.value.trim().toUpperCase() : '';
        if (!plate) {
            this.toast('请输入车牌号', 'error');
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
            this.showCustomerInfo(customer);
            this.loadVehiclePhotos(plate);
            this.toast('👤 找到客户: ' + (customer.name || customer.phone), 'success');
        } else {
            this.selectedCustomer = null;
            this.hideCustomerInfo();
            this.toast('⚠️ 未找到该车牌，可快速添加', 'warning');
            // 自动弹出添加客户
            this.showQuickAddCustomer(plate);
        }
    };

    // ============================================================
    // 客户信息显示
    // ============================================================
    window.CashierModule.showCustomerInfo = function(customer) {
        var card = this.el.customerCard;
        if (!card) return;
        card.classList.remove('hidden');

        if (this.el.custDisplayName) this.el.custDisplayName.textContent = customer.name || '-';
        if (this.el.custDisplayPhone) this.el.custDisplayPhone.textContent = customer.phone || '-';
        if (this.el.custDisplayPlate) this.el.custDisplayPlate.textContent = customer.plate_number || '-';
        if (this.el.custDisplayBalance) this.el.custDisplayBalance.textContent = (customer.balance || 0).toFixed(2) + ' SAR';
        if (this.el.custDisplayPoints) this.el.custDisplayPoints.textContent = customer.points || 0;
        if (this.el.custDisplayVisits) this.el.custDisplayVisits.textContent = customer.visit_count || 0;
        if (this.el.custDisplayLevel) {
            var level = customer.level || '普通';
            this.el.custDisplayLevel.textContent = level;
            this.el.custDisplayLevel.className = 'customer-level customer-level-' + level.toLowerCase();
        }

        // 套餐
        if (this.el.custDisplayPackage) {
            this.el.custDisplayPackage.textContent = customer.package_name || '-';
        }

        // 最近洗车
        if (this.el.custLastVisit && this.el.lastVisitCard) {
            var lastOrder = this.getLastOrder(customer.id);
            if (lastOrder) {
                this.el.custLastVisit.textContent = new Date(lastOrder.created_at).toLocaleDateString();
                this.el.lastVisitCard.classList.remove('hidden');
            } else {
                this.el.lastVisitCard.classList.add('hidden');
            }
        }
    };

    window.CashierModule.hideCustomerInfo = function() {
        if (this.el.customerCard) this.el.customerCard.classList.add('hidden');
        if (this.el.lastVisitCard) this.el.lastVisitCard.classList.add('hidden');
        if (this.el.vehiclePhotoCard) this.el.vehiclePhotoCard.classList.add('hidden');
    };

    // ============================================================
    // 最近订单
    // ============================================================
    window.CashierModule.getLastOrder = function(customerId) {
        var orders = AppStore.get('allOrders') || [];
        var customerOrders = orders.filter(function(o) { return o.customer_id === customerId; });
        customerOrders.sort(function(a, b) {
            return new Date(b.created_at) - new Date(a.created_at);
        });
        return customerOrders[0] || null;
    };

    // ============================================================
    // 快速添加客户
    // ============================================================
    window.CashierModule.showQuickAddCustomer = function(plate) {
        if (!confirm('未找到客户 "' + plate + '"，是否快速添加？')) return;

        var name = prompt('请输入客户姓名：');
        if (!name) return;
        var phone = prompt('请输入手机号：');

        var tenant = AppStore.get('currentTenant');
        var store = AppStore.get('currentStore');

        var customerData = {
            tenant_id: tenant ? tenant.id : null,
            store_id: store ? store.id : null,
            name: name,
            phone: phone || '',
            plate_number: plate,
            points: 0,
            balance: 0,
            level: '普通',
            visit_count: 0
        };

        var self = this;
        AppApi.insert('customers', customerData)
            .then(function(data) {
                if (data && data.length > 0) {
                    var customers = AppStore.get('allCustomers') || [];
                    customers.push(data[0]);
                    AppStore.set('allCustomers', customers);
                    self.selectedCustomer = data[0];
                    self.showCustomerInfo(data[0]);
                    self.toast('✅ 客户已添加: ' + name, 'success');
                }
            })
            .catch(function(error) {
                self.toast('❌ 添加失败: ' + error.message, 'error');
            });
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
            var popularBadge = s.popular ? '<span class="text-[8px] bg-amber-100 text-amber-600 px-1 rounded-full ml-1">热门</span>' : '';
            html += '<div onclick="CashierModule.addToCart(\'' + s.id + '\')" ' +
                    'class="service-item bg-gray-50 hover:bg-blue-50 rounded-xl p-2 border hover:border-blue-300 cursor-pointer transition">' +
                    '<div class="flex items-center gap-2">' +
                    '<span class="text-lg">' + s.icon + '</span>' +
                    '<div class="flex-1 min-w-0">' +
                    '<div class="font-medium text-sm truncate">' + s.name + popularBadge + '</div>' +
                    '<div class="text-xs font-bold text-blue-600">' + s.price.toFixed(2) + ' SAR</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
        });
        grid.innerHTML = html;
    };

    // ============================================================
    // 分类筛选
    // ============================================================
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
    // 最近服务
    // ============================================================
    window.CashierModule.renderRecentServices = function() {
        var el = this.el.recentServices;
        if (!el) return;

        var recent = this.recentServices.slice(0, 6);
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
            list.innerHTML = '<div class="text-center text-gray-400 py-8 text-sm">请选择服务</div>';
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
                    '<button onclick="CashierModule.changeQty(' + i + ', -1)" class="text-xs text-gray-400 hover:text-blue-600 w-5 h-5 rounded-full hover:bg-blue-50">−</button>' +
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
        if (!confirm('确认清空购物车？')) return;
        this.cart = [];
        this._couponDiscount = 0;
        this._pointsDiscount = 0;
        this.selectedPayment = null;
        this.currentOrderStatus = 'pending';
        this.updateCart();
        this.resetPaymentUI();
        this.toast('🗑️ 已清空购物车', 'info');
    };

    // ============================================================
    // 结算
    // ============================================================
    window.CashierModule.updateTotals = function() {
        var subtotal = 0;
        for (var i = 0; i < this.cart.length; i++) {
            subtotal += this.cart[i].price * this.cart[i].qty;
        }

        var discount = this._couponDiscount + this._pointsDiscount;
        var vatRate = 15;
        var vat = (subtotal - discount) * vatRate / 100;
        var total = subtotal - discount + vat;

        if (this.el.cartSubtotal) this.el.cartSubtotal.textContent = subtotal.toFixed(2) + ' SAR';
        if (this.el.cartDiscount) this.el.cartDiscount.textContent = discount.toFixed(2) + ' SAR';
        if (this.el.cartVat) this.el.cartVat.textContent = vat.toFixed(2) + ' SAR';
        if (this.el.cartTotal) this.el.cartTotal.textContent = total.toFixed(2) + ' SAR';

        return total;
    };

    // ============================================================
    // 支付方式
    // ============================================================
    window.CashierModule.selectPayment = function(method) {
        this.selectedPayment = method;
        var labels = {
            cash: '💰 现金',
            mada: '🇸🇦 mada',
            visa: '💳 Visa',
            mastercard: '💳 Mastercard',
            apple_pay: '📱 Apple Pay',
            stc_pay: '📱 STC Pay'
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
        // 隐藏混合支付
        if (this.el.splitPaymentArea) {
            this.el.splitPaymentArea.classList.add('hidden');
        }
    };

    // ============================================================
    // 混合支付
    // ============================================================
    window.CashierModule.showSplitPayment = function() {
        if (this.el.splitPaymentArea) {
            this.el.splitPaymentArea.classList.toggle('hidden');
            if (!this.el.splitPaymentArea.classList.contains('hidden')) {
                this.updateSplitRemaining();
            }
        }
    };

    window.CashierModule.updateSplitRemaining = function() {
        var total = this.getTotal();
        var cash = parseFloat(document.getElementById('splitCash')?.value) || 0;
        var mada = parseFloat(document.getElementById('splitMada')?.value) || 0;
        var card = parseFloat(document.getElementById('splitCard')?.value) || 0;
        var paid = cash + mada + card;
        var remaining = total - paid;

        if (this.el.splitRemaining) {
            if (remaining > 0) {
                this.el.splitRemaining.textContent = remaining.toFixed(2);
                this.el.splitRemaining.className = 'text-xs text-red-600';
            } else {
                this.el.splitRemaining.textContent = '0.00 (已付清)';
                this.el.splitRemaining.className = 'text-xs text-green-600';
            }
        }
    };

    window.CashierModule.getTotal = function() {
        var subtotal = 0;
        for (var i = 0; i < this.cart.length; i++) {
            subtotal += this.cart[i].price * this.cart[i].qty;
        }
        var discount = this._couponDiscount + this._pointsDiscount;
        var vatRate = 15;
        return subtotal - discount + (subtotal - discount) * vatRate / 100;
    };

    // ============================================================
    // 优惠券/积分
    // ============================================================
    window.CashierModule.applyCoupon = function() {
        var input = this.el.couponInput;
        if (!input) return;
        var code = input.value.trim();
        if (!code) {
            this.toast('请输入优惠券码', 'error');
            return;
        }

        if (code === 'WELCOME10') {
            this._couponDiscount = 10;
            this.updateCart();
            this.toast('✅ 优惠券已应用: -10 SAR', 'success');
        } else if (code === 'VIP20') {
            this._couponDiscount = 20;
            this.updateCart();
            this.toast('✅ 优惠券已应用: -20 SAR', 'success');
        } else {
            this.toast('❌ 无效优惠券码', 'error');
        }
        input.value = '';
    };

    window.CashierModule.usePoints = function() {
        var customer = this.selectedCustomer;
        if (!customer) {
            this.toast('请先选择客户', 'error');
            return;
        }
        var points = customer.points || 0;
        if (points < 100) {
            this.toast('积分不足，至少需要100积分', 'error');
            return;
        }
        var discount = Math.floor(points / 100) * 5;
        this._pointsDiscount = Math.min(discount, this.getTotal() * 0.3);
        this.updateCart();
        this.toast('✅ 已使用 ' + Math.ceil(this._pointsDiscount / 5 * 100) + ' 积分抵扣 ' + this._pointsDiscount.toFixed(2) + ' SAR', 'success');
    };

    // ============================================================
    // 收款
    // ============================================================
    window.CashierModule.checkout = function() {
        if (this.cart.length === 0) {
            this.toast('购物车为空', 'error');
            return;
        }

        if (!this.selectedPayment) {
            this.toast('请选择支付方式', 'error');
            return;
        }

        var currentUser = AppStore.get('currentUser') || {};
        if (!currentUser.id) {
            this.toast('请先登录', 'error');
            return;
        }

        var total = this.getTotal();

        // 检查混合支付
        var cash = parseFloat(document.getElementById('splitCash')?.value) || 0;
        var mada = parseFloat(document.getElementById('splitMada')?.value) || 0;
        var card = parseFloat(document.getElementById('splitCard')?.value) || 0;
        var splitTotal = cash + mada + card;

        if (splitTotal > 0) {
            if (Math.abs(splitTotal - total) > 0.01) {
                this.toast('混合支付金额不匹配！总计: ' + total.toFixed(2) + ' SAR', 'error');
                return;
            }
            // 使用混合支付
            this._processPayment('混合支付', total);
        } else {
            this._processPayment(this.selectedPayment, total);
        }
    };

    window.CashierModule._processPayment = function(paymentMethod, total) {
        var self = this;
        var currentUser = AppStore.get('currentUser') || {};
        var plate = this.selectedCustomer ? (this.selectedCustomer.plate_number || 'GUEST') : 'GUEST';
        var today = new Date().toISOString().split('T')[0];
        var orderNumber = 'ORD-' + today.replace(/-/g, '') + '-' + String(Date.now()).slice(-6);

        var serviceNames = '';
        for (var i = 0; i < this.cart.length; i++) {
            if (i > 0) serviceNames += ', ';
            serviceNames += this.cart[i].name + '×' + this.cart[i].qty;
        }

        var subtotal = 0;
        for (var j = 0; j < this.cart.length; j++) {
            subtotal += this.cart[j].price * this.cart[j].qty;
        }
        var discount = this._couponDiscount + this._pointsDiscount;
        var vatRate = 15;
        var vat = (subtotal - discount) * vatRate / 100;

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
            payment_method: paymentMethod,
            status: this.currentOrderStatus || 'pending',
            date: today,
            paid_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        AppApi.insert('orders', orderData)
            .then(function(data) {
                if (data && data.length > 0) {
                    var order = data[0];
                    var allOrders = AppStore.get('allOrders') || [];
                    allOrders.unshift(order);
                    AppStore.set('allOrders', allOrders);

                    // 更新客户
                    if (self.selectedCustomer) {
                        var customers = AppStore.get('allCustomers') || [];
                        for (var k = 0; k < customers.length; k++) {
                            if (customers[k].id === self.selectedCustomer.id) {
                                customers[k].visit_count = (customers[k].visit_count || 0) + 1;
                                customers[k].last_visit = new Date().toISOString();
                                if (total > 0) {
                                    customers[k].points = (customers[k].points || 0) + Math.floor(total / 10);
                                }
                                break;
                            }
                        }
                        AppStore.set('allCustomers', customers);
                    }

                    // 保存收款记录
                    var paymentData = {
                        order_id: order.id,
                        amount: total,
                        payment_method: paymentMethod,
                        cashier_id: currentUser.id,
                        paid_at: new Date().toISOString()
                    };
                    AppApi.insert('payment_records', paymentData).catch(function() {});

                    // 保存车辆照片关联
                    if (self.selectedCustomer && self._vehiclePhotos && self._vehiclePhotos.length > 0) {
                        self._vehiclePhotos.forEach(function(photo) {
                            AppApi.update('vehicle_photos', photo.id, { order_id: order.id }).catch(function() {});
                        });
                        self._vehiclePhotos = [];
                    }

                    self.toast('✅ 收款成功: ' + total.toFixed(2) + ' SAR', 'success');

                    // 清空购物车
                    self.cart = [];
                    self._couponDiscount = 0;
                    self._pointsDiscount = 0;
                    self.selectedPayment = null;
                    self.updateCart();
                    self.resetPaymentUI();
                    self.updateQueue(allOrders);
                    self.updateTodayStats(allOrders);
                    self.voiceTotal(total);

                    // 打印小票
                    setTimeout(function() {
                        if (confirm('是否打印小票？')) {
                            self.printReceipt();
                        }
                    }, 500);
                }
            })
            .catch(function(error) {
                self.toast('❌ 收款失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 重置支付UI
    // ============================================================
    window.CashierModule.resetPaymentUI = function() {
        if (this.el.selectedPayment) {
            this.el.selectedPayment.textContent = '请选择支付方式';
            this.el.selectedPayment.className = 'text-xs text-blue-600 mt-1 text-center';
        }
        var btns = document.querySelectorAll('.payment-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.remove('border-blue-400', 'bg-blue-50');
        }
        if (this.el.splitPaymentArea) {
            this.el.splitPaymentArea.classList.add('hidden');
        }
        if (this.el.couponInput) {
            this.el.couponInput.value = '';
        }
    };

    // ============================================================
    // 服务状态联动
    // ============================================================
    window.CashierModule.setOrderStatus = function(status) {
        this.currentOrderStatus = status;
        var labels = {
            pending: '⏳ 等待',
            in_progress: '🔄 施工中',
            completed: '✅ 已完成',
            delivered: '🚗 已交车'
        };
        var btns = document.querySelectorAll('.status-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.remove('border-blue-400', 'bg-blue-50');
            if (btns[i].dataset.status === status) {
                btns[i].classList.add('border-blue-400', 'bg-blue-50');
            }
        }
        this.toast('📌 状态已设为: ' + (labels[status] || status), 'info');
    };

    // ============================================================
    // 队列
    // ============================================================
    window.CashierModule.updateQueue = function(orders) {
        if (!orders) orders = AppStore.get('allOrders') || [];
        var today = new Date().toISOString().split('T')[0];
        var todayOrders = orders.filter(function(o) { return o.date === today; });

        var counts = {
            pending: 0,
            in_progress: 0,
            completed: 0,
            delivered: 0
        };

        todayOrders.forEach(function(o) {
            if (counts[o.status] !== undefined) {
                counts[o.status]++;
            }
        });

        if (this.el.queuePending) this.el.queuePending.textContent = counts.pending;
        if (this.el.queueInProgress) this.el.queueInProgress.textContent = counts.in_progress;
        if (this.el.queueCompleted) this.el.queueCompleted.textContent = counts.completed;
        if (this.el.queueDelivered) this.el.queueDelivered.textContent = counts.delivered;
    };

    // ============================================================
    // 今日统计
    // ============================================================
    window.CashierModule.updateTodayStats = function(orders) {
        if (!orders) orders = AppStore.get('allOrders') || [];
        var today = new Date().toISOString().split('T')[0];
        var todayOrders = orders.filter(function(o) { return o.date === today && o.status !== 'cancelled'; });

        var revenue = todayOrders.reduce(function(s, o) { return s + (parseFloat(o.total) || 0); }, 0);

        if (this.el.todayRevenue) this.el.todayRevenue.textContent = revenue.toFixed(2) + ' SAR';
        if (this.el.todayOrderCount) this.el.todayOrderCount.textContent = todayOrders.length;
    };

    // ============================================================
    // 语音播报
    // ============================================================
    window.CashierModule.voiceTotal = function(total) {
        var msg = new SpeechSynthesisUtterance('收款成功，总计 ' + total.toFixed(2) + ' 沙地里亚尔');
        msg.lang = 'zh-CN';
        window.speechSynthesis.speak(msg);
    };

    // ============================================================
    // 打印功能
    // ============================================================
    window.CashierModule.showPrintOptions = function() {
        var modal = document.getElementById('printOptionsModal');
        if (modal) modal.classList.remove('hidden');
    };

    window.CashierModule.closePrintOptions = function() {
        var modal = document.getElementById('printOptionsModal');
        if (modal) modal.classList.add('hidden');
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

        var html = '<!DOCTYPE html><html><head><title>小票</title><style>' +
            'body { font-family: "Courier New", monospace; padding: 10px; max-width: 300px; margin: auto; text-align: center; font-size: 12px; }' +
            '.header { font-size: 18px; font-weight: bold; }' +
            '.line { border-top: 1px dashed #999; margin: 8px 0; }' +
            '.total { font-size: 20px; font-weight: bold; color: #0091D5; }' +
            '</style></head><body>' +
            '<div class="header">🧼 ' + shopName + '</div>' +
            '<div class="line"></div>' +
            '<p>车牌: <strong>' + plate + '</strong></p>' +
            '<p>日期: ' + new Date().toLocaleString() + '</p>' +
            '<div class="line"></div>';

        for (var i = 0; i < this.cart.length; i++) {
            var item = this.cart[i];
            html += '<p>' + item.name + ' ×' + item.qty + ' = ' + (item.price * item.qty).toFixed(2) + ' SAR</p>';
        }

        html += '<div class="line"></div>' +
            '<div class="total">' + total + '</div>' +
            '<div class="line"></div>' +
            '<p>✅ 感谢光临！</p>' +
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
        var crNumber = config.crNumber || '4030571509';

        var now = new Date();
        var dateStr = now.getFullYear() + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + String(now.getDate()).padStart(2, '0');
        var invoiceNumber = 'INV-' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + String(Date.now()).slice(-6);

        var html = '<!DOCTYPE html><html dir="rtl" lang="ar"><head><title>فاتورة ضريبية</title><style>' +
            'body { font-family: "Times New Roman", Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; }' +
            '.invoice { border: 1px solid #333; padding: 30px; border-radius: 8px; }' +
            '.header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; }' +
            '.shop-name { font-size: 24px; font-weight: bold; color: #1a3a6b; }' +
            '.shop-details { font-size: 12px; color: #555; }' +
            '.title { text-align: center; font-size: 20px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 10px 0; }' +
            '.table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }' +
            '.table th { background: #1a3a6b; color: white; padding: 8px; text-align: center; }' +
            '.table td { padding: 8px; text-align: center; border-bottom: 1px solid #ddd; }' +
            '.totals { width: 60%; margin-right: auto; margin-top: 15px; }' +
            '.totals .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; }' +
            '.footer { margin-top: 20px; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; }' +
            '</style></head><body>' +
            '<div class="invoice">' +
            '<div class="header">' +
            '<div class="shop-name">🧼 ' + shopName + '</div>' +
            '<div class="shop-details">' + address + ' | الرقم الضريبي: ' + taxId + ' | سجل تجاري: ' + crNumber + '</div>' +
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
    // 挂单/取单
    // ============================================================
    window.CashierModule.holdCart = function() {
        if (this.cart.length === 0) {
            this.toast('购物车为空', 'error');
            return;
        }

        var plate = this.selectedCustomer ? (this.selectedCustomer.plate_number || 'GUEST') : 'GUEST';
        var holdData = {
            id: Date.now(),
            plate: plate,
            customer: this.selectedCustomer,
            cart: JSON.parse(JSON.stringify(this.cart)),
            discount: this._couponDiscount || 0,
            pointsDiscount: this._pointsDiscount || 0,
            payment: this.selectedPayment,
            held_at: new Date().toISOString()
        };

        if (!window.heldOrders) window.heldOrders = [];
        window.heldOrders.push(holdData);

        this.cart = [];
        this._couponDiscount = 0;
        this._pointsDiscount = 0;
        this.selectedPayment = null;
        this.updateCart();
        this.resetPaymentUI();
        this.toast('📌 已挂单: ' + plate, 'success');
        this.showHoldOrders();
    };

    window.CashierModule.showHoldOrders = function() {
        var orders = window.heldOrders || [];
        if (orders.length === 0) {
            this.toast('暂无挂单', 'info');
            return;
        }

        var msg = '📋 挂单列表\n';
        orders.forEach(function(o, i) {
            var time = new Date(o.held_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            var items = o.cart.map(function(item) { return item.name; }).join(', ');
            msg += (i + 1) + '. ' + o.plate + ' | ' + items + ' | ' + time + '\n';
        });
        msg += '\n点击加载: 输入序号 (1-' + orders.length + ')';
        var choice = prompt(msg);
        if (choice) {
            var idx = parseInt(choice) - 1;
            if (idx >= 0 && idx < orders.length) {
                this.loadHoldOrder(idx);
            }
        }
    };

    window.CashierModule.loadHoldOrder = function(index) {
        var orders = window.heldOrders || [];
        if (index < 0 || index >= orders.length) return;
        var o = orders[index];

        this.selectedCustomer = o.customer;
        this.cart = JSON.parse(JSON.stringify(o.cart));
        this._couponDiscount = o.discount || 0;
        this._pointsDiscount = o.pointsDiscount || 0;
        this.selectedPayment = o.payment;

        if (this.selectedPayment) {
            this.selectPayment(this.selectedPayment);
        }

        orders.splice(index, 1);
        this.updateCart();
        this.showCustomerInfo(o.customer);
        this.toast('✅ 已加载挂单', 'success');
    };

    // ============================================================
    // 车辆照片（简版）
    // ============================================================
    window.CashierModule._vehiclePhotos = [];

    window.CashierModule.takeVehiclePhoto = function() {
        this.toast('📸 拍照功能开发中，请使用订单管理模块拍照', 'info');
    };

    window.CashierModule.loadVehiclePhotos = function(plate) {
        var self = this;
        AppApi.query('vehicle_photos', {
            filter: { plate_number: plate },
            order: { by: 'taken_at', ascending: false },
            limit: 3
        })
        .then(function(photos) {
            self._vehiclePhotos = photos || [];
            var preview = document.getElementById('vehiclePhotoPreview');
            if (!preview) return;

            if (photos && photos.length > 0) {
                var html = '';
                photos.slice(0, 3).forEach(function(p) {
                    html += '<div class="w-12 h-12 rounded-lg overflow-hidden border cursor-pointer" onclick="window.open(\'' + p.photo_url + '\', \'_blank\')">';
                    html += '<img src="' + p.photo_url + '" class="w-full h-full object-cover" alt="车辆照片">';
                    html += '</div>';
                });
                preview.innerHTML = html;
                if (self.el.vehiclePhotoCard) {
                    self.el.vehiclePhotoCard.classList.remove('hidden');
                }
            } else {
                preview.innerHTML = '<span class="text-xs text-gray-400">暂无照片</span>';
            }
        })
        .catch(function() {});
    };

    // ============================================================
    // 占位方法
    // ============================================================
    window.CashierModule.editCustomer = function() {
        this.toast('✏️ 编辑客户功能开发中', 'info');
    };

    window.CashierModule.recharge = function() {
        this.toast('💰 充值功能开发中', 'info');
    };

    window.CashierModule.scanQR = function() {
        this.toast('📱 扫码功能开发中', 'info');
    };

    console.log('[Cashier] V2.0 模块已注册');
})();