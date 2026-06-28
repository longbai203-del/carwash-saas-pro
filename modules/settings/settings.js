/**
 * settings.js - 系统设置模块
 */
(function() {
    'use strict';

    window.SettingsModule = Object.create(ModuleBase);
    window.SettingsModule.moduleName = 'settings';

    // ===== 缓存 DOM =====
    window.SettingsModule.cacheDom = function() {
        this.el = {
            shopName: document.getElementById('shopName'),
            shopTaxId: document.getElementById('shopTaxId'),
            vatRate: document.getElementById('vatRateInput'),
            commissionRate: document.getElementById('commissionRate'),
            lowStockAlert: document.getElementById('lowStockAlert'),
            saveBtn: document.getElementById('saveSettingsBtn'),
            storeList: document.getElementById('storeList'),
            addStoreModal: document.getElementById('addStoreModal'),
            storeName: document.getElementById('storeName'),
            storeAddress: document.getElementById('storeAddress'),
            storePhone: document.getElementById('storePhone'),
            storeManager: document.getElementById('storeManager')
        };
    };

    // ===== 绑定事件 =====
    window.SettingsModule.bindEvents = function() {
        var self = this;
        if (this.el.saveBtn) {
            this.el.saveBtn.addEventListener('click', function() { self.saveSettings(); });
        }
    };

    // ===== 加载数据 =====
    window.SettingsModule.loadData = function() {
        this.loadSettings();
        this.loadStores();
    };

    // ===== 加载设置 =====
    window.SettingsModule.loadSettings = function() {
        var config = this.getData('config') || {};
        if (this.el.shopName) this.el.shopName.value = config.shopName || '';
        if (this.el.shopTaxId) this.el.shopTaxId.value = config.shopTaxId || '';
        if (this.el.vatRate) this.el.vatRate.value = config.vatRate || 15;
        if (this.el.commissionRate) this.el.commissionRate.value = config.commissionRate || 5;
        if (this.el.lowStockAlert) this.el.lowStockAlert.value = config.lowStockAlert || 5;
    };

    // ===== 保存设置 =====
    window.SettingsModule.saveSettings = function() {
        var currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'owner') {
            this.toast('只有老板可以修改设置', 'error');
            return;
        }

        var config = this.getData('config') || {};
        if (this.el.shopName) config.shopName = this.el.shopName.value.trim() || config.shopName;
        if (this.el.shopTaxId) config.shopTaxId = this.el.shopTaxId.value.trim() || config.shopTaxId;
        if (this.el.vatRate) config.vatRate = parseFloat(this.el.vatRate.value) || 15;
        if (this.el.commissionRate) config.commissionRate = parseFloat(this.el.commissionRate.value) || 5;
        if (this.el.lowStockAlert) config.lowStockAlert = parseInt(this.el.lowStockAlert.value) || 5;

        this.setData('config', config);
        localStorage.setItem('cw_config', JSON.stringify(config));
        this.toast('✅ 设置已保存', 'success');
    };

    // ===== 加载门店 =====
    window.SettingsModule.loadStores = function() {
        var stores = this.getData('allStores') || [];
        var list = this.el.storeList;
        if (!list) return;

        if (stores.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 py-4">暂无门店</div>';
            return;
        }

        var html = '';
        stores.forEach(function(s) {
            var statusClass = s.status === 'active' ? 'text-green-600' : 'text-red-600';
            html += '<div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl border hover:border-blue-300">';
            html += '<div><span class="font-bold">' + s.name + '</span>';
            html += '<span class="text-sm text-gray-400 ml-2">' + (s.address || '') + '</span>';
            html += '<span class="text-xs text-gray-400 ml-2">' + (s.phone || '') + '</span></div>';
            html += '<div class="flex gap-2 items-center">';
            html += '<span class="text-xs ' + statusClass + '">' + (s.status === 'active' ? '🟢 营业中' : '🔴 已停业') + '</span>';
            if (s.manager_name) {
                html += '<span class="text-xs text-gray-400">👤 ' + s.manager_name + '</span>';
            }
            html += '</div></div>';
        });
        list.innerHTML = html;
    };

    // ===== 显示添加门店 =====
    window.SettingsModule.showAddStore = function() {
        var modal = this.el.addStoreModal;
        if (modal) {
            modal.classList.remove('hidden');
            if (this.el.storeName) this.el.storeName.value = '';
            if (this.el.storeAddress) this.el.storeAddress.value = '';
            if (this.el.storePhone) this.el.storePhone.value = '';
            if (this.el.storeManager) this.el.storeManager.value = '';
            // 聚焦到名称输入框
            if (this.el.storeName) setTimeout(function() { this.el.storeName.focus(); }.bind(this), 100);
        }
    };

    // ===== 关闭添加门店 =====
    window.SettingsModule.closeAddStore = function() {
        var modal = this.el.addStoreModal;
        if (modal) modal.classList.add('hidden');
    };

    // ===== 保存门店 =====
    window.SettingsModule.saveStore = function() {
        var self = this;
        var currentUser = this.getCurrentUser();

        if (!currentUser || currentUser.role !== 'owner') {
            this.toast('只有老板可以添加门店', 'error');
            return;
        }

        var name = this.el.storeName ? this.el.storeName.value.trim() : '';
        var address = this.el.storeAddress ? this.el.storeAddress.value.trim() : '';
        var phone = this.el.storePhone ? this.el.storePhone.value.trim() : '';
        var manager = this.el.storeManager ? this.el.storeManager.value.trim() : '';

        if (!name) {
            this.toast('请输入门店名称', 'error');
            return;
        }

        var tenant = AppStore.get('currentTenant');
        if (!tenant) {
            this.toast('请先选择租户', 'error');
            return;
        }

        var storeData = {
            tenant_id: tenant.id,
            name: name,
            address: address,
            phone: phone,
            manager_name: manager || '',
            status: 'active'
        };

        AppApi.insert('stores', storeData)
            .then(function(data) {
                if (data && data.length > 0) {
                    var stores = self.getData('allStores') || [];
                    stores.push(data[0]);
                    self.setData('allStores', stores);
                    self.loadStores();
                    self.closeAddStore();
                    self.toast('✅ 门店已添加: ' + name, 'success');
                    // 更新门店选择器
                    if (window.App && App.updateBranchSelector) {
                        App.updateBranchSelector();
                    }
                }
            })
            .catch(function(error) {
                self.toast('❌ 添加失败: ' + error.message, 'error');
            });
    };

    console.log('[Settings] 模块已注册');
})();