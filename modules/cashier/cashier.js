/**
 * cashier.js - POS收银模块 V7
 * 完全重构：三栏布局、服务网格、购物车、多支付方式
 */
(function() {
    'use strict';

    window.CashierModule = Object.create(ModuleBase);
    window.CashierModule.moduleName = 'cashier';

    // ===== 服务数据 =====
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

    // ===== 缓存 DOM =====
    window.CashierModule.cacheDom = function() {
        this.el = {
            // 左侧
            search: this.getEl('posSearch'),
            customerCard: this.getEl('customerCard'),
            custDisplayName: this.getEl('custDisplayName'),
            custDisplayPhone: this.getEl('custDisplayPhone'),
            custDisplayPlate: this.getEl('custDisplayPlate'),
            custDisplayLevel: this.getEl('custDisplayLevel'),
            custDisplayBalance: this.getEl('custDisplayBalance'),
            custDisplayPoints: this.getEl('custDisplayPoints'),
            custDisplayVisits: this.getEl('custDisplayVisits'),
            vehicleCard: this.getEl('vehicleCard'),
            vehicleDisplayPlate: this.getEl('vehicleDisplayPlate'),
            vehicleDisplayModel: this.getEl('vehicleDisplayModel'),
            vehicleDisplayStatus: this.getEl('vehicleDisplayStatus'),
            vehicleLastService: this.getEl('vehicleLastService'),
            // 中间
            serviceGrid: this.getEl('serviceGrid'),
            serviceSearch: this.getEl('serviceSearch'),
            recentServices: this.getEl('recentServices'),
            // 右侧
            cartItems: this.getEl('cartItems'),
            cartSubtotal: this.getEl('cartSubtotal'),
            cartDiscount: this.getEl('cartDiscount'),
            cartVat: this.getEl('cartVat'),
            cartTotal: this.getEl('cartTotal'),
            couponInput: this.getEl('couponInput'),
            couponDisplay: this.getEl('couponDisplay'),
            selectedPayment: this.getEl('selectedPayment'),
            // 底部
            cashierStaffName: this.getEl('cashierStaffName'),
            cashierStoreName: this.getEl('cashierStoreName'),
            cashierStatus: this.getEl('cashierStatus'),
            cashierTodayCount: this.getEl('cashierTodayCount'),
            cashierTodayRevenue: this.getEl('cashierTodayRevenue'),
            // 新客户
            newCustName: this.getEl('newCustName'),
            newCustPhone: this.getEl('newCustPhone'),
            newCustPlate: this.getEl('newCustPlate')
        };
        this.cart = [];
        this.recentServices = JSON.parse(localStorage.getItem('recentServices') || '[]');
    };

    // ===== 绑定事件 =====
    window.CashierModule.bindEvents = function() {
        var self = this;
        if (this.el.search) {
            this.el.search.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') self.quickSearch();
            });
        }
    };

    // ===== 加载数据 =====
    window.CashierModule.loadData = function() {
        this.renderServices();
        this.renderRecentServices();
        this.updateCart();
        this.updateBottomBar();
        this.updateCustomerInfo();

        // 设置员工和门店
        var user = AppStore.get('currentUser');
        if (user && this.el.cashierStaffName) {
            this.el.cashierStaffName.textContent = user.name || user.username;
        }
        var store = AppStore.get('currentStore');
        if (store && this.el.cashierStoreName) {
            this.el.cashierStoreName.textContent = store.name || '主店';
        }
    };

    // ===== 渲染服务网格 =====
    window.CashierModule.renderServices = function(filter) {
        var grid = this.el.serviceGrid;
        if (!grid) return;

        filter = filter || this.currentFilter || 'all';
        var search = this.el.serviceSearch ? this.el.serviceSearch.value.trim().toLowerCase() : '';

        var services = this.services.filter(function(s) {
            var matchFilter = filter === 'all' || s.category === filter;
            var matchSearch = !search || s.name.includes(search) || s.desc.includes(search);
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

    // ===== 筛选服务 =====
    window.CashierModule.filterServices = function(category) {
        if (category) {
            this.currentFilter = category;
            document.querySelectorAll('.tab-btn').forEach(function(btn) {
                btn.classList.remove('active');
                if (btn.dataset.cat === category) btn.classList.add('active');
            });
        }
        this.renderServices();
    };

    // ===== 最近服务 =====
    window.CashierModule.renderRecentServices = function() {
        var el = this.el.recentServices;
        if (!el) return;

        var recent = this.recentServices.slice(0, 8);
        if (recent.length === 0) {
            el.innerHTML = '<span class="text-xs text-gray-400">暂无最近使用</span>';
            return;
        }

        var html = '';
        recent.forEach(function(id) {
            var service = this.services.find(function(s) { return s.id === id; });
            if (service) {
                html += '<button onclick="CashierModule.addToCart(\'' + service.id + '\')" ' +
                        'class="text-xs bg-gray-100 hover:bg-blue-100 px-2 py-1 rounded-lg">' +
                        service.icon + ' ' + service.name +
                        '</button>';
            }
        }.bind(this));
        el.innerHTML = html;
    };

    // ===== 添加到购物车 =====
    window.CashierModule.addToCart = function(serviceId) {
        var service = this.services.find(function(s) { return s.id === serviceId; });
        if (!service) return;

        // 检查是否已存在
        var existing = this.cart.find(function(item) { return item.id === serviceId; });
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

    // ===== 更新购物车 =====
    window.CashierModule.updateCart = function() {
        var list = this.el.cartItems;
        if (!list) return;

        if (this.cart.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 py-8 text-sm">请选择服务或商品</div>';
            this.updateTotals();
            return;
        }

        var html = '';
        this.cart.forEach(function(item, index) {
            var total = item.price * item.qty;
            html += '<div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">' +
                    '<div class="flex items-center gap-2">' +
                    '<span>' + item.icon + '</span>' +
                    '<span class="text-sm font-medium">' + item.name + '</span>' +
                    '<div class="flex items-center gap-1">' +
                    '<button onclick="CashierModule.changeQty(' + index + ', -1)" class="text-xs text-gray-400 hover:text-blue-600 w-5 h-5 rounded-full hover:bg-blue-50">-</button>' +
                    '<span class="text-xs w-5 text-center">' + item.qty + '</span>' +
                    '<button onclick="CashierModule.changeQty(' + index + ', 1)" class="text-xs text-gray-400 hover:text-blue-600 w-5 h-5 rounded-full hover:bg-blue-50">+</button>' +
                    '</div>' +
                    '</div>' +
                    '<div class="flex items-center gap-2">' +
                    '<span class="text-sm font-bold text-blue-600">' + total.toFixed(2) + ' SAR</span>' +
                    '<button onclick="CashierModule.removeFromCart(' + index + ')" class="text-red-400 hover:text-red-600 text-xs">✕</button>' +
                    '</div>' +
                    '</div>';
        });
        list.innerHTML = html;
        this.updateTotals();
    };

    // ===== 修改数量 =====
    window.CashierModule.changeQty = function(index, delta) {
        if (index < 0 || index >= this.cart.length) return;
        var item = this.cart[index];
        item.qty = Math.max(1, item.qty + delta);
        this.updateCart();
    };

    // ===== 移除商品 =====
    window.CashierModule.removeFromCart = function(index) {
        if (index < 0 || index >= this.cart.length) return;
        this.cart.splice(index, 1);
        this.updateCart();
    };

    // ===== 清空购物车 =====
    window.CashierModule.clearCart = function() {
        if (this.cart.length === 0) return;
        this.cart = [];
        this.updateCart();
        this.toast('🗑️ 已清空购物车', 'info');
    };

    // ===== 更新合计 =====
    window.CashierModule.updateTotals = function() {
        var subtotal = this.cart.reduce(function(sum, item) {
            return sum + (item.price * item.qty);
        }, 0);

        var discount = 0;
        // 检查是否有优惠券
        if (this._couponDiscount) {
            discount = this._couponDiscount;
        }

        var vatRate = 15;
        var vat = (subtotal - discount) * vatRate / 100;
        var total = subtotal - discount + vat;

        if (this.el.cartSubtotal) this.el.cartSubtotal.textContent = subtotal.toFixed(2) + ' SAR';
        if (this.el.cartDiscount) this.el.cartDiscount.textContent = discount.toFixed(2) + ' SAR';
        if (this.el.cartVat) this.el.cartVat.textContent = vat.toFixed(2) + ' SAR';
        if (this.el.cartTotal) this.el.cartTotal.textContent = total.toFixed(2) + ' SAR';
    };

    // ===== 选择支付方式 =====
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
        document.querySelectorAll('.payment-btn').forEach(function(btn) {
            btn.classList.remove('border-blue-400', 'bg-blue-50');
            if (btn.dataset.payment === method) {
                btn.classList.add('border-blue-400', 'bg-blue-50');
            }
        });
    };

    // ===== 应用优惠券 =====
    window.CashierModule.applyCoupon = function() {
        var input = this.el.couponInput;
        if (!input) return;
        var code = input.value.trim();
        if (!code) {
            this.toast('请输入优惠券码', 'error');
            return;
        }

        // 模拟优惠券验证
        if (code === 'WELCOME10') {
            this._couponDiscount = 10;
            this.el.couponDisplay.classList.remove('hidden');
            this.el.couponDisplay.textContent = '✅ 优惠券已应用: -10 SAR';
            this.updateTotals();
            this.toast('✅ 优惠券已应用', 'success');
        } else if (code === 'VIP20') {
            this._couponDiscount = 20;
            this.el.couponDisplay.classList.remove('hidden');
            this.el.couponDisplay.textContent = '✅ 优惠券已应用: -20 SAR';
            this.updateTotals();
            this.toast('✅ 优惠券已应用', 'success');
        } else {
            this.toast('❌ 无效优惠券码', 'error');
        }
    };

    // ===== 收款结账 =====
    window.CashierModule.checkout = function() {
        if (this.cart.length === 0) {
            this.toast('请添加服务或商品', 'error');
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

        var plate = this.selectedCustomer ? (this.selectedCustomer.plate_number || '') : '';
        if (!plate) {
            // 如果没有客户，使用快速输入的
            var searchVal = this.el.search ? this.el.search.value.trim() : '';
            plate = searchVal.toUpperCase() || 'GUEST';
        }

        var subtotal = this.cart.reduce(function(sum, item) {
            return sum + (item.price * item.qty);
        }, 0);
        var discount = this._couponDiscount || 0;
        var vatRate = 15;
        var vat = (subtotal - discount) * vatRate / 100;
        var total = subtotal - discount + vat;

        var today = new Date().toISOString().split('T')[0];
        var orders = AppStore.get('allOrders') || [];
        var todayOrders = orders.filter(function(o) { return o.date === today; });
        var orderNumber = 'ORD-' + today.replace(/-/g, '') + '-' + String(todayOrders.length + 1).padStart(4, '0');

        var serviceNames = this.cart.map(function(item) {
            return item.name + '×' + item.qty;
        }).join(', ');

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
            created_at: new Date().toISOString(),
            items: JSON.stringify(this.cart)
        };

        var self = this;
        AppApi.insert('orders', orderData)
            .then(function(data) {
                if (data && data.length > 0) {
                    var allOrders = AppStore.get('allOrders') || [];
                    allOrders.unshift(data[0]);
                    AppStore.set('allOrders', allOrders);

                    // 更新客户信息
                    if (self.selectedCustomer) {
                        var customers = AppStore.get('allCustomers') || [];
                        var cust = customers.find(function(c) { return c.id === self.selectedCustomer.id; });
                        if (cust) {
                            cust.visit_count = (cust.visit_count || 0) + 1;
                            cust.last_visit = new Date().toISOString();
                            AppStore.set('allCustomers', customers);
                        }
                    }

                    self.toast('✅ 收款成功: ' + total.toFixed(2) + ' SAR', 'success');

                    // 清空购物车
                    self.cart = [];
                    self._couponDiscount = 0;
                    self.selectedPayment = null;
                    self.updateCart();
                    self.updateBottomBar();

                    if (self.el.couponDisplay) {
                        self.el.couponDisplay.classList.add('hidden');
                        self.el.couponDisplay.textContent = '';
                    }
                    if (self.el.selectedPayment) {
                        self.el.selectedPayment.textContent = '请选择支付方式';
                        self.el.selectedPayment.className = 'text-xs text-blue-600 mt-1 text-center';
                    }
                    document.querySelectorAll('.payment-btn').forEach(function(btn) {
                        btn.classList.remove('border-blue-400', 'bg-blue-50');
                    });

                    // 语音播报
                    self.voiceTotal();
                }
            })
            .catch(function(error) {
                self.toast('❌ 收款失败: ' + error.message, 'error');
            });
    };

    // ===== 快速搜索 =====
    window.CashierModule.quickSearch = function() {
        var input = this.el.search;
        if (!input) return;
        var query = input.value.trim();
        if (!query) {
            this.toast('请输入车牌或手机号', 'error');
            return;
        }

        var customers = AppStore.get('allCustomers') || [];
        var customer = customers.find(function(c) {
            return c.plate_number === query.toUpperCase() ||
                   c.phone === query ||
                   c.name === query;
        });

        if (customer) {
            this.selectedCustomer = customer;
            this.updateCustomerInfo();
            this.toast('👤 找到客户: ' + (customer.name || customer.phone), 'success');
        } else {
            this.selectedCustomer = null;
            this.updateCustomerInfo();
            this.toast('⚠️ 未找到客户，可快速添加', 'warning');
            // 自动弹出添加客户
            this.quickNewCustomer();
        }
    };

    // ===== 更新客户信息 =====
    window.CashierModule.updateCustomerInfo = function() {
        var customer = this.selectedCustomer;
        var card = this.el.customerCard;
        if (!card) return;

        if (!customer) {
            card.classList.add('hidden');
            if (this.el.vehicleCard) this.el.vehicleCard.classList.add('hidden');
            return;
        }

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

        // 车辆信息
        if (this.el.vehicleCard) {
            var vehicles = AppStore.get('allVehicles') || [];
            var vehicle = vehicles.find(function(v) { return v.customer_id === customer.id; });
            if (vehicle) {
                this.el.vehicleCard.classList.remove('hidden');
                if (this.el.vehicleDisplayPlate) this.el.vehicleDisplayPlate.textContent = vehicle.plate_number || '-';
                if (this.el.vehicleDisplayModel) {
                    var model = (vehicle.brand || '') + ' ' + (vehicle.model || '');
                    this.el.vehicleDisplayModel.textContent = model || '-';
                }
                if (this.el.vehicleDisplayStatus) {
                    this.el.vehicleDisplayStatus.textContent = '✅ 已登记';
                    this.el.vehicleDisplayStatus.className = 'text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full';
                }
                if (this.el.vehicleLastService) {
                    var orders = AppStore.get('allOrders') || [];
                    var lastOrder = orders.find(function(o) { return o.customer_id === customer.id; });
                    this.el.vehicleLastService.textContent = lastOrder ? new Date(lastOrder.created_at).toLocaleDateString() : '-';
                }
            } else {
                this.el.vehicleCard.classList.add('hidden');
            }
        }
    };

    // ===== 更新底部栏 =====
    window.CashierModule.updateBottomBar = function() {
        var orders = AppStore.get('allOrders') || [];
        var today = new Date().toISOString().split('T')[0];
        var todayOrders = orders.filter(function(o) {
            return o.date === today && o.status === 'completed';
        });

        var count = todayOrders.length;
        var revenue = todayOrders.reduce(function(sum, o) {
            return sum + (parseFloat(o.total) || 0);
        }, 0);

        if (this.el.cashierTodayCount) this.el.cashierTodayCount.textContent = count;
        if (this.el.cashierTodayRevenue) this.el.cashierTodayRevenue.textContent = revenue.toFixed(2) + ' SAR';
    };

    // ===== 快速添加客户 =====
    window.CashierModule.quickNewCustomer = function() {
        var modal = document.getElementById('newCustomerModal');
        if (modal) modal.classList.remove('hidden');
        if (this.el.newCustName) setTimeout(function() { this.el.newCustName.focus(); }.bind(this), 100);
    };

    window.CashierModule.closeNewCustomer = function() {
        var modal = document.getElementById('newCustomerModal');
        if (modal) modal.classList.add('hidden');
    };

    window.CashierModule.saveNewCustomer = function() {
        var self = this;
        var name = this.el.newCustName ? this.el.newCustName.value.trim() : '';
        var phone = this.el.newCustPhone ? this.el.newCustPhone.value.trim() : '';
        var plate = this.el.newCustPlate ? this.el.newCustPlate.value.trim().toUpperCase() : '';

        if (!name || !phone) {
            this.toast('请填写姓名和手机号', 'error');
            return;
        }

        var tenant = AppStore.get('currentTenant');
        var store = AppStore.get('currentStore');

        var customerData = {
            tenant_id: tenant ? tenant.id : null,
            store_id: store ? store.id : null,
            name: name,
            phone: phone,
            plate_number: plate,
            points: 0,
            balance: 0,
            level: '普通',
            visit_count: 0
        };

        AppApi.insert('customers', customerData)
            .then(function(data) {
                if (data && data.length > 0) {
                    var customers = AppStore.get('allCustomers') || [];
                    customers.push(data[0]);
                    AppStore.set('allCustomers', customers);
                    self.selectedCustomer = data[0];
                    self.updateCustomerInfo();
                    if (self.el.search) self.el.search.value = plate || phone;
                    self.toast('✅ 客户已添加: ' + name, 'success');
                    self.closeNewCustomer();
                }
            })
            .catch(function(error) {
                self.toast('❌ 添加失败: ' + error.message, 'error');
            });
    };

    // ===== 挂单功能 =====
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
            payment: this.selectedPayment,
            held_at: new Date().toISOString()
        };

        if (!window.heldOrders) window.heldOrders = [];
        window.heldOrders.push(holdData);

        // 清空购物车
        this.cart = [];
        this._couponDiscount = 0;
        this.selectedPayment = null;
        this.updateCart();
        if (this.el.couponDisplay) {
            this.el.couponDisplay.classList.add('hidden');
            this.el.couponDisplay.textContent = '';
        }
        if (this.el.selectedPayment) {
            this.el.selectedPayment.textContent = '请选择支付方式';
            this.el.selectedPayment.className = 'text-xs text-blue-600 mt-1 text-center';
        }
        document.querySelectorAll('.payment-btn').forEach(function(btn) {
            btn.classList.remove('border-blue-400', 'bg-blue-50');
        });

        this.toast('📌 已挂单: ' + plate, 'success');
        this.showHoldOrders();
    };

    window.CashierModule.showHoldOrders = function() {
        var modal = document.getElementById('holdOrdersModal');
        if (!modal) return;
        var list = document.getElementById('holdOrdersList');
        if (!list) return;

        var orders = window.heldOrders || [];
        if (orders.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 py-4 text-sm">暂无挂单</div>';
        } else {
            var html = '';
            orders.forEach(function(o, index) {
                var time = new Date(o.held_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                var items = o.cart.map(function(item) {
                    return item.name + '×' + item.qty;
                }).join(', ');
                html += '<div class="flex justify-between items-center p-2 border-b hover:bg-gray-50 rounded">' +
                        '<div><span class="font-medium">🚗 ' + o.plate + '</span>' +
                        '<span class="text-xs text-gray-400 ml-2">' + items + '</span>' +
                        '<span class="text-xs text-gray-400 ml-2">' + time + '</span></div>' +
                        '<div class="flex gap-2">' +
                        '<button onclick="CashierModule.loadHoldOrder(' + index + ')" class="text-blue-600 text-xs hover:underline">加载</button>' +
                        '<button onclick="CashierModule.removeHoldOrder(' + index + ')" class="text-red-500 text-xs hover:underline">删除</button>' +
                        '</div></div>';
            });
            list.innerHTML = html;
        }
        modal.classList.remove('hidden');
    };

    window.CashierModule.loadHoldOrder = function(index) {
        var orders = window.heldOrders || [];
        if (index < 0 || index >= orders.length) return;
        var o = orders[index];

        this.selectedCustomer = o.customer;
        this.cart = JSON.parse(JSON.stringify(o.cart));
        this._couponDiscount = o.discount || 0;
        this.selectedPayment = o.payment;

        if (this._couponDiscount > 0 && this.el.couponDisplay) {
            this.el.couponDisplay.classList.remove('hidden');
            this.el.couponDisplay.textContent = '✅ 优惠券已应用: -' + this._couponDiscount + ' SAR';
        }

        if (this.selectedPayment) {
            this.selectPayment(this.selectedPayment);
        }

        orders.splice(index, 1);
        this.updateCart();
        this.updateCustomerInfo();
        this.toast('✅ 已加载挂单', 'success');
        this.closeHoldOrders();
    };

    window.CashierModule.removeHoldOrder = function(index) {
        var orders = window.heldOrders || [];
        if (index < 0 || index >= orders.length) return;
        orders.splice(index, 1);
        this.showHoldOrders();
    };

    window.CashierModule.closeHoldOrders = function() {
        var modal = document.getElementById('holdOrdersModal');
        if (modal) modal.classList.add('hidden');
    };

    // ===== 打印功能 =====
    window.CashierModule.showPrintOptions = function() {
        var modal = document.getElementById('printOptionsModal');
        if (modal) modal.classList.remove('hidden');
    };

    window.CashierModule.closePrintOptions = function() {
        var modal = document.getElementById('printOptionsModal');
        if (modal) modal.classList.add('hidden');
    };

    // ===== 语音播报 =====
    window.CashierModule.voiceTotal = function() {
        var total = this.el.cartTotal ? this.el.cartTotal.textContent : '0 SAR';
        var msg = new SpeechSynthesisUtterance('收款成功，总计 ' + total);
        msg.lang = 'zh-CN';
        window.speechSynthesis.speak(msg);
    };

    // ===== 占位方法 =====
    window.CashierModule.editCustomer = function() {
        this.toast('✏️ 编辑客户功能开发中', 'info');
    };

    window.CashierModule.addVehicle = function() {
        this.toast('🚗 添加车辆功能开发中', 'info');
    };

    window.CashierModule.recharge = function() {
        this.toast('💰 充值功能开发中', 'info');
    };

    window.CashierModule.scanQR = function() {
        this.toast('📱 扫码功能开发中', 'info');
    };

    console.log('[Cashier] V7 模块已注册');
})();