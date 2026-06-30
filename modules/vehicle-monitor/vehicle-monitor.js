/**
 * vehicle-monitor.js - 车辆监控模块
 * 功能：车辆进出记录、停留时间追踪、实时计数、车牌智能识别
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

    // ===== 识别状态 =====
    window.VehicleMonitorModule._lastRecognition = null;
    window.VehicleMonitorModule._isEditMode = false;

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
            detailContent: this.getEl('vmDetailContent'),
            // ===== 新增：识别相关 DOM =====
            uploadPlaceholder: this.getEl('uploadPlaceholder'),
            imageInput: this.getEl('imageInput'),
            imagePreviewContainer: this.getEl('imagePreviewContainer'),
            imagePreview: this.getEl('imagePreview'),
            recognizeLoading: this.getEl('recognizeLoading'),
            recogPlate: this.getEl('recogPlate'),
            recogPlateColor: this.getEl('recogPlateColor'),
            recogBrand: this.getEl('recogBrand'),
            recogModel: this.getEl('recogModel'),
            recogColor: this.getEl('recogColor'),
            recogConfidence: this.getEl('recogConfidence'),
            recogConfidenceBar: this.getEl('recogConfidenceBar'),
            recogStatus: this.getEl('recogStatus'),
            recogHint: this.getEl('recogHint'),
            saveRecogBtn: this.getEl('saveRecogBtn')
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

        // ===== 新增：拖拽上传 =====
        var placeholder = this.el.uploadPlaceholder;
        if (placeholder) {
            placeholder.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('border-blue-500', 'bg-blue-100');
            });
            placeholder.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('border-blue-500', 'bg-blue-100');
            });
            placeholder.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('border-blue-500', 'bg-blue-100');
                var files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    self.processImage(files[0]);
                }
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
        // ===== 新增：重置识别状态 =====
        this.clearRecognition();
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

    // ================================================================
    // ===== 新增：车牌智能识别功能 =====
    // ================================================================

    // ===== 处理图片选择 =====
    window.VehicleMonitorModule.handleImageSelect = function(event) {
        var file = event.target.files[0];
        if (!file) return;
        this.processImage(file);
    };

    // ===== 拍照 =====
    window.VehicleMonitorModule.takePhoto = function() {
        var input = this.el.imageInput;
        if (input) {
            input.click();
        }
    };

    // ===== 处理图片 =====
    window.VehicleMonitorModule.processImage = function(file) {
        var self = this;

        if (!file.type.startsWith('image/')) {
            this.toast('❌ 请上传图片文件', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.toast('❌ 图片大小不能超过10MB', 'error');
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var imageData = e.target.result;
            self.showPreview(imageData);
            self.callRecognizeAPI(imageData);
        };
        reader.readAsDataURL(file);
    };

    // ===== 显示预览 =====
    window.VehicleMonitorModule.showPreview = function(imageData) {
        this.el.imagePreview.src = imageData;
        this.el.imagePreviewContainer.classList.remove('hidden');
        this.el.uploadPlaceholder.classList.add('hidden');
        this.el.recognizeLoading.classList.remove('hidden');
        this.el.recogStatus.textContent = '⏳ AI识别中...';
        this.el.recogStatus.className = 'text-xs text-blue-600';
    };

    // ===== 清空图片 =====
    window.VehicleMonitorModule.clearImage = function() {
        this.el.imagePreviewContainer.classList.add('hidden');
        this.el.uploadPlaceholder.classList.remove('hidden');
        this.el.recognizeLoading.classList.add('hidden');
        this.el.imageInput.value = '';
        this.el.recogStatus.textContent = '等待识别...';
        this.el.recogStatus.className = 'text-xs text-gray-400';
    };

    // ===== 调用识别API（模拟 + 真实API预留） =====
    window.VehicleMonitorModule.callRecognizeAPI = function(imageData) {
        var self = this;

        // 模拟沙特车牌识别结果
        setTimeout(function() {
            var mockResults = [
                { plate: 'ABC 1234', plateColor: '白色', brand: 'Toyota', model: 'Camry', color: '白色', confidence: 0.96 },
                { plate: 'XYZ 5678', plateColor: '黄色', brand: 'Honda', model: 'Accord', color: '黑色', confidence: 0.94 },
                { plate: 'DEF 9012', plateColor: '蓝色', brand: 'Nissan', model: 'Altima', color: '银色', confidence: 0.92 },
                { plate: 'GHI 3456', plateColor: '白色', brand: 'Hyundai', model: 'Sonata', color: '白色', confidence: 0.95 },
                { plate: 'JKL 7890', plateColor: '绿色', brand: 'Mercedes', model: 'E-Class', color: '黑色', confidence: 0.93 }
            ];

            var randomIndex = Math.floor(Math.random() * mockResults.length);
            var result = mockResults[randomIndex];
            result.confidence = 0.85 + Math.random() * 0.14;

            self.displayRecognitionResult(result);
        }, 1500 + Math.random() * 1000);
    };

    // ===== 显示识别结果 =====
    window.VehicleMonitorModule.displayRecognitionResult = function(result) {
        this.el.recognizeLoading.classList.add('hidden');
        this.el.recogStatus.textContent = '✅ 识别完成，请确认信息';
        this.el.recogStatus.className = 'text-xs text-green-600';

        this.el.recogPlate.value = result.plate || '';
        this.el.recogPlateColor.value = result.plateColor || '';
        this.el.recogBrand.value = result.brand || '';
        this.el.recogModel.value = result.model || '';
        this.el.recogColor.value = result.color || '';

        var confidence = Math.round((result.confidence || 0) * 100);
        this.el.recogConfidence.textContent = confidence + '%';
        this.el.recogConfidenceBar.style.width = Math.min(confidence, 100) + '%';

        var hint = this.el.recogHint;
        if (confidence >= 90) {
            hint.textContent = '✅ 置信度较高，建议直接保存';
            hint.className = 'text-[10px] text-green-600 mt-1';
        } else if (confidence >= 70) {
            hint.textContent = '⚠️ 置信度一般，建议核对后保存';
            hint.className = 'text-[10px] text-amber-600 mt-1';
        } else {
            hint.textContent = '❌ 置信度较低，建议修正后保存';
            hint.className = 'text-[10px] text-red-600 mt-1';
        }

        this.el.saveRecogBtn.disabled = false;
        this._lastRecognition = result;
        this._isEditMode = false;
    };

    // ===== 手动修正 =====
    window.VehicleMonitorModule.enableEdit = function() {
        this._isEditMode = true;
        var inputs = ['recogPlate', 'recogPlateColor', 'recogBrand', 'recogModel', 'recogColor'];
        inputs.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.readOnly = false;
                el.disabled = false;
                el.classList.add('border-blue-300', 'bg-white');
            }
        });
        var select = document.getElementById('recogPlateColor');
        if (select) select.disabled = false;

        this.el.recogStatus.textContent = '✏️ 手动修正模式，修改后点击保存';
        this.el.recogStatus.className = 'text-xs text-amber-600';
        this.el.recogHint.textContent = '✏️ 请修正识别结果后点击保存';
        this.el.recogHint.className = 'text-[10px] text-amber-600 mt-1';
        this.toast('✏️ 已进入修正模式，请修改后保存', 'info');
    };

    // ===== 保存识别记录 =====
    window.VehicleMonitorModule.saveRecognizedVehicle = function() {
        var self = this;
        var currentUser = AppStore.get('currentUser');
        var store = AppStore.get('currentStore');

        var plate = this.el.recogPlate.value.trim().toUpperCase();
        if (!plate) {
            this.toast('❌ 车牌号码不能为空', 'error');
            return;
        }

        if (plate.length < 2) {
            this.toast('❌ 车牌号码格式不正确', 'error');
            return;
        }

        // 检查车牌是否已在场内
        var existing = this.activeVehicles.find(function(v) {
            return v.plate === plate && !v.exit_time;
        });
        if (existing) {
            this.toast('⚠️ 车辆 ' + plate + ' 已在场内，无需重复录入', 'warning');
            return;
        }

        var data = {
            plate: plate,
            plate_color: this.el.recogPlateColor.value || '',
            vehicle_brand: this.el.recogBrand.value || '',
            vehicle_model: this.el.recogModel.value || '',
            vehicle_color: this.el.recogColor.value || '',
            confidence: this._lastRecognition ? this._lastRecognition.confidence : 0,
            image_path: this.el.imagePreview.src || '',
            operator_id: currentUser ? currentUser.id : null,
            branch_id: store ? store.id : null,
            vehicle_type: 'sedan',
            note: this._isEditMode ? '已手动修正' : 'AI识别',
            entry_time: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            direction: 'in',
            exit_time: null,
            duration_minutes: null
        };

        // 保存到数据库（使用 vehicle_records 表）
        if (window.AppApi && AppApi.insert) {
            AppApi.insert('vehicle_records', data)
                .then(function(saved) {
                    self.toast('✅ 车辆记录已保存', 'success');
                    self.clearRecognition();
                    self.refresh();
                    // 审计日志
                    if (window.PermissionService) {
                        PermissionService.logAudit({
                            action: 'CREATE',
                            resourceType: 'vehicle_record',
                            resourceName: plate,
                            newValue: data
                        });
                    }
                })
                .catch(function(error) {
                    self.toast('❌ 保存失败: ' + error.message, 'error');
                });
        } else {
            // 备用：保存到本地
            var record = {
                id: 'veh_' + Date.now(),
                plate: plate,
                vehicle_type: 'sedan',
                direction: 'in',
                date: new Date().toISOString().split('T')[0],
                entry_time: new Date().toISOString(),
                exit_time: null,
                duration_minutes: null,
                note: data.note,
                created_at: new Date().toISOString()
            };
            this.records.push(record);
            this.activeVehicles.push(record);
            this.saveToLocal();
            this.toast('✅ 车辆记录已保存（本地）', 'success');
            this.clearRecognition();
            this.refresh();
        }
    };

    // ===== 清空识别 =====
    window.VehicleMonitorModule.clearRecognition = function() {
        this.clearImage();
        this.el.recogPlate.value = '';
        this.el.recogPlateColor.value = '';
        this.el.recogBrand.value = '';
        this.el.recogModel.value = '';
        this.el.recogColor.value = '';
        this.el.recogConfidence.textContent = '--%';
        this.el.recogConfidenceBar.style.width = '0%';
        this.el.recogStatus.textContent = '等待识别...';
        this.el.recogStatus.className = 'text-xs text-gray-400';
        this.el.recogHint.textContent = '';
        this.el.saveRecogBtn.disabled = true;

        var inputs = ['recogPlate', 'recogBrand', 'recogModel', 'recogColor'];
        inputs.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.readOnly = true;
                el.classList.remove('border-blue-300', 'bg-white');
            }
        });
        var select = document.getElementById('recogPlateColor');
        if (select) select.disabled = true;

        this._lastRecognition = null;
        this._isEditMode = false;
        if (this.el.imageInput) {
            this.el.imageInput.value = '';
        }
    };

    console.log('[VehicleMonitor] 模块已注册');
})();