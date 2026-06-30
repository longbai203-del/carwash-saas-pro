/**
 * permission.js - 权限中心模块
 * 角色管理、菜单管理、权限分配、用户授权、审计日志
 * 使用 SupabaseService 直接查询，解决表名白名单限制
 */
(function() {
    'use strict';

    window.PermissionModule = Object.create(ModuleBase);
    window.PermissionModule.moduleName = 'permission';

    // ============================================================
    // 缓存 DOM
    // ============================================================
    window.PermissionModule.cacheDom = function() {
        this.el = {
            // 角色
            rolesList: this.getEl('rolesList'),
            roleSearch: this.getEl('roleSearch'),
            roleStatusFilter: this.getEl('roleStatusFilter'),
            // 菜单
            menuTree: this.getEl('menuTree'),
            // 权限
            permRoleSelect: this.getEl('permRoleSelect'),
            permissionTree: this.getEl('permissionTree'),
            // 用户权限
            userPermUserSelect: this.getEl('userPermUserSelect'),
            userPermissionList: this.getEl('userPermissionList'),
            // 审计
            auditList: this.getEl('auditList'),
            auditStartDate: this.getEl('auditStartDate'),
            auditEndDate: this.getEl('auditEndDate'),
            auditSearch: this.getEl('auditSearch'),
            // 模态框
            addRoleModal: this.getEl('addRoleModal'),
            addMenuModal: this.getEl('addMenuModal'),
            addUserPermModal: this.getEl('addUserPermModal')
        };
        this.currentTab = 'roles';
        this.allPermissions = [];
        this.allRoles = [];
        this.allMenus = [];
        this.allUsers = [];
        this.currentRoleId = null;
        this.currentUserId = null;
    };

    // ============================================================
    // 获取 Supabase 客户端
    // ============================================================
    window.PermissionModule._getClient = function() {
        var client = window.SupabaseService ? window.SupabaseService.getClient() : null;
        if (!client) {
            console.error('[Permission] Supabase 客户端未初始化');
            return null;
        }
        return client;
    };

    // ============================================================
    // 绑定事件
    // ============================================================
    window.PermissionModule.bindEvents = function() {
        var self = this;

        if (this.el.roleSearch) {
            this.el.roleSearch.addEventListener('input', function() {
                self.filterRoles();
            });
        }
        if (this.el.roleStatusFilter) {
            this.el.roleStatusFilter.addEventListener('change', function() {
                self.filterRoles();
            });
        }
        if (this.el.auditSearch) {
            this.el.auditSearch.addEventListener('input', function() {
                self.loadAuditLogs();
            });
        }
    };

    // ============================================================
    // 加载数据
    // ============================================================
    window.PermissionModule.loadData = function() {
        this.loadRoles();
        this.loadMenus();
        this.loadAllPermissions();
        this.loadUsers();
        this.loadAuditLogs();

        if (this.el.auditStartDate) {
            var d = new Date();
            d.setDate(d.getDate() - 7);
            this.el.auditStartDate.value = d.toISOString().split('T')[0];
        }
        if (this.el.auditEndDate) {
            this.el.auditEndDate.value = new Date().toISOString().split('T')[0];
        }
    };

    // ============================================================
    // 切换标签页
    // ============================================================
    window.PermissionModule.switchTab = function(tab) {
        this.currentTab = tab;

        document.querySelectorAll('.tab-btn').forEach(function(btn) {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });

        document.querySelectorAll('.panel-content').forEach(function(panel) {
            panel.classList.add('hidden');
        });

        var target = document.getElementById('panel-' + tab);
        if (target) {
            target.classList.remove('hidden');
        }

        if (tab === 'roles') this.loadRoles();
        if (tab === 'menus') this.loadMenus();
        if (tab === 'permissions') this.loadRolePermissions();
        if (tab === 'user-permissions') this.loadUserPermissions();
        if (tab === 'audit') this.loadAuditLogs();
    };

    // ============================================================
    // 角色管理
    // ============================================================
    window.PermissionModule.loadRoles = function() {
        var self = this;
        var client = this._getClient();
        if (!client) {
            self.el.rolesList.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-8">请刷新页面重试</td></tr>';
            return;
        }

        client.from('sys_role')
            .select('*')
            .order('sort_order', { ascending: true })
            .then(function(result) {
                if (result.error) throw result.error;
                self.allRoles = result.data || [];
                self.renderRoles(result.data || []);
                self.loadRoleSelects();
            })
            .catch(function(error) {
                console.error('[Permission] 加载角色失败:', error);
                self.el.rolesList.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-8">加载失败，请刷新重试</td></tr>';
            });
    };

    window.PermissionModule.renderRoles = function(roles) {
        var list = this.el.rolesList;
        if (!list) return;

        var search = this.el.roleSearch ? this.el.roleSearch.value.trim().toLowerCase() : '';
        var statusFilter = this.el.roleStatusFilter ? this.el.roleStatusFilter.value : 'all';

        var filtered = roles.filter(function(r) {
            var matchSearch = !search || r.role_name.toLowerCase().includes(search) || r.role_code.toLowerCase().includes(search);
            var matchStatus = statusFilter === 'all' || r.status === statusFilter;
            return matchSearch && matchStatus;
        });

        if (filtered.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-8">暂无角色数据</td></tr>';
            return;
        }

        var html = '';
        filtered.forEach(function(r) {
            var statusLabel = r.status === 'active' ? '✅ 启用' : '❌ 禁用';
            var statusColor = r.status === 'active' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
            var isSystem = r.is_system ? '🛡️ 系统' : '👤 自定义';
            var isDefault = r.is_default ? '⭐ 默认' : '';

            html += '<tr class="border-b hover:bg-gray-50">';
            html += '<td class="p-3 font-medium">' + r.role_name + ' ' + isDefault + '</td>';
            html += '<td class="p-3 text-sm text-gray-500">' + r.role_code + '</td>';
            html += '<td class="p-3 text-sm">' + isSystem + '</td>';
            html += '<td class="p-3"><span class="px-2 py-1 rounded-full text-xs ' + statusColor + '">' + statusLabel + '</span></td>';
            html += '<td class="p-3 text-sm text-gray-400">' + (r.created_at ? new Date(r.created_at).toLocaleDateString() : '-') + '</td>';
            html += '<td class="p-3">';
            if (!r.is_system) {
                html += '<button onclick="PermissionModule.editRole(\'' + r.id + '\')" class="text-blue-500 hover:text-blue-700 text-xs mr-2">✏️</button>';
                html += '<button onclick="PermissionModule.deleteRole(\'' + r.id + '\')" class="text-red-500 hover:text-red-700 text-xs">🗑️</button>';
            } else {
                html += '<span class="text-xs text-gray-400">系统保护</span>';
            }
            html += '</td>';
            html += '</tr>';
        });

        list.innerHTML = html;
    };

    window.PermissionModule.filterRoles = function() {
        this.renderRoles(this.allRoles);
    };

    window.PermissionModule.showAddRole = function() {
        var modal = this.el.addRoleModal;
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('roleNameInput').value = '';
            document.getElementById('roleCodeInput').value = '';
            document.getElementById('roleRemarkInput').value = '';
            document.getElementById('roleStatusInput').value = 'active';
        }
    };

    window.PermissionModule.saveRole = function() {
        var self = this;
        var name = document.getElementById('roleNameInput').value.trim();
        var code = document.getElementById('roleCodeInput').value.trim();
        var status = document.getElementById('roleStatusInput').value;
        var remark = document.getElementById('roleRemarkInput').value.trim();

        if (!name || !code) {
            this.toast('请填写角色名称和代码', 'error');
            return;
        }

        var client = this._getClient();
        if (!client) {
            this.toast('数据库连接失败', 'error');
            return;
        }

        var user = AppStore.get('currentUser');

        var data = {
            role_name: name,
            role_code: code,
            status: status,
            remark: remark,
            is_system: false,
            is_default: false,
            sort_order: this.allRoles.length + 1,
            created_by: user ? user.id : null,
            created_at: new Date().toISOString()
        };

        client.from('sys_role')
            .insert(data)
            .select()
            .then(function(result) {
                if (result.error) throw result.error;
                self.toast('✅ 角色已添加', 'success');
                self.closeModal('addRoleModal');
                self.loadRoles();
                self.loadRoleSelects();
                if (window.PermissionService) {
                    PermissionService.logOperation({
                        operationType: 'role:create',
                        description: '创建角色: ' + name,
                        newValue: data
                    });
                }
            })
            .catch(function(error) {
                self.toast('❌ 添加失败: ' + error.message, 'error');
            });
    };

    window.PermissionModule.deleteRole = function(roleId) {
        var self = this;
        var role = this.allRoles.find(function(r) { return r.id === roleId; });
        if (!role) return;

        if (!confirm('确认删除角色 "' + role.role_name + '"？')) return;

        var client = this._getClient();
        if (!client) {
            this.toast('数据库连接失败', 'error');
            return;
        }

        client.from('sys_role')
            .delete()
            .eq('id', roleId)
            .then(function(result) {
                if (result.error) throw result.error;
                self.toast('✅ 角色已删除', 'success');
                self.loadRoles();
                self.loadRoleSelects();
                if (window.PermissionService) {
                    PermissionService.logOperation({
                        operationType: 'role:delete',
                        description: '删除角色: ' + role.role_name,
                        oldValue: role
                    });
                }
            })
            .catch(function(error) {
                self.toast('❌ 删除失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 菜单管理
    // ============================================================
    window.PermissionModule.loadMenus = function() {
        var self = this;
        var client = this._getClient();
        if (!client) {
            self.el.menuTree.innerHTML = '<div class="text-center text-gray-400 py-8">请刷新页面重试</div>';
            return;
        }

        client.from('sys_menu')
            .select('*')
            .eq('is_deleted', false)
            .order('sort_order', { ascending: true })
            .then(function(result) {
                if (result.error) throw result.error;
                self.allMenus = result.data || [];
                self.renderMenus(result.data || []);
                self.loadMenuSelects(result.data || []);
            })
            .catch(function(error) {
                console.error('[Permission] 加载菜单失败:', error);
                self.el.menuTree.innerHTML = '<div class="text-center text-gray-400 py-8">加载失败</div>';
            });
    };

    window.PermissionModule.renderMenus = function(menus) {
        var tree = this.el.menuTree;
        if (!tree) return;

        if (!menus || menus.length === 0) {
            tree.innerHTML = '<div class="text-center text-gray-400 py-8">暂无菜单数据</div>';
            return;
        }

        var menuMap = {};
        menus.forEach(function(m) {
            menuMap[m.id] = { ...m, children: [] };
        });

        var rootMenus = [];
        menus.forEach(function(m) {
            if (m.parent_id && menuMap[m.parent_id]) {
                menuMap[m.parent_id].children.push(menuMap[m.id]);
            } else {
                rootMenus.push(menuMap[m.id]);
            }
        });

        rootMenus.sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });

        var html = this.renderMenuTree(rootMenus, 0);
        tree.innerHTML = html;
    };

    window.PermissionModule.renderMenuTree = function(menus, level) {
        var html = '';
        var self = this;

        menus.forEach(function(m) {
            var padding = level * 20;
            var statusIcon = m.is_visible ? '✅' : '❌';
            var statusColor = m.is_visible ? 'text-green-600' : 'text-red-600';

            html += '<div class="menu-item border-b hover:bg-gray-50" style="padding-left:' + padding + 'px;">';
            html += '<div class="flex justify-between items-center p-2">';
            html += '<div class="flex items-center gap-3">';
            html += '<span class="text-sm font-medium">' + (m.icon ? '<i class="fas ' + m.icon + '"></i> ' : '') + m.menu_name + '</span>';
            html += '<span class="text-xs text-gray-400">' + m.menu_code + '</span>';
            html += '<span class="text-xs text-gray-400">' + (m.route || '') + '</span>';
            html += '<span class="text-xs ' + statusColor + '">' + statusIcon + '</span>';
            html += '</div>';
            html += '<div class="flex gap-2">';
            html += '<button onclick="PermissionModule.editMenu(\'' + m.id + '\')" class="text-blue-500 hover:text-blue-700 text-xs">✏️</button>';
            html += '<button onclick="PermissionModule.deleteMenu(\'' + m.id + '\')" class="text-red-500 hover:text-red-700 text-xs">🗑️</button>';
            html += '</div>';
            html += '</div>';

            if (m.children && m.children.length > 0) {
                html += self.renderMenuTree(m.children, level + 1);
            }

            html += '</div>';
        });

        return html;
    };

    window.PermissionModule.loadMenuSelects = function(menus) {
        var sel = document.getElementById('menuParentInput');
        if (!sel) return;

        var html = '<option value="">顶级菜单</option>';
        menus.forEach(function(m) {
            html += '<option value="' + m.id + '">' + m.menu_name + '</option>';
        });
        sel.innerHTML = html;
    };

    window.PermissionModule.showAddMenu = function() {
        var modal = this.el.addMenuModal;
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('menuNameInput').value = '';
            document.getElementById('menuCodeInput').value = '';
            document.getElementById('menuRouteInput').value = '';
            document.getElementById('menuIconInput').value = '';
            document.getElementById('menuPermissionInput').value = '';
            document.getElementById('menuSortInput').value = '0';
            document.getElementById('menuStatusInput').value = 'true';
            this.loadMenuSelects(this.allMenus);
        }
    };

    window.PermissionModule.saveMenu = function() {
        var self = this;
        var name = document.getElementById('menuNameInput').value.trim();
        var code = document.getElementById('menuCodeInput').value.trim();
        var parentId = document.getElementById('menuParentInput').value || null;
        var route = document.getElementById('menuRouteInput').value.trim();
        var icon = document.getElementById('menuIconInput').value.trim();
        var permission = document.getElementById('menuPermissionInput').value.trim();
        var sort = parseInt(document.getElementById('menuSortInput').value) || 0;
        var isVisible = document.getElementById('menuStatusInput').value === 'true';

        if (!name || !code) {
            this.toast('请填写菜单名称和代码', 'error');
            return;
        }

        var client = this._getClient();
        if (!client) {
            this.toast('数据库连接失败', 'error');
            return;
        }

        var user = AppStore.get('currentUser');

        var data = {
            menu_name: name,
            menu_code: code,
            parent_id: parentId,
            route: route || null,
            icon: icon || null,
            permission: permission || null,
            sort_order: sort,
            is_visible: isVisible,
            is_deleted: false,
            created_by: user ? user.id : null,
            created_at: new Date().toISOString()
        };

        client.from('sys_menu')
            .insert(data)
            .select()
            .then(function(result) {
                if (result.error) throw result.error;
                self.toast('✅ 菜单已添加', 'success');
                self.closeModal('addMenuModal');
                self.loadMenus();
                if (window.PermissionService) {
                    PermissionService.logOperation({
                        operationType: 'menu:create',
                        description: '创建菜单: ' + name,
                        newValue: data
                    });
                }
            })
            .catch(function(error) {
                self.toast('❌ 添加失败: ' + error.message, 'error');
            });
    };

    window.PermissionModule.deleteMenu = function(menuId) {
        var self = this;
        var menu = this.allMenus.find(function(m) { return m.id === menuId; });
        if (!menu) return;

        if (!confirm('确认删除菜单 "' + menu.menu_name + '"？')) return;

        var client = this._getClient();
        if (!client) {
            this.toast('数据库连接失败', 'error');
            return;
        }

        client.from('sys_menu')
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('id', menuId)
            .then(function(result) {
                if (result.error) throw result.error;
                self.toast('✅ 菜单已删除', 'success');
                self.loadMenus();
                if (window.PermissionService) {
                    PermissionService.logOperation({
                        operationType: 'menu:delete',
                        description: '删除菜单: ' + menu.menu_name,
                        oldValue: menu
                    });
                }
            })
            .catch(function(error) {
                self.toast('❌ 删除失败: ' + error.message, 'error');
            });
    };

    window.PermissionModule.expandAll = function() {
        document.querySelectorAll('.menu-item > div').forEach(function(el) {
            el.style.display = 'block';
        });
    };

    window.PermissionModule.collapseAll = function() {
        document.querySelectorAll('.menu-item > div').forEach(function(el) {
            el.style.display = 'none';
        });
        document.querySelectorAll('.menu-item:not(.menu-item .menu-item) > div').forEach(function(el) {
            el.style.display = 'flex';
        });
    };

    // ============================================================
    // 权限分配
    // ============================================================
    window.PermissionModule.loadRoleSelects = function() {
        var selects = ['permRoleSelect', 'userPermUserSelect2'];

        selects.forEach(function(id) {
            var sel = document.getElementById(id);
            if (sel) {
                var html = '<option value="">-- 请选择 --</option>';
                window.PermissionModule.allRoles.forEach(function(r) {
                    html += '<option value="' + r.id + '">' + r.role_name + ' (' + r.role_code + ')</option>';
                });
                sel.innerHTML = html;
            }
        });

        var userSel = window.PermissionModule.el.userPermUserSelect;
        if (userSel) {
            var html = '<option value="">-- 请选择用户 --</option>';
            window.PermissionModule.allUsers.forEach(function(u) {
                html += '<option value="' + u.id + '">' + (u.name || u.username) + '</option>';
            });
            userSel.innerHTML = html;
        }
    };

    window.PermissionModule.loadAllPermissions = function() {
        var self = this;
        var client = this._getClient();
        if (!client) return;

        client.from('sys_permission')
            .select('*')
            .order('sort_order', { ascending: true })
            .then(function(result) {
                if (result.error) throw result.error;
                self.allPermissions = result.data || [];
                self.loadPermissionSelects(result.data || []);
            })
            .catch(function(error) {
                console.error('[Permission] 加载权限失败:', error);
            });
    };

    window.PermissionModule.loadPermissionSelects = function(perms) {
        var sel = document.getElementById('userPermPermissionSelect');
        if (!sel) return;

        var html = '<option value="">-- 请选择权限 --</option>';
        perms.forEach(function(p) {
            html += '<option value="' + p.id + '">' + p.permission_name + ' (' + p.permission_code + ')</option>';
        });
        sel.innerHTML = html;
    };

    window.PermissionModule.loadRolePermissions = function() {
        var self = this;
        var roleId = document.getElementById('permRoleSelect')?.value;

        if (!roleId) {
            this.el.permissionTree.innerHTML = '<div class="text-center text-gray-400 py-8">请选择一个角色</div>';
            return;
        }

        this.currentRoleId = roleId;

        var client = this._getClient();
        if (!client) {
            this.el.permissionTree.innerHTML = '<div class="text-center text-gray-400 py-8">数据库连接失败</div>';
            return;
        }

        client.from('sys_role_permission')
            .select('permission_id')
            .eq('role_id', roleId)
            .then(function(result) {
                if (result.error) throw result.error;
                var permIds = (result.data || []).map(function(rp) { return rp.permission_id; });

                var html = '';
                self.allPermissions.forEach(function(p) {
                    var checked = permIds.indexOf(p.id) !== -1;
                    html += '<div class="flex items-center gap-3 p-2 border-b hover:bg-gray-50">';
                    html += '<input type="checkbox" id="perm_' + p.id + '" ' + (checked ? 'checked' : '') + ' value="' + p.id + '" class="w-4 h-4">';
                    html += '<label for="perm_' + p.id + '" class="text-sm flex-1">' + p.permission_name + '</label>';
                    html += '<span class="text-xs text-gray-400">' + p.permission_code + '</span>';
                    html += '<span class="text-xs text-gray-400">' + p.permission_type + '</span>';
                    html += '</div>';
                });

                self.el.permissionTree.innerHTML = html;
            })
            .catch(function(error) {
                console.error('[Permission] 加载角色权限失败:', error);
                self.el.permissionTree.innerHTML = '<div class="text-center text-gray-400 py-8">加载失败</div>';
            });
    };

    window.PermissionModule.savePermissions = function() {
        var self = this;
        var roleId = this.currentRoleId;

        if (!roleId) {
            this.toast('请先选择角色', 'error');
            return;
        }

        var checkedPerms = [];
        document.querySelectorAll('#permissionTree input[type="checkbox"]:checked').forEach(function(cb) {
            checkedPerms.push(cb.value);
        });

        var client = this._getClient();
        if (!client) {
            this.toast('数据库连接失败', 'error');
            return;
        }

        var user = AppStore.get('currentUser');

        // 先删除旧的权限关联
        client.from('sys_role_permission')
            .delete()
            .eq('role_id', roleId)
            .then(function() {
                if (checkedPerms.length === 0) return Promise.resolve();

                var insertData = checkedPerms.map(function(permId) {
                    return {
                        role_id: roleId,
                        permission_id: permId,
                        created_by: user ? user.id : null,
                        created_at: new Date().toISOString()
                    };
                });

                return client.from('sys_role_permission')
                    .insert(insertData);
            })
            .then(function() {
                self.toast('✅ 权限已保存', 'success');
                if (window.PermissionService) {
                    PermissionService.clearCache();
                }
                if (window.PermissionService) {
                    PermissionService.logOperation({
                        operationType: 'permission:assign',
                        description: '分配角色权限',
                        newValue: { roleId: roleId, permissions: checkedPerms }
                    });
                }
            })
            .catch(function(error) {
                self.toast('❌ 保存失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 用户授权
    // ============================================================
    window.PermissionModule.loadUsers = function() {
        var self = this;

        var client = this._getClient();
        if (!client) return;

        client.from('users')
            .select('*')
            .order('created_at', { ascending: false })
            .then(function(result) {
                if (result.error) throw result.error;
                self.allUsers = result.data || [];
                self.loadRoleSelects();
            })
            .catch(function(error) {
                console.error('[Permission] 加载用户失败:', error);
            });
    };

    window.PermissionModule.loadUserPermissions = function() {
        var self = this;
        var userId = this.el.userPermUserSelect?.value;

        if (!userId) {
            this.el.userPermissionList.innerHTML = '<div class="text-center text-gray-400 py-8">请选择一个用户</div>';
            return;
        }

        this.currentUserId = userId;

        var client = this._getClient();
        if (!client) {
            this.el.userPermissionList.innerHTML = '<div class="text-center text-gray-400 py-8">数据库连接失败</div>';
            return;
        }

        client.from('sys_user_permission')
            .select('*')
            .eq('user_id', userId)
            .then(function(result) {
                if (result.error) throw result.error;
                var userPerms = result.data || [];

                if (userPerms.length === 0) {
                    self.el.userPermissionList.innerHTML = '<div class="text-center text-gray-400 py-8">该用户暂无单独授权</div>';
                    return;
                }

                var html = '';
                var permMap = {};
                self.allPermissions.forEach(function(p) {
                    permMap[p.id] = p;
                });

                userPerms.forEach(function(up) {
                    var p = permMap[up.permission_id];
                    if (!p) return;
                    var validFrom = up.valid_from ? new Date(up.valid_from).toLocaleDateString() : '-';
                    var validTo = up.valid_to ? new Date(up.valid_to).toLocaleDateString() : '-';

                    html += '<div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg border">';
                    html += '<div>';
                    html += '<span class="font-medium">' + p.permission_name + '</span>';
                    html += '<span class="text-xs text-gray-400 ml-2">' + p.permission_code + '</span>';
                    html += '<span class="text-xs text-gray-400 ml-2">有效: ' + validFrom + ' ~ ' + validTo + '</span>';
                    html += '</div>';
                    html += '<button onclick="PermissionModule.deleteUserPermission(\'' + up.id + '\')" class="text-red-500 hover:text-red-700 text-xs">🗑️</button>';
                    html += '</div>';
                });

                self.el.userPermissionList.innerHTML = html;
            })
            .catch(function(error) {
                console.error('[Permission] 加载用户权限失败:', error);
            });
    };

    window.PermissionModule.addUserPermission = function() {
        var modal = this.el.addUserPermModal;
        if (modal) {
            modal.classList.remove('hidden');
            this.loadRoleSelects();
            this.loadPermissionSelects(this.allPermissions);
            document.getElementById('userPermValidFrom').value = '';
            document.getElementById('userPermValidTo').value = '';
        }
    };

    window.PermissionModule.saveUserPermission = function() {
        var self = this;
        var userId = document.getElementById('userPermUserSelect2').value;
        var permissionId = document.getElementById('userPermPermissionSelect').value;
        var validFrom = document.getElementById('userPermValidFrom').value || null;
        var validTo = document.getElementById('userPermValidTo').value || null;

        if (!userId || !permissionId) {
            this.toast('请选择用户和权限', 'error');
            return;
        }

        var client = this._getClient();
        if (!client) {
            this.toast('数据库连接失败', 'error');
            return;
        }

        var user = AppStore.get('currentUser');

        var data = {
            user_id: userId,
            permission_id: permissionId,
            is_granted: true,
            valid_from: validFrom,
            valid_to: validTo,
            created_by: user ? user.id : null,
            created_at: new Date().toISOString()
        };

        client.from('sys_user_permission')
            .insert(data)
            .select()
            .then(function(result) {
                if (result.error) throw result.error;
                self.toast('✅ 用户授权已添加', 'success');
                self.closeModal('addUserPermModal');
                self.loadUserPermissions();
                if (window.PermissionService) {
                    PermissionService.clearCache(userId);
                    PermissionService.logOperation({
                        operationType: 'user:permission',
                        description: '为用户授权',
                        newValue: data
                    });
                }
            })
            .catch(function(error) {
                self.toast('❌ 添加失败: ' + error.message, 'error');
            });
    };

    window.PermissionModule.deleteUserPermission = function(upId) {
        var self = this;
        if (!confirm('确认移除该用户权限？')) return;

        var client = this._getClient();
        if (!client) {
            this.toast('数据库连接失败', 'error');
            return;
        }

        client.from('sys_user_permission')
            .delete()
            .eq('id', upId)
            .then(function(result) {
                if (result.error) throw result.error;
                self.toast('✅ 权限已移除', 'success');
                self.loadUserPermissions();
                if (window.PermissionService) {
                    PermissionService.clearCache(self.currentUserId);
                }
            })
            .catch(function(error) {
                self.toast('❌ 移除失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 审计日志
    // ============================================================
    window.PermissionModule.loadAuditLogs = function() {
        var self = this;

        var client = this._getClient();
        if (!client) {
            self.el.auditList.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-8">请刷新页面重试</td></tr>';
            return;
        }

        var startDate = this.el.auditStartDate ? this.el.auditStartDate.value : '';
        var endDate = this.el.auditEndDate ? this.el.auditEndDate.value : '';
        var search = this.el.auditSearch ? this.el.auditSearch.value.trim().toLowerCase() : '';

        var query = client.from('sys_audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (startDate) {
            query = query.gte('created_at', startDate);
        }
        if (endDate) {
            query = query.lte('created_at', endDate + 'T23:59:59');
        }

        query.then(function(result) {
            if (result.error) throw result.error;
            var logs = result.data || [];

            if (search) {
                logs = logs.filter(function(l) {
                    return (l.username || '').toLowerCase().includes(search) ||
                           (l.action || '').toLowerCase().includes(search) ||
                           (l.resource_name || '').toLowerCase().includes(search);
                });
            }

            self.renderAuditLogs(logs);
        }).catch(function(error) {
            console.error('[Permission] 加载审计日志失败:', error);
            self.el.auditList.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-8">加载失败</td></tr>';
        });
    };

    window.PermissionModule.renderAuditLogs = function(logs) {
        var list = this.el.auditList;
        if (!list) return;

        if (!logs || logs.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-8">暂无审计日志</td></tr>';
            return;
        }

        var html = '';
        logs.forEach(function(l) {
            html += '<tr class="border-b hover:bg-gray-50">';
            html += '<td class="p-2 text-sm text-gray-400">' + (l.created_at ? new Date(l.created_at).toLocaleString() : '-') + '</td>';
            html += '<td class="p-2 font-medium">' + (l.username || '系统') + '</td>';
            html += '<td class="p-2">' + (l.action || '-') + '</td>';
            html += '<td class="p-2 text-sm">' + (l.resource_type || '-') + '</td>';
            html += '<td class="p-2 text-sm">' + (l.resource_name || '-') + '</td>';
            html += '<td class="p-2 text-sm">';
            if (l.old_value || l.new_value) {
                var oldVal = l.old_value ? JSON.stringify(l.old_value).substring(0, 30) : '-';
                var newVal = l.new_value ? JSON.stringify(l.new_value).substring(0, 30) : '-';
                html += oldVal + ' → ' + newVal;
            } else {
                html += '-';
            }
            html += '</td>';
            html += '</tr>';
        });

        list.innerHTML = html;
    };

    window.PermissionModule.exportAuditLogs = function() {
        var self = this;

        var client = this._getClient();
        if (!client) {
            this.toast('数据库连接失败', 'error');
            return;
        }

        client.from('sys_audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000)
            .then(function(result) {
                if (result.error) throw result.error;
                var logs = result.data || [];

                if (logs.length === 0) {
                    self.toast('暂无数据可导出', 'error');
                    return;
                }

                if (typeof window.XLSX === 'undefined') {
                    self.toast('XLSX库未加载', 'error');
                    return;
                }

                var exportData = [['时间', '用户', '操作', '资源类型', '资源名称', '变更前', '变更后']];
                logs.forEach(function(l) {
                    exportData.push([
                        l.created_at ? new Date(l.created_at).toLocaleString() : '',
                        l.username || '系统',
                        l.action || '',
                        l.resource_type || '',
                        l.resource_name || '',
                        l.old_value ? JSON.stringify(l.old_value).substring(0, 100) : '',
                        l.new_value ? JSON.stringify(l.new_value).substring(0, 100) : ''
                    ]);
                });

                try {
                    var ws = window.XLSX.utils.aoa_to_sheet(exportData);
                    var wb = window.XLSX.utils.book_new();
                    window.XLSX.utils.book_append_sheet(wb, ws, '审计日志');
                    window.XLSX.writeFile(wb, '审计日志_' + new Date().toISOString().split('T')[0] + '.xlsx');
                    self.toast('✅ 审计日志已导出', 'success');
                } catch(e) {
                    self.toast('❌ 导出失败: ' + e.message, 'error');
                }
            })
            .catch(function(error) {
                self.toast('❌ 加载数据失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 刷新
    // ============================================================
    window.PermissionModule.refresh = function() {
        this.loadData();
        this.toast('✅ 数据已刷新', 'success');
    };

    // ============================================================
    // 导出数据
    // ============================================================
    window.PermissionModule.exportData = function() {
        var self = this;

        if (typeof window.XLSX === 'undefined') {
            this.toast('XLSX库未加载', 'error');
            return;
        }

        var data = [
            ['CarWash SaaS Pro - 权限中心数据导出'],
            ['导出时间', new Date().toLocaleString()],
            [],
            ['===== 角色列表 ====='],
            ['角色名称', '角色代码', '类型', '状态', '备注']
        ];

        this.allRoles.forEach(function(r) {
            data.push([
                r.role_name,
                r.role_code,
                r.is_system ? '系统' : '自定义',
                r.status === 'active' ? '启用' : '禁用',
                r.remark || ''
            ]);
        });

        data.push([]);
        data.push(['===== 菜单列表 =====']);
        data.push(['菜单名称', '菜单代码', '路由', '图标', '权限标识', '排序', '状态']);

        this.allMenus.forEach(function(m) {
            data.push([
                m.menu_name,
                m.menu_code,
                m.route || '',
                m.icon || '',
                m.permission || '',
                m.sort_order || 0,
                m.is_visible ? '显示' : '隐藏'
            ]);
        });

        try {
            var ws = window.XLSX.utils.aoa_to_sheet(data);
            var wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, '权限中心数据');
            window.XLSX.writeFile(wb, '权限中心数据_' + new Date().toISOString().split('T')[0] + '.xlsx');
            this.toast('✅ 数据已导出', 'success');
        } catch(e) {
            this.toast('❌ 导出失败: ' + e.message, 'error');
        }
    };

    // ============================================================
    // 通用
    // ============================================================
    window.PermissionModule.closeModal = function(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    };

    console.log('[Permission] 模块已注册');
})();