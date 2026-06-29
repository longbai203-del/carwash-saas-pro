/**
 * vehicle-monitor.js - 车辆监控模块
 * 功能：车辆进出记录、停留时间追踪、实时计数
 * 权限：仅老板(owner)和系统管理员(admin)可访问
 * 
 * 注意：此模块完全独立，不修改任何原有框架代码
 */
(function() {
    'use strict';

    // ===== 权限检查 =====
    function checkPermission() {
        var user = AppStore.get('currentUser');
        if (!user) return false;
        return user.role === 'owner' || user.role === 'admin';
    }

    // ===== 模块定义 =====
    window.VehicleMonitorModule = Object.create(ModuleBase);
    window.VehicleMonitorModule.moduleName = 'vehicle-monitor';

    // ===== 状态 =====
    window.VehicleMonitorModule.activeVehicles = [];
    window.VehicleMonitorModule.records = [];
    window.VehicleMonitorModule.autoUpdateInterval = null;

    // ===== 缓存 DOM =====
    window.VehicleMonitorModule.cacheDom = function() {
        // 权限检查 - 无权限时显示提示
        if (!checkPermission()) {
            var container = document.getElementById('moduleContent');
            if (container) {
                container.innerHTML = `
                    <div class="glass-card p-12 text-center">
                        <div class="text-6xl mb-4">🔒</div>
                        <h2 class="text-2xl font-bold text-red-600">权限不足</h2>
                        <p class="text-gray-400 mt-2">此页面仅限老板和系统管理员访问</p>
                        <button onclick="AppRouter.navigate('dashboard')" class="btn-primary mt-4 px-6 py-2 rounded-lg">
                            返回仪表板
                        </button>
                    </div>
                `;
            }
            return;
        }

        this.el = {
            todayTotal: this.getEl('vmTodayTotal'),
            todayIn: this.getEl('vmTodayIn'),
            todayOut: this.getEl('vmTodayOut'),
            currentlyInside: this.getEl('vmCurrentlyInside'),
            avgStayTime: this.getEl('vmAvgStayTime'),
            todayInRate: this.getEl('vmTodayInRate'),
            todayOutRate: this.getEl('vmTodayOutRate'),
            statusDot: this.getEl('vmStatusDot'),
            statusText: this.getEl('vmStatusText'),
            recordCount: this.getEl('vmRecordCount'),
            plateInput: this.getEl('vmPlateInput'),
            vehicleType: this.getEl('vmVehicleType'),
            noteInput: this.getEl('vmNoteInput'),
            currentlyInsideList: this.getEl('vmCurrentlyInsideList'),
            recordsList: this.getEl('vmRecordsList'),
            dateFilter: this.getEl('vmDateFilter'),
            searchFilter: this.getEl('vmSearchFilter'),
            detailModal: this.getEl('vmDetailModal'),
            detailContent: this.getEl('vmDetailContent')
        };

        if (this.el.dateFilter) {
            this.el.dateFilter.value = new Date().toISOString().split('T')[0];
        }
    };

    // ===== 绑定事件 =====
    window.VehicleMonitorModule.bindEvents = function() {
        var self = this;

        if (this.el.plateInput) {
            this.el.plateInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    var plate = this.value.trim().toUpperCase();
                    if (plate) {
                        var existing = self.activeVehicles.find(function(v) {
                            return v.plate === plate && !v.exit_time;
                        });
                        if (existing) {
                            self.quickExit(plate);
                        } else {
                            self.quickEntry(plate);
                        }
                    }
                }
            });
        }

        if (this.el.searchFilter) {
            this.el.searchFilter.addEventListener('input', function() {
                self.filterRecords();
            });
        }

        if (this.el.dateFilter) {
            this.el.dateFilter.addEventListener('change', function() {
                self.filterRecords();
            });
        }
    };

    // ===== 加载数据 =====
    window.VehicleMonitorModule.loadData = function() {
        if (!checkPermission()) return;
        this.loadRecords();
        this.loadActiveVehicles();
        this.updateStats();
        this.startAutoUpdate();
    };

    // ===== 销毁 =====
    window.VehicleMonitorModule.destroy = function() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
            this.autoUpdateInterval = null;
        }
        this.initialized = false;
    };

    // ===== 加载记录 =====
    window.VehicleMonitorModule.loadRecords = function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];

        // 尝试从数据库加载
        if (window.AppApi && AppApi.query) {
            AppApi.query('vehicle_records', {
                filter: { date: today },
                order: { by: 'entry_time', ascending: false },
                limit: 200
            }).then(function(data) {
                self.records = data || [];
                self.renderRecords(data || []);
                if (self.el.recordCount) {
                    self.el.recordCount.textContent = (data || []).length;
                }
                self.updateStats();
            }).catch(function() {
                self.loadLocalRecords();
            });
        } else {
            self.loadLocalRecords();
        }
    };

    // ===== 加载当前在场车辆 =====
    window.VehicleMonitorModule.loadActiveVehicles = function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];

        if (window.AppApi && AppApi.query) {
            AppApi.query('vehicle_records', {
                filter: { date: today, exit_time: null },
                order: { by: 'entry_time', ascending: false }
            }).then(function(data) {
                self.activeVehicles = data || [];
                self.renderActiveVehicles(data || []);
            }).catch(function() {
                self.loadLocalActiveVehicles();
            });
        } else {
            self.loadLocalActiveVehicles();
        }
    };

    // ===== 本地存储（备用方案）=====
    window.VehicleMonitorModule.loadLocalRecords = function() {
        var today = new Date().toISOString().split('T')[0];
        var all = JSON.parse(localStorage.getItem('vehicle_records') || '[]');
        this.records = all.filter(function(r) { return r.date === today; });
        this.renderRecords(this.records);
        if (this.el.recordCount) {
            this.el.recordCount.textContent = this.records.length;
        }
        this.updateStats();
    };

    window.VehicleMonitorModule.loadLocalActiveVehicles = function() {
        var today = new Date().toISOString().split('T')[0];
        var all = JSON.parse(localStorage.getItem('vehicle_records') || '[]');
        this.activeVehicles = all.filter(function(r) {
            return r.date === today && !r.exit_time;
        });
        this.renderActiveVehicles(this.activeVehicles);
    };

    // ===== 保存到本地 =====
    window.VehicleMonitorModule.saveToLocal = function() {
        var all = JSON.parse(localStorage.getItem('vehicle_records') || '[]');
        this.records.forEach(function(r) {
            var existing = all.findIndex(function(a) { return a.id === r.id; });
            if (existing >= 0) {
                all[existing] = r;
            } else {
                all.push(r);
            }
        });
        localStorage.setItem('vehicle_records', JSON.stringify(all));
    };

    // ===== 渲染当前在场车辆 =====
    window.VehicleMonitorModule.renderActiveVehicles = function(vehicles) {
        var list = this.el.currentlyInsideList;
        if (!list) return;

        if (!vehicles || vehicles.length === 0) {
            list.innerHTML = '<tr><td colspan="7" class="text-center text-gray-400 py-4">暂无车辆在场</td></tr>';
            if (this.el.currentlyInside) {
                this.el.currentlyInside.textContent = '0';
            }
            return;
        }

        var html = '';
        var self = this;
        vehicles.forEach(function(v, index) {
            var entryTime = new Date(v.entry_time);
            var now = new Date();
            var duration = Math.floor((now - entryTime) / 1000 / 60);

            var typeLabels = {
                sedan: '🚗 轿车',
                suv: '🚙 SUV',
                truck: '🚛 货车',
                bus: '🚌 客车',
                motorcycle: '🏍️ 摩托车'
            };

            html += '<tr class="border-b hover:bg-gray-50">';
            html += '<td class="p-2">' + (index + 1) + '</td>';
            html += '<td class="p-2 font-medium">' + (v.plate || 'N/A') + '</td>';
            html += '<td class="p-2">' + (typeLabels[v.vehicle_type] || '🚗 轿车') + '</td>';
            html += '<td class="p-2 text-sm">' + entryTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + '</td>';
            html += '<td class="p-2 font-bold text-amber-600">' + self.formatDuration(duration) + '</td>';
            html += '<td class="p-2 text-sm text-gray-400">' + (v.note || '') + '</td>';
            html += '<td class="p-2">';
            html += '<button onclick="VehicleMonitorModule.quickExit(\'' + v.plate + '\')" class="text-red-500 hover:text-red-700 text-xs">离开</button>';
            html += ' | ';
            html += '<button onclick="VehicleMonitorModule.showDetail(\'' + v.id + '\')" class="text-blue-500 hover:text-blue-700 text-xs">详情</button>';
            html += '</td>';
            html += '</tr>';
        });

        list.innerHTML = html;

        if (this.el.currentlyInside) {
            this.el.currentlyInside.textContent = vehicles.length;
        }
    };

    // ===== 渲染今日记录 =====
    window.VehicleMonitorModule.renderRecords = function(records) {
        var list = this.el.recordsList;
        if (!list) return;

        if (!records || records.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-4">暂无记录</td></tr>';
            return;
        }

        var directionLabels = {
            in: '📥 进入',
            out: '📤 离开'
        };
        var directionColors = {
            in: 'text-green-600',
            out: 'text-red-600'
        };
        var typeLabels = {
            sedan: '🚗 轿车',
            suv: '🚙 SUV',
            truck: '🚛 货车',
            bus: '🚌 客车',
            motorcycle: '🏍️ 摩托车'
        };

        var html = '';
        records.slice(0, 50).forEach(function(r) {
            var time = r.entry_time ? new Date(r.entry_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-';
            html += '<tr class="border-b hover:bg-gray-50">';
            html += '<td class="p-2 text-sm">' + time + '</td>';
            html += '<td class="p-2 font-medium">' + (r.plate || 'N/A') + '</td>';
            html += '<td class="p-2">' + (typeLabels[r.vehicle_type] || '🚗 轿车') + '</td>';
            html += '<td class="p-2 ' + (directionColors[r.direction] || '') + '">' + (directionLabels[r.direction] || r.direction) + '</td>';
            html += '<td class="p-2">' + (r.direction === 'out' ? this.formatDuration(r.duration_minutes) : '-') + '</td>';
            html += '<td class="p-2 text-sm text-gray-400">' + (r.note || '') + '</td>';
            html += '</tr>';
        }.bind(this));

        list.innerHTML = html;
    };

    // ===== 更新统计 =====
    window.VehicleMonitorModule.updateStats = function() {
        var records = this.records || [];
        var totalIn = records.filter(function(r) { return r.direction === 'in'; }).length;
        var totalOut = records.filter(function(r) { return r.direction === 'out'; }).length;
        var total = totalIn + totalOut;

        var completed = records.filter(function(r) {
            return r.direction === 'out' && r.duration_minutes;
        });
        var avgDuration = 0;
        if (completed.length > 0) {
            var sum = completed.reduce(function(s, r) { return s + (r.duration_minutes || 0); }, 0);
            avgDuration = Math.round(sum / completed.length);
        }

        var currentlyInside = totalIn - totalOut;
        var inRate = total > 0 ? Math.round(totalIn / total * 100) : 0;
        var outRate = total > 0 ? Math.round(totalOut / total * 100) : 0;

        if (this.el.todayTotal) this.el.todayTotal.textContent = total;
        if (this.el.todayIn) this.el.todayIn.textContent = totalIn;
        if (this.el.todayOut) this.el.todayOut.textContent = totalOut;
        if (this.el.currentlyInside) this.el.currentlyInside.textContent = currentlyInside;
        if (this.el.avgStayTime) this.el.avgStayTime.textContent = avgDuration;
        if (this.el.todayInRate) this.el.todayInRate.textContent = inRate + '%';
        if (this.el.todayOutRate) this.el.todayOutRate.textContent = outRate + '%';
    };

    // ===== 格式化停留时间 =====
    window.VehicleMonitorModule.formatDuration = function(minutes) {
        if (!minutes || minutes < 0) return '0分钟';
        if (minutes < 60) return minutes + '分钟';
        var hours = Math.floor(minutes / 60);
        var mins = minutes % 60;
        if (mins === 0) return hours + '小时';
        return hours + '小时' + mins + '分钟';
    };

    // ===== 记录车辆进入 =====
    window.VehicleMonitorModule.addEntry = function() {
        var plate = this.el.plateInput ? this.el.plateInput.value.trim().toUpperCase() : '';
        if (!plate) {
            this.toast('请输入车牌号', 'error');
            return;
        }

        var existing = this.activeVehicles.find(function(v) {
            return v.plate === plate && !v.exit_time;
        });
        if (existing) {
            this.toast('⚠️ 车辆 ' + plate + ' 已在场内', 'warning');
            return;
        }

        this.quickEntry(plate);
    };

    window.VehicleMonitorModule.quickEntry = function(plate) {
        var self = this;
        var vehicleType = this.el.vehicleType ? this.el.vehicleType.value : 'sedan';
        var note = this.el.noteInput ? this.el.noteInput.value.trim() : '';
        var now = new Date();
        var today = now.toISOString().split('T')[0];
        var id = 'veh_' + Date.now();

        var record = {
            id: id,
            plate: plate || this.el.plateInput?.value.trim().toUpperCase() || 'UNKNOWN',
            vehicle_type: vehicleType,
            direction: 'in',
            date: today,
            entry_time: now.toISOString(),
            exit_time: null,
            duration_minutes: null,
            note: note,
            created_at: now.toISOString()
        };

        this.records.push(record);
        this.activeVehicles.push(record);
        this.saveToLocal();

        // 尝试保存到数据库
        if (window.AppApi && AppApi.insert) {
            AppApi.insert('vehicle_records', record).catch(function() {});
        }

        this.toast('📥 车辆 ' + (record.plate) + ' 已进入', 'success');

        if (this.el.plateInput) this.el.plateInput.value = '';
        if (this.el.noteInput) this.el.noteInput.value = '';
        if (this.el.vehicleType) this.el.vehicleType.value = 'sedan';

        this.refresh();
    };

    // ===== 记录车辆离开 =====
    window.VehicleMonitorModule.addExit = function() {
        var plate = this.el.plateInput ? this.el.plateInput.value.trim().toUpperCase() : '';
        if (!plate) {
            this.toast('请输入车牌号', 'error');
            return;
        }

        this.quickExit(plate);
    };

    window.VehicleMonitorModule.quickExit = function(plate) {
        var self = this;

        var index = this.activeVehicles.findIndex(function(v) {
            return v.plate === plate && !v.exit_time;
        });

        if (index < 0) {
            this.toast('⚠️ 车辆 ' + plate + ' 不在场内', 'warning');
            return;
        }

        var vehicle = this.activeVehicles[index];
        var now = new Date();
        var entryTime = new Date(vehicle.entry_time);
        var duration = Math.floor((now - entryTime) / 1000 / 60);

        vehicle.exit_time = now.toISOString();
        vehicle.duration_minutes = duration;

        this.activeVehicles.splice(index, 1);

        var recordIndex = this.records.findIndex(function(r) { return r.id === vehicle.id; });
        if (recordIndex >= 0) {
            this.records[recordIndex] = vehicle;
        }

        this.saveToLocal();

        // 尝试更新数据库
        if (window.AppApi && AppApi.update) {
            AppApi.update('vehicle_records', vehicle.id, {
                exit_time: vehicle.exit_time,
                duration_minutes: duration
            }).catch(function() {});
        }

        this.toast('📤 车辆 ' + plate + ' 已离开，停留 ' + this.formatDuration(duration), 'success');

        if (this.el.plateInput) this.el.plateInput.value = '';

        this.refresh();
    };

    // ===== 筛选记录 =====
    window.VehicleMonitorModule.filterRecords = function() {
        var date = this.el.dateFilter ? this.el.dateFilter.value : '';
        var search = this.el.searchFilter ? this.el.searchFilter.value.trim().toLowerCase() : '';

        var filtered = this.records;

        if (date) {
            filtered = filtered.filter(function(r) { return r.date === date; });
        }

        if (search) {
            filtered = filtered.filter(function(r) {
                return (r.plate || '').toLowerCase().includes(search);
            });
        }

        this.renderRecords(filtered);
    };

    // ===== 显示详情 =====
    window.VehicleMonitorModule.showDetail = function(recordId) {
        var record = this.records.find(function(r) { return r.id === recordId; });
        if (!record) {
            this.toast('记录不存在', 'error');
            return;
        }

        var modal = this.el.detailModal;
        var content = this.el.detailContent;
        if (!modal || !content) return;

        var typeLabels = {
            sedan: '🚗 轿车',
            suv: '🚙 SUV',
            truck: '🚛 货车',
            bus: '🚌 客车',
            motorcycle: '🏍️ 摩托车'
        };

        var directionLabels = {
            in: '📥 进入',
            out: '📤 离开'
        };

        var html = '';
        html += '<div class="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">';
        html += '<div><span class="text-gray-500">车牌</span><br><span class="font-bold">' + (record.plate || 'N/A') + '</span></div>';
        html += '<div><span class="text-gray-500">类型</span><br><span>' + (typeLabels[record.vehicle_type] || '🚗 轿车') + '</span></div>';
        html += '<div><span class="text-gray-500">方向</span><br><span class="' + (record.direction === 'in' ? 'text-green-600' : 'text-red-600') + '">' + (directionLabels[record.direction] || record.direction) + '</span></div>';
        html += '<div><span class="text-gray-500">日期</span><br><span>' + (record.date || '-') + '</span></div>';
        html += '<div><span class="text-gray-500">进入时间</span><br><span>' + (record.entry_time ? new Date(record.entry_time).toLocaleString('zh-CN') : '-') + '</span></div>';
        html += '<div><span class="text-gray-500">离开时间</span><br><span>' + (record.exit_time ? new Date(record.exit_time).toLocaleString('zh-CN') : '🟢 仍在场内') + '</span></div>';
        html += '<div class="col-span-2"><span class="text-gray-500">停留时长</span><br><span class="font-bold text-amber-600">' + (record.duration_minutes ? this.formatDuration(record.duration_minutes) : '计算中...') + '</span></div>';
        html += '<div class="col-span-2"><span class="text-gray-500">备注</span><br><span>' + (record.note || '无') + '</span></div>';
        html += '</div>';

        content.innerHTML = html;
        modal.classList.remove('hidden');
    };

    window.VehicleMonitorModule.closeDetail = function() {
        var modal = this.el.detailModal;
        if (modal) modal.classList.add('hidden');
    };

    // ===== 导出数据 =====
    window.VehicleMonitorModule.exportData = function() {
        var records = this.records || [];
        if (records.length === 0) {
            this.toast('暂无数据可导出', 'error');
            return;
        }

        var data = [['日期', '时间', '车牌', '类型', '方向', '停留时长(分钟)', '备注']];
        records.forEach(function(r) {
            var time = r.entry_time ? new Date(r.entry_time).toLocaleString('zh-CN') : '';
            var typeLabels = {
                sedan: '轿车',
                suv: 'SUV',
                truck: '货车',
                bus: '客车',
                motorcycle: '摩托车'
            };
            var directionLabels = {
                in: '进入',
                out: '离开'
            };
            data.push([
                r.date || '',
                time,
                r.plate || '',
                typeLabels[r.vehicle_type] || '轿车',
                directionLabels[r.direction] || r.direction,
                r.duration_minutes || '',
                r.note || ''
            ]);
        });

        try {
            var ws = XLSX.utils.aoa_to_sheet(data);
            var wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '车辆监控数据');
            var today = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, '车辆监控_' + today + '.xlsx');
            this.toast('✅ 数据已导出', 'success');
        } catch(e) {
            this.toast('❌ 导出失败: ' + e.message, 'error');
        }
    };

    // ===== 刷新 =====
    window.VehicleMonitorModule.refresh = function() {
        this.loadRecords();
        this.loadActiveVehicles();
        this.updateStats();
        this.toast('✅ 数据已刷新', 'success');
    };

    // ===== 自动更新 =====
    window.VehicleMonitorModule.startAutoUpdate = function() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
        }
        this.autoUpdateInterval = setInterval(function() {
            this.loadActiveVehicles();
            this.updateStats();
        }.bind(this), 30000);
    };

    console.log('[VehicleMonitor] 模块已注册');
})();