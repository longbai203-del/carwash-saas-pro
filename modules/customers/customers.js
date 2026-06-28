/**
 * customers.js - CRM 客户管理模块 V2
 * 包含：客户管理、车辆管理、套餐、积分、优惠券、提醒
 */
(function() {
    'use strict';

    window.CustomersModule = Object.create(ModuleBase);
    window.CustomersModule.moduleName = 'customers';

    // ===== 缓存 DOM =====
    window.CustomersModule.cacheDom = function() {
        this.el = {
            membersList: document.getElementById('membersList'),
            vehicleList: document.getElementById('vehicleList'),
            packageList: document.getElementById('packageList'),
            customerSearch: document.getElementById('customerSearch'),
            customerLevelFilter: document.getElementById('customerLevelFilter'),
            customerStatusFilter: document.getElementById('customerStatusFilter'),
            crmTotalCustomers: document.getElementById('crmTotalCustomers'),
            crmActiveCustomers: document.getElementById('crmActiveCustomers'),
            crmTotalPoints: document.getElementById('crmTotalPoints'),
            crmBirthdayThisMonth: document.getElementById('crmBirthdayThisMonth'),
            crmInactiveCustomers: document.getElementById('crmInactiveCustomers'),
            // 添加客户
            addCustomerModal: document.getElementById('addCustomerModal'),
            custName: document.getElementById('custName'),
            custPhone: document.getElementById('custPhone'),
            custWhatsApp: document.getElementById('custWhatsApp'),
            custEmail: document.getElementById('custEmail'),
            custBirthday: document.getElementById('custBirthday'),
            custPlate: document.getElementById('custPlate'),
            custAddress: document.getElementById('custAddress'),
            custNotes: document.getElementById('custNotes'),
            // 添加车辆
            addVehicleModal: document.getElementById('addVehicleModal'),
            vehicleCustomer: document.getElementById('vehicleCustomer'),
            vehiclePlate: document.getElementById('vehiclePlate'),
            vehicleBrand: document.getElementById('vehicleBrand'),
            vehicleModel: document.getElementById('vehicleModel'),
            vehicleYear: document.getElementById('vehicleYear'),
            vehicleColor: document.getElementById('vehicleColor'),
            // 套餐
            addPackageModal: document.getElementById('addPackageModal'),
            packageName: document.getElementById('packageName'),
            packageDesc: document.getElementById('packageDesc'),
            packagePrice: document.getElementById('packagePrice'),
            packageSessions: document.getElementById('packageSessions'),
            packageServices: document.getElementById('packageServices'),
            packageValidity: document.getElementById('packageValidity'),
            // 提醒
            sendReminderModal: document.getElementById('sendReminderModal'),
            reminderCustomer: document.getElementById('reminderCustomer'),
            reminderType: document.getElementById('reminderType'),
            reminderMessage: document.getElementById('reminderMessage'),
            // 车辆历史
            vehicleHistoryModal: document.getElementById('vehicleHistoryModal'),
            vehicleHistoryContent: document.getElementById('vehicleHistoryContent'),
            vehicleHistoryTitle: document.getElementById('vehicleHistoryTitle')
        };
    };

    // ===== 绑定事件 =====
    window.CustomersModule.bindEvents = function() {
        var self = this;
        if (this.el.customerSearch) {
            this.el.customerSearch.addEventListener('input', function() { self.filterCustomers(); });
        }
        if (this.el.customerLevelFilter) {
            this.el.customerLevelFilter.addEventListener('change', function() { self.filterCustomers(); });
        }
        if (this.el.customerStatusFilter) {
            this.el.customerStatusFilter.addEventListener('change', function() { self.filterCustomers(); });
        }
    };

    // ============================================================
    // 加载数据
    // ============================================================

    window.CustomersModule.loadData = function() {
        this.loadCustomers();
        this.loadVehicles();
        this.loadPackages();
        this.loadMembershipLevels();
        this.updateStats();
    };

    // ===== 加载客户 =====
    window.CustomersModule.loadCustomers = function() {
        var self = this;
        AppApi.query('customers', { order: { by: 'created_at', ascending: false } })
            .then(function(data) {
                AppStore.set('allCustomers', data || []);
                self.renderCustomers(data || []);
                self.updateCustomerSelects(data || []);
            })
            .catch(function(error) {
                console.error('[Customers] 加载客户失败:', error);
            });
    };

    // ===== 加载车辆 =====
    window.CustomersModule.loadVehicles = function() {
        var self = this;
        AppApi.query('vehicles', { order: { by: 'created_at', ascending: false } })
            .then(function(data) {
                AppStore.set('allVehicles', data || []);
                self.renderVehicles(data || []);
            })
            .catch(function(error) {
                console.error('[Customers] 加载车辆失败:', error);
            });
    };

    // ===== 加载套餐 =====
    window.CustomersModule.loadPackages = function() {
        var self = this;
        AppApi.query('packages', { order: { by: 'created_at', ascending: false } })
            .then(function(data) {
                AppStore.set('allPackages', data || []);
                self.renderPackages(data || []);
            })
            .catch(function(error) {
                console.error('[Customers] 加载套餐失败:', error);
            });
    };

    // ===== 加载会员等级 =====
    window.CustomersModule.loadMembershipLevels = function() {
        var self = this;
        AppApi.query('membership_levels', { order: { by: 'min_points', ascending: true } })
            .then(function(data) {
                self.membershipLevels = data || [];
                self.updateLevelFilter(data || []);
            })
            .catch(function(error) {
                console.error('[Customers] 加载会员等级失败:', error);
            });
    };

    // ============================================================
    // 渲染函数
    // ============================================================

    // ===== 渲染客户列表 =====
    window.CustomersModule.renderCustomers = function(customers) {
        var list = this.el.membersList;
        if (!list) return;

        if (!customers || customers.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 py-8">暂无客户</div>';
            return;
        }

        var levelMap = {};
        (this.membershipLevels || []).forEach(function(l) {
            levelMap[l.id] = l;
        });

        var html = '';
        var self = this;
        customers.forEach(function(c) {
            var level = levelMap[c.membership_level_id] || { name: '普通', color: '#6b7280', icon: '⭐' };
            var isActive = (c.visit_count || 0) > 0 && c.last_visit && new Date(c.last_visit) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            var statusText = isActive ? '✅ 活跃' : '💤 沉睡';
            var statusClass = isActive ? 'text-green-600' : 'text-gray-400';

            html += '<div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border hover:border-blue-300 cursor-pointer" onclick="CustomersModule.showCustomerDetail(\'' + c.id + '\')">';
            html += '<div><strong>' + (c.name || 'Unknown') + '</strong>';
            html += '<span style="color:' + level.color + ';font-weight:bold;"> ' + level.icon + ' ' + level.name + '</span>';
            html += '<br><small>' + (c.phone || '') + ' | ' + (c.plate_number || '') + '</small>';
            if (c.birth_date) {
                html += ' <span class="text-xs text-pink-500">🎂 ' + c.birth_date + '</span>';
            }
            html += '</div>';
            html += '<div class="text-right">';
            html += '<div>余额: <span class="font-bold text-green-600">' + (c.balance || 0).toFixed(2) + ' SAR</span></div>';
            html += '<div class="text-sm">积分: ' + (c.points || 0) + ' | 到店: ' + (c.visit_count || 0) + '次</div>';
            html += '<div class="text-xs ' + statusClass + '">' + statusText + '</div>';
            html += '</div></div>';
        });
        list.innerHTML = html;
    };

    // ===== 渲染车辆列表 =====
    window.CustomersModule.renderVehicles = function(vehicles) {
        var list = this.el.vehicleList;
        if (!list) return;

        if (!vehicles || vehicles.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 py-4">暂无车辆</div>';
            return;
        }

        var customers = AppStore.get('allCustomers') || [];
        var html = '';
        vehicles.slice(0, 10).forEach(function(v) {
            var customer = customers.find(function(c) { return c.id === v.customer_id; });
            html += '<div class="flex justify-between items-center p-2 bg-gray-50 rounded-xl border">';
            html += '<div><span class="font-bold">' + v.plate_number + '</span>';
            html += '<span class="text-sm text-gray-400 ml-2">' + (v.brand || '') + ' ' + (v.model || '') + '</span>';
            html += '<span class="text-sm text-gray-400 ml-2">' + (v.color || '') + '</span></div>';
            html += '<div class="text-sm text-gray-400">' + (customer ? customer.name : '') + '</div>';
            html += '<button onclick="CustomersModule.showVehicleHistory(\'' + v.id + '\')" class="text-blue-600 hover:text-blue-800 text-sm"><i class="fas fa-history"></i></button>';
            html += '</div>';
        });
        list.innerHTML = html;
    };

    // ===== 渲染套餐列表 =====
    window.CustomersModule.renderPackages = function(packages) {
        var list = this.el.packageList;
        if (!list) return;

        if (!packages || packages.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 py-4">暂无套餐</div>';
            return;
        }

        var html = '';
        packages.forEach(function(p) {
            html += '<div class="flex justify-between items-center p-2 bg-gray-50 rounded-xl border">';
            html += '<div><span class="font-bold">' + p.name + '</span>';
            html += '<span class="text-sm text-gray-400 ml-2">' + p.description + '</span>';
            html += '<span class="text-xs text-gray-400 ml-2">' + p.sessions + '次</span></div>';
            html += '<div class="flex items-center gap-3">';
            html += '<span class="font-bold text-blue-600">' + (p.price || 0).toFixed(2) + ' SAR</span>';
            html += '<span class="text-xs text-green-600">' + (p.is_active ? '✅ 有效' : '❌ 停用') + '</span>';
            html += '</div></div>';
        });
        list.innerHTML = html;
    };

    // ===== 更新统计 =====
    window.CustomersModule.updateStats = function() {
        var customers = AppStore.get('allCustomers') || [];
        var total = customers.length;
        var active = customers.filter(function(c) {
            return c.last_visit && new Date(c.last_visit) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }).length;
        var totalPoints = customers.reduce(function(s, c) { return s + (c.points || 0); }, 0);

        var now = new Date();
        var thisMonth = now.getMonth();
        var thisYear = now.getFullYear();
        var birthdays = customers.filter(function(c) {
            if (!c.birth_date) return false;
            var bd = new Date(c.birth_date);
            return bd.getMonth() === thisMonth;
        }).length;

        var inactive = customers.filter(function(c) {
            return !c.last_visit || new Date(c.last_visit) < new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        }).length;

        if (this.el.crmTotalCustomers) this.el.crmTotalCustomers.textContent = total;
        if (this.el.crmActiveCustomers) this.el.crmActiveCustomers.textContent = active;
        if (this.el.crmTotalPoints) this.el.crmTotalPoints.textContent = totalPoints;
        if (this.el.crmBirthdayThisMonth) this.el.crmBirthdayThisMonth.textContent = birthdays;
        if (this.el.crmInactiveCustomers) this.el.crmInactiveCustomers.textContent = inactive;
    };

    // ===== 更新筛选器 =====
    window.CustomersModule.updateLevelFilter = function(levels) {
        var sel = this.el.customerLevelFilter;
        if (!sel) return;
        var html = '<option value="all">全部等级</option>';
        levels.forEach(function(l) {
            html += '<option value="' + l.id + '">' + l.icon + ' ' + l.name + '</option>';
        });
        sel.innerHTML = html;
    };

    window.CustomersModule.updateCustomerSelects = function(customers) {
        ['vehicleCustomer', 'reminderCustomer'].forEach(function(id) {
            var sel = document.getElementById(id);
            if (sel) {
                var html = '';
                (customers || []).forEach(function(c) {
                    html += '<option value="' + c.id + '">' + c.name + ' (' + c.phone + ')</option>';
                });
                sel.innerHTML = html || '<option value="">暂无客户</option>';
            }
        });
    };

    // ============================================================
    // 筛选客户
    // ============================================================

    window.CustomersModule.filterCustomers = function() {
        var customers = AppStore.get('allCustomers') || [];
        var search = this.el.customerSearch ? this.el.customerSearch.value.trim().toLowerCase() : '';
        var level = this.el.customerLevelFilter ? this.el.customerLevelFilter.value : 'all';
        var status = this.el.customerStatusFilter ? this.el.customerStatusFilter.value : 'all';

        var filtered = customers.filter(function(c) {
            var matchSearch = !search ||
                (c.name || '').toLowerCase().includes(search) ||
                (c.phone || '').includes(search) ||
                (c.plate_number || '').toLowerCase().includes(search);
            var matchLevel = level === 'all' || c.membership_level_id === level;
            var matchStatus = true;
            if (status === 'active') {
                matchStatus = c.last_visit && new Date(c.last_visit) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            } else if (status === 'inactive') {
                matchStatus = !c.last_visit || new Date(c.last_visit) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            } else if (status === 'birthday') {
                var now = new Date();
                matchStatus = c.birth_date && new Date(c.birth_date).getMonth() === now.getMonth();
            }
            return matchSearch && matchLevel && matchStatus;
        });

        this.renderCustomers(filtered);
    };

    // ============================================================
    // 添加客户
    // ============================================================

    window.CustomersModule.showAddCustomer = function() {
        var modal = this.el.addCustomerModal;
        if (modal) {
            modal.classList.remove('hidden');
            if (this.el.custName) this.el.custName.value = '';
            if (this.el.custPhone) this.el.custPhone.value = '';
            if (this.el.custWhatsApp) this.el.custWhatsApp.value = '';
            if (this.el.custEmail) this.el.custEmail.value = '';
            if (this.el.custBirthday) this.el.custBirthday.value = '';
            if (this.el.custPlate) this.el.custPlate.value = '';
            if (this.el.custAddress) this.el.custAddress.value = '';
            if (this.el.custNotes) this.el.custNotes.value = '';
            if (this.el.custName) setTimeout(function() { this.el.custName.focus(); }.bind(this), 100);
        }
    };

    window.CustomersModule.saveCustomer = function() {
        var self = this;
        var currentUser = this.getCurrentUser();

        var name = this.el.custName ? this.el.custName.value.trim() : '';
        var phone = this.el.custPhone ? this.el.custPhone.value.trim() : '';
        var whatsapp = this.el.custWhatsApp ? this.el.custWhatsApp.value.trim() : '';
        var email = this.el.custEmail ? this.el.custEmail.value.trim() : '';
        var birthday = this.el.custBirthday ? this.el.custBirthday.value : null;
        var plate = this.el.custPlate ? this.el.custPlate.value.trim().toUpperCase() : '';
        var address = this.el.custAddress ? this.el.custAddress.value.trim() : '';
        var notes = this.el.custNotes ? this.el.custNotes.value.trim() : '';

        if (!name || !phone) {
            this.toast('请填写姓名和电话', 'error');
            return;
        }

        var tenant = AppStore.get('currentTenant');
        var store = AppStore.get('currentStore');

        var customerData = {
            tenant_id: tenant ? tenant.id : null,
            store_id: store ? store.id : null,
            name: name,
            phone: phone,
            whatsapp_phone: whatsapp || phone,
            email: email,
            birth_date: birthday,
            plate_number: plate,
            address: address,
            notes: notes,
            points: 0,
            balance: 0,
            level: '普通',
            visit_count: 0,
            opt_in: true
        };

        AppApi.insert('customers', customerData)
            .then(function(data) {
                if (data && data.length > 0) {
                    self.toast('✅ 客户已添加: ' + name, 'success');
                    self.closeModal('addCustomerModal');
                    self.loadCustomers();
                    self.updateStats();
                }
            })
            .catch(function(error) {
                self.toast('❌ 添加失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 添加车辆
    // ============================================================

    window.CustomersModule.showAddVehicle = function() {
        var modal = this.el.addVehicleModal;
        if (modal) {
            modal.classList.remove('hidden');
            if (this.el.vehiclePlate) this.el.vehiclePlate.value = '';
            if (this.el.vehicleBrand) this.el.vehicleBrand.value = '';
            if (this.el.vehicleModel) this.el.vehicleModel.value = '';
            if (this.el.vehicleYear) this.el.vehicleYear.value = '';
            if (this.el.vehicleColor) this.el.vehicleColor.value = '';
            this.updateCustomerSelects(AppStore.get('allCustomers') || []);
            if (this.el.vehiclePlate) setTimeout(function() { this.el.vehiclePlate.focus(); }.bind(this), 100);
        }
    };

    window.CustomersModule.saveVehicle = function() {
        var self = this;
        var customerId = this.el.vehicleCustomer ? this.el.vehicleCustomer.value : '';
        var plate = this.el.vehiclePlate ? this.el.vehiclePlate.value.trim().toUpperCase() : '';
        var brand = this.el.vehicleBrand ? this.el.vehicleBrand.value.trim() : '';
        var model = this.el.vehicleModel ? this.el.vehicleModel.value.trim() : '';
        var year = this.el.vehicleYear ? parseInt(this.el.vehicleYear.value) || null : null;
        var color = this.el.vehicleColor ? this.el.vehicleColor.value.trim() : '';

        if (!customerId) {
            this.toast('请选择客户', 'error');
            return;
        }
        if (!plate) {
            this.toast('请输入车牌号', 'error');
            return;
        }

        var vehicleData = {
            customer_id: customerId,
            plate_number: plate,
            brand: brand,
            model: model,
            year: year,
            color: color
        };

        AppApi.insert('vehicles', vehicleData)
            .then(function() {
                self.toast('✅ 车辆已添加: ' + plate, 'success');
                self.closeModal('addVehicleModal');
                self.loadVehicles();
            })
            .catch(function(error) {
                self.toast('❌ 添加失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 车辆历史
    // ============================================================

    window.CustomersModule.showVehicleHistory = function(vehicleId) {
        var self = this;
        var vehicles = AppStore.get('allVehicles') || [];
        var vehicle = vehicles.find(function(v) { return v.id === vehicleId; });
        if (!vehicle) {
            this.toast('车辆不存在', 'error');
            return;
        }

        if (this.el.vehicleHistoryTitle) {
            this.el.vehicleHistoryTitle.textContent = '🚗 车辆历史 - ' + vehicle.plate_number;
        }

        AppApi.query('vehicle_history', { filter: { vehicle_id: vehicleId }, order: { by: 'service_date', ascending: false } })
            .then(function(history) {
                var content = self.el.vehicleHistoryContent;
                if (!content) return;

                if (!history || history.length === 0) {
                    content.innerHTML = '<div class="text-center text-gray-400 py-4">暂无服务记录</div>';
                } else {
                    var html = '';
                    history.forEach(function(h) {
                        html += '<div class="flex justify-between p-2 border-b text-sm">';
                        html += '<div><span class="font-medium">' + (h.service_type || '服务') + '</span>';
                        html += '<span class="text-gray-400 ml-2">' + h.service_date + '</span></div>';
                        html += '<div class="text-blue-600">' + (h.amount || 0).toFixed(2) + ' SAR</div>';
                        html += '</div>';
                    });
                    content.innerHTML = html;
                }

                if (self.el.vehicleHistoryModal) {
                    self.el.vehicleHistoryModal.classList.remove('hidden');
                }
            })
            .catch(function(error) {
                self.toast('❌ 加载历史失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 套餐管理
    // ============================================================

    window.CustomersModule.showAddPackage = function() {
        var modal = this.el.addPackageModal;
        if (modal) {
            modal.classList.remove('hidden');
            if (this.el.packageName) this.el.packageName.value = '';
            if (this.el.packageDesc) this.el.packageDesc.value = '';
            if (this.el.packagePrice) this.el.packagePrice.value = '';
            if (this.el.packageSessions) this.el.packageSessions.value = '1';
            if (this.el.packageServices) this.el.packageServices.value = '';
            if (this.el.packageValidity) this.el.packageValidity.value = '30';
            if (this.el.packageName) setTimeout(function() { this.el.packageName.focus(); }.bind(this), 100);
        }
    };

    window.CustomersModule.savePackage = function() {
        var self = this;
        var name = this.el.packageName ? this.el.packageName.value.trim() : '';
        var desc = this.el.packageDesc ? this.el.packageDesc.value.trim() : '';
        var price = this.el.packagePrice ? parseFloat(this.el.packagePrice.value) || 0 : 0;
        var sessions = this.el.packageSessions ? parseInt(this.el.packageSessions.value) || 1 : 1;
        var servicesStr = this.el.packageServices ? this.el.packageServices.value.trim() : '';
        var validity = this.el.packageValidity ? parseInt(this.el.packageValidity.value) || 30 : 30;

        if (!name || price <= 0) {
            this.toast('请填写套餐名称和价格', 'error');
            return;
        }

        var tenant = AppStore.get('currentTenant');
        var services = servicesStr ? servicesStr.split(',').map(function(s) { return s.trim(); }) : [];

        var packageData = {
            tenant_id: tenant ? tenant.id : null,
            name: name,
            description: desc,
            price: price,
            sessions: sessions,
            services: services,
            validity_days: validity,
            is_active: true
        };

        AppApi.insert('packages', packageData)
            .then(function() {
                self.toast('✅ 套餐已添加: ' + name, 'success');
                self.closeModal('addPackageModal');
                self.loadPackages();
            })
            .catch(function(error) {
                self.toast('❌ 添加失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 发送提醒
    // ============================================================

    window.CustomersModule.showSendReminder = function() {
        var modal = this.el.sendReminderModal;
        if (modal) {
            modal.classList.remove('hidden');
            this.updateCustomerSelects(AppStore.get('allCustomers') || []);
            if (this.el.reminderMessage) {
                this.el.reminderMessage.value = '';
            }
            // 根据类型设置默认消息
            this.el.reminderType.addEventListener('change', function() {
                var type = this.value;
                var msg = '';
                if (type === 'birthday') msg = '🎂 生日快乐！CarWash Pro 祝您生日快乐，今日洗车享 50% 折扣！';
                else if (type === 'loyalty') msg = '💎 感谢您一直以来的支持！您已升级为黄金会员，享受 15% 折扣！';
                else if (type === 'coupon') msg = '🎫 您有一张新优惠券！WELCOME10，下次洗车立减 10 SAR！';
                else if (type === 'revisit') msg = '🔄 亲爱的客户，您已经 30 天没有光临了，我们很想念您！预约洗车送免费打蜡！';
                document.getElementById('reminderMessage').value = msg;
            });
        }
    };

    window.CustomersModule.sendReminder = function() {
        var self = this;
        var customerId = this.el.reminderCustomer ? this.el.reminderCustomer.value : '';
        var type = this.el.reminderType ? this.el.reminderType.value : 'custom';
        var message = this.el.reminderMessage ? this.el.reminderMessage.value.trim() : '';

        if (!customerId) {
            this.toast('请选择客户', 'error');
            return;
        }
        if (!message) {
            this.toast('请输入消息内容', 'error');
            return;
        }

        var customers = AppStore.get('allCustomers') || [];
        var customer = customers.find(function(c) { return c.id === customerId; });
        if (!customer) {
            this.toast('客户不存在', 'error');
            return;
        }

        var tenant = AppStore.get('currentTenant');

        var reminderData = {
            tenant_id: tenant ? tenant.id : null,
            customer_id: customerId,
            type: type,
            message: message,
            status: 'sent'
        };

        AppApi.insert('whatsapp_reminders', reminderData)
            .then(function() {
                self.toast('✅ 提醒已发送给 ' + (customer.name || customer.phone), 'success');
                self.closeModal('sendReminderModal');
            })
            .catch(function(error) {
                self.toast('❌ 发送失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 客户详情
    // ============================================================

    window.CustomersModule.showCustomerDetail = function(customerId) {
        var customers = AppStore.get('allCustomers') || [];
        var customer = customers.find(function(c) { return c.id === customerId; });
        if (!customer) {
            this.toast('客户不存在', 'error');
            return;
        }

        var vehicles = AppStore.get('allVehicles') || [];
        var customerVehicles = vehicles.filter(function(v) { return v.customer_id === customerId; });

        var msg = '👤 ' + customer.name + '\n';
        msg += '📞 ' + customer.phone + '\n';
        msg += '🚗 ' + (customer.plate_number || '无车辆') + '\n';
        msg += '⭐ ' + (customer.level || '普通') + '\n';
        msg += '💰 余额: ' + (customer.balance || 0).toFixed(2) + ' SAR\n';
        msg += '🏅 积分: ' + (customer.points || 0) + '\n';
        msg += '📅 到店: ' + (customer.visit_count || 0) + '次\n';
        if (customerVehicles.length > 0) {
            msg += '🚗 车辆: ' + customerVehicles.map(function(v) { return v.plate_number; }).join(', ') + '\n';
        }
        if (customer.birth_date) {
            msg += '🎂 生日: ' + customer.birth_date + '\n';
        }

        this.toast(msg, 'info');
    };

    // ============================================================
    // 导出客户
    // ============================================================

    window.CustomersModule.exportCustomers = function() {
        var customers = AppStore.get('allCustomers') || [];
        if (customers.length === 0) {
            this.toast('暂无客户数据', 'error');
            return;
        }

        var data = [['姓名', '电话', 'WhatsApp', '邮箱', '车牌', '等级', '积分', '余额', '到店次数', '生日', '地址']];
        customers.forEach(function(c) {
            data.push([
                c.name || '',
                c.phone || '',
                c.whatsapp_phone || '',
                c.email || '',
                c.plate_number || '',
                c.level || '普通',
                c.points || 0,
                (c.balance || 0).toFixed(2),
                c.visit_count || 0,
                c.birth_date || '',
                c.address || ''
            ]);
        });

        var ws = XLSX.utils.aoa_to_sheet(data);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '客户数据');
        XLSX.writeFile(wb, '客户数据_' + new Date().toISOString().split('T')[0] + '.xlsx');
        this.toast('✅ 客户数据已导出', 'success');
    };

    // ============================================================
    // 关闭模态框
    // ============================================================

    window.CustomersModule.closeModal = function(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    };

    console.log('[Customers] 模块已注册');
})();