/**
 * loader.js - 模块加载器 V5.2
 */
(function() {
    'use strict';

    window.ModuleLoader = {
        _loaded: {},
        _active: null,
        _loading: false,
        _pending: null,

        // ===== 修改：_modules 添加 vehicle-monitor =====
        _modules: {
            dashboard: { obj: 'DashboardModule', label: '仪表板' },
            cashier: { obj: 'CashierModule', label: 'POS收银' },
            orders: { obj: 'OrdersModule', label: '订单管理' },
            inventory: { obj: 'InventoryModule', label: '库存管理' },
            customers: { obj: 'CustomersModule', label: '客户管理' },
            attendance: { obj: 'AttendanceModule', label: '考勤管理' },
            reports: { obj: 'ReportsModule', label: '财务管理' },
            employees: { obj: 'EmployeesModule', label: '员工审核' },
            audit: { obj: 'AuditModule', label: '审计日志' },
            // ===== 新增：车辆监控 =====
            'vehicle-monitor': { obj: 'VehicleMonitorModule', label: '车辆监控' },
            settings: { obj: 'SettingsModule', label: '系统设置' }
        },

        load: async function(moduleName) {
            if (this._loading) {
                this._pending = moduleName;
                console.log('[Loader] 正在加载中，已加入队列: ' + moduleName);
                return;
            }

            var container = document.getElementById('moduleContent');
            if (!container) {
                console.error('[Loader] 容器不存在');
                return;
            }

            var user = AppStore.get('currentUser');
            if (user) {
                var perms = AppConfig.permissions[user.role] || [];
                if (!perms.includes(moduleName)) {
                    if (window.AppUtils && AppUtils.toast) {
                        AppUtils.toast('您没有权限访问此页面', 'warning');
                    }
                    return;
                }
            }

            if (this._active && this._loaded[this._active]) {
                var old = this._loaded[this._active];
                if (typeof old.destroy === 'function') {
                    old.destroy();
                }
                delete this._loaded[this._active];
            }

            this._loading = true;
            container.innerHTML = '<div class="text-center text-gray-400 py-20">⏳ 加载中...</div>';

            try {
                var module = this._modules[moduleName];
                if (!module) throw new Error('模块未配置: ' + moduleName);

                var htmlPath = 'modules/' + moduleName + '/' + moduleName + '.html';
                var htmlContent = await this._fetchText(htmlPath, 'HTML');
                container.innerHTML = htmlContent;

                await this._waitForDOM(moduleName);

                var jsPath = 'modules/' + moduleName + '/' + moduleName + '.js';
                var oldScript = document.querySelector('script[data-module="' + moduleName + '"]');
                if (oldScript) oldScript.remove();

                var self = this;
                await new Promise(function(resolve, reject) {
                    var script = document.createElement('script');
                    script.setAttribute('data-module', moduleName);
                    script.type = 'text/javascript';
                    script.src = jsPath + '?v=' + Date.now();

                    script.onload = function() {
                        var attempts = 0;
                        var maxAttempts = 50;
                        var check = function() {
                            attempts++;
                            var moduleObj = window[module.obj];
                            if (moduleObj && typeof moduleObj.init === 'function') {
                                self._loaded[moduleName] = moduleObj;
                                self._active = moduleName;
                                var result = moduleObj.init();
                                if (result && typeof result.then === 'function') {
                                    result.then(resolve).catch(reject);
                                } else {
                                    resolve();
                                }
                            } else if (attempts < maxAttempts) {
                                setTimeout(check, 100);
                            } else {
                                reject(new Error('模块 ' + module.obj + ' 未注册，请检查 JS 文件是否加载'));
                            }
                        };
                        check();
                    };

                    script.onerror = function() {
                        reject(new Error('JS加载失败: ' + jsPath));
                    };
                    document.head.appendChild(script);
                });

                console.log('[Loader] 加载完成: ' + moduleName);

            } catch (error) {
                console.error('[Loader] 加载失败:', error);
                container.innerHTML = `
                    <div class="text-center py-20">
                        <div class="text-red-500 text-xl">❌ 模块加载失败</div>
                        <div class="text-gray-400 text-sm mt-2">${error.message}</div>
                        <button onclick="ModuleLoader.load('${moduleName}')" class="btn-primary mt-4 px-6 py-2 rounded-lg">重新加载</button>
                    </div>
                `;
            } finally {
                this._loading = false;
                if (this._pending && this._pending !== moduleName) {
                    var nextModule = this._pending;
                    this._pending = null;
                    this.load(nextModule);
                } else {
                    this._pending = null;
                }
            }
        },

        _fetchText: async function(path, type) {
            if (window.location.protocol === 'file:') {
                throw new Error('当前是 file:// 直接打开，请用本地服务器打开，例如 http://127.0.0.1:4173/');
            }

            var url = new URL(path, window.location.href);
            try {
                var res = await fetch(url.href, { cache: 'no-store' });
                if (!res.ok) throw new Error(type + '加载失败: HTTP ' + res.status + ' - ' + path);
                var text = await res.text();
                if (!text || !text.trim()) {
                    throw new Error(type + '文件为空: ' + path);
                }
                return text;
            } catch (error) {
                if (error.message && error.message.indexOf(type + '加载失败') === 0) {
                    throw error;
                }
                throw new Error(type + '加载失败: ' + path + '。错误: ' + error.message);
            }
        },

        _waitForDOM: function(moduleName) {
            return new Promise(function(resolve) {
                var attempts = 0;
                var maxAttempts = 50;
                var check = function() {
                    attempts++;
                    var el = document.getElementById(moduleName + 'Container');
                    if (!el) {
                        var container = document.getElementById('moduleContent');
                        if (container) {
                            el = container.querySelector('#' + moduleName + 'Container') ||
                                 container.querySelector('div[id^="' + moduleName + '"]');
                        }
                    }
                    if (el || attempts > maxAttempts) {
                        setTimeout(resolve, 50);
                    } else {
                        setTimeout(check, 50);
                    }
                };
                setTimeout(check, 30);
            });
        },

        getActive: function() {
            return this._active;
        },

        getModule: function(moduleName) {
            return this._loaded[moduleName] || null;
        },

        preload: function(moduleName) {
            try {
                var module = this._modules[moduleName];
                if (!module) return Promise.resolve();
                var jsPath = 'modules/' + moduleName + '/' + moduleName + '.js';
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = jsPath + '?v=' + Date.now();
                document.head.appendChild(script);
                return new Promise(function(resolve) {
                    script.onload = function() {
                        var moduleObj = window[module.obj];
                        if (moduleObj && typeof moduleObj.init === 'function') {
                            window.ModuleLoader._loaded[moduleName] = moduleObj;
                        }
                        resolve();
                    };
                    script.onerror = function() { resolve(); };
                    setTimeout(resolve, 5000);
                });
            } catch (e) {
                console.warn('[Loader] 预加载失败:', e);
                return Promise.resolve();
            }
        }
    };

    console.log('[Loader] V5.2 加载完成');
})();