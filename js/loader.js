/**
 * loader.js - 模块加载器
 */
(function() {
    'use strict';

    window.ModuleLoader = {
        _loaded: {},
        _active: null,

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
            settings: { obj: 'SettingsModule', label: '系统设置' }
        },

        async load(moduleName) {
            const container = document.getElementById('moduleContent');
            if (!container) {
                console.error('[Loader] 容器不存在');
                return;
            }

            // 权限检查
            const user = AppStore.get('currentUser');
            if (user) {
                const perms = AppConfig.permissions[user.role] || [];
                if (!perms.includes(moduleName)) {
                    AppUtils.toast('您没有权限访问此页面', 'warning');
                    return;
                }
            }

            // 销毁旧模块
            if (this._active && this._loaded[this._active]) {
                const old = this._loaded[this._active];
                if (typeof old.destroy === 'function') {
                    old.destroy();
                }
                delete this._loaded[this._active];
            }

            container.innerHTML = '<div class="text-center text-gray-400 py-20">⏳ 加载中...</div>';

            try {
                const module = this._modules[moduleName];
                if (!module) throw new Error('模块未配置: ' + moduleName);

                // 加载 HTML
                const htmlPath = 'modules/' + moduleName + '/' + moduleName + '.html';
                const htmlRes = await fetch(htmlPath);
                if (!htmlRes.ok) throw new Error('HTML加载失败: ' + htmlRes.status);
                container.innerHTML = await htmlRes.text();

                // 加载 JS
                const jsPath = 'modules/' + moduleName + '/' + moduleName + '.js';
                const oldScript = document.querySelector('script[data-module="' + moduleName + '"]');
                if (oldScript) oldScript.remove();

                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.setAttribute('data-module', moduleName);
                    script.type = 'text/javascript';
                    script.src = jsPath + '?v=' + Date.now();

                    script.onload = () => {
                        let attempts = 0;
                        const maxAttempts = 50;
                        const check = () => {
                            attempts++;
                            const moduleObj = window[module.obj];
                            if (moduleObj && typeof moduleObj.init === 'function') {
                                this._loaded[moduleName] = moduleObj;
                                this._active = moduleName;
                                moduleObj.init();
                                resolve();
                            } else if (attempts < maxAttempts) {
                                setTimeout(check, 100);
                            } else {
                                reject(new Error('模块 ' + module.obj + ' 未注册'));
                            }
                        };
                        check();
                    };

                    script.onerror = () => reject(new Error('JS加载失败: ' + jsPath));
                    document.head.appendChild(script);
                });

            } catch (error) {
                console.error('[Loader] 加载失败:', error);
                container.innerHTML = `
                    <div class="text-center py-20">
                        <div class="text-red-500 text-xl">❌ 模块加载失败</div>
                        <div class="text-gray-400 text-sm mt-2">${error.message}</div>
                        <button onclick="ModuleLoader.load('${moduleName}')" class="btn-primary mt-4 px-6 py-2 rounded-lg">重新加载</button>
                    </div>
                `;
            }
        },

        getActive() {
            return this._active;
        },

        getModule(moduleName) {
            return this._loaded[moduleName] || null;
        }
    };

    console.log('[Loader] 加载完成');
})();