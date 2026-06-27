// ================================================================
//  Auth UI 控制
// ================================================================
function showLogin() {
    document.getElementById('loginView').classList.remove('hidden');
    document.getElementById('registerView').classList.add('hidden');
    document.getElementById('forgotPasswordView').classList.add('hidden');
    document.getElementById('changePasswordView').classList.add('hidden');
}

function showRegister() {
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('registerView').classList.remove('hidden');
    document.getElementById('forgotPasswordView').classList.add('hidden');
    document.getElementById('changePasswordView').classList.add('hidden');
}

function showForgotPassword() {
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('registerView').classList.add('hidden');
    document.getElementById('forgotPasswordView').classList.remove('hidden');
    document.getElementById('changePasswordView').classList.add('hidden');
}

function showChangePassword() {
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('registerView').classList.add('hidden');
    document.getElementById('forgotPasswordView').classList.add('hidden');
    document.getElementById('changePasswordView').classList.remove('hidden');
    document.getElementById('changeOldPassword').value = '';
    document.getElementById('changeNewPassword').value = '';
    document.getElementById('changeConfirmPassword').value = '';
}

// ================================================================
//  注册功能（状态：待审核）
// ================================================================
async function registerUser() {
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim() || username;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;
    const role = document.getElementById('regRole').value;

    if (!username || !password) { showToast('请填写用户名和密码'); return; }
    if (password.length < 6) { showToast('密码至少6位'); return; }
    if (password !== confirm) { showToast('两次密码不一致'); return; }

    if (role === 'owner') {
        showToast('❌ 老板账号不能通过注册创建，请联系管理员');
        return;
    }

    try {
        const { data: existing } = await supabaseClient
            .from('users')
            .select('username')
            .eq('username', username);

        if (existing && existing.length > 0) {
            showToast('❌ 用户名已存在');
            return;
        }

        const passwordHash = CryptoJS.SHA256(password).toString();
        const { error } = await supabaseClient
            .from('users')
            .insert([{
                username,
                password_hash: passwordHash,
                role: role,
                name: name,
                status: 'pending',
                registered_at: new Date().toISOString()
            }]);

        if (error) throw new Error(error.message);

        showToast('✅ 注册申请已提交！请等待管理员审核');
        document.getElementById('regUsername').value = '';
        document.getElementById('regName').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regPasswordConfirm').value = '';
        showLogin();
    } catch (error) {
        showToast('❌ 注册失败: ' + error.message);
    }
}

// ================================================================
//  登录功能（检查状态）
// ================================================================
async function authLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) { showToast('请输入用户名和密码'); return; }

    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*');

        if (error) throw new Error(error.message);
        if (!users || users.length === 0) {
            showToast('⚠️ 系统暂无用户，请先注册');
            return;
        }

        allUsers = users;
        const user = users.find(u => u.username === username);
        if (!user) { showToast('❌ 用户不存在，请先注册'); return; }

        if (user.status === 'pending') {
            showToast('⏳ 账号正在审核中，请等待管理员审核通过');
            return;
        }
        if (user.status === 'rejected') {
            showToast('❌ 账号已被拒绝，请联系管理员');
            return;
        }
        if (user.status !== 'approved') {
            showToast('❌ 账号状态异常，请联系管理员');
            return;
        }

        const hash = CryptoJS.SHA256(password).toString();
        if (user.password_hash !== hash) { showToast('❌ 密码错误'); return; }

        currentUser = {
            id: user.id,
            username: user.username,
            password_hash: user.password_hash,
            role: user.role || 'employee',
            name: user.name || user.username,
            status: user.status,
            registered_at: user.registered_at,
            approved_by: user.approved_by,
            approved_at: user.approved_at,
            branch_id: user.branch_id,
            tenant_id: user.tenant_id,
            store_id: user.store_id,
            role_id: user.role_id,
            employee_code: user.employee_code,
            phone: user.phone,
            avatar_url: user.avatar_url,
            last_login_at: user.last_login_at,
            updated_at: user.updated_at
        };
        
        localStorage.setItem('cw_session', JSON.stringify({ 
            id: user.id, 
            username: user.username,
            role: user.role || 'employee'
        }));
        
        await loadAllData();
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('appContainer').classList.remove('hidden');
        updateUIAfterLogin();
        showToast('👋 欢迎 ' + (user.name || user.username));
        switchTab('dashboard');
    } catch (error) {
        showToast('❌ 登录失败: ' + error.message);
    }
}

// ================================================================
//  忘记密码（需账号已审核）
// ================================================================
async function resetPassword() {
    const username = document.getElementById('forgotUsername').value.trim();
    const newPassword = document.getElementById('forgotNewPassword').value;
    const confirm = document.getElementById('forgotConfirmPassword').value;

    if (!username || !newPassword) { showToast('请填写用户名和新密码'); return; }
    if (newPassword.length < 6) { showToast('密码至少6位'); return; }
    if (newPassword !== confirm) { showToast('两次密码不一致'); return; }

    try {
        const { data: user } = await supabaseClient
            .from('users')
            .select('id, status')
            .eq('username', username)
            .single();

        if (!user) { showToast('❌ 用户不存在'); return; }
        if (user.status !== 'approved') {
            showToast('❌ 账号未审核通过，无法重置密码');
            return;
        }

        const passwordHash = CryptoJS.SHA256(newPassword).toString();
        await supabaseClient
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('username', username);

        showToast('✅ 密码已重置，请登录');
        document.getElementById('loginUsername').value = username;
        showLogin();
    } catch (error) {
        showToast('❌ 重置失败: ' + error.message);
    }
}

// ================================================================
//  修改密码
// ================================================================
async function changePassword() {
    const username = document.getElementById('changeUsername').value.trim();
    const oldPassword = document.getElementById('changeOldPassword').value;
    const newPassword = document.getElementById('changeNewPassword').value;
    const confirm = document.getElementById('changeConfirmPassword').value;

    if (!username || !oldPassword || !newPassword) { showToast('请填写完整信息'); return; }
    if (newPassword.length < 6) { showToast('新密码至少6位'); return; }
    if (newPassword !== confirm) { showToast('两次密码不一致'); return; }

    try {
        const { data: user } = await supabaseClient
            .from('users')
            .select('id, password_hash, status')
            .eq('username', username)
            .single();

        if (!user) { showToast('❌ 用户不存在'); return; }
        if (user.status !== 'approved') {
            showToast('❌ 账号未审核通过，无法修改密码');
            return;
        }

        const oldHash = CryptoJS.SHA256(oldPassword).toString();
        if (user.password_hash !== oldHash) { showToast('❌ 当前密码错误'); return; }

        const newHash = CryptoJS.SHA256(newPassword).toString();
        await supabaseClient
            .from('users')
            .update({ password_hash: newHash })
            .eq('username', username);

        showToast('✅ 密码修改成功，请重新登录');
        document.getElementById('loginUsername').value = username;
        showLogin();
    } catch (error) {
        showToast('❌ 修改失败: ' + error.message);
    }
}

// ================================================================
//  修改密码（从菜单调用）
// ================================================================
function showChangePasswordFromMenu() {
    if (!currentUser) {
        showToast('请先登录');
        document.getElementById('loginModal').style.display = 'flex';
        return;
    }
    document.getElementById('loginModal').style.display = 'flex';
    showChangePassword();
    document.getElementById('changeUsername').value = currentUser.username || '';
    showToast('请输入当前密码和新密码');
}

// ================================================================
//  退出登录
// ================================================================
function logout() {
    currentUser = null;
    localStorage.removeItem('cw_session');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('loginModal').style.display = 'flex';
    showToast('已退出');
}

// ================================================================
//  UI更新
// ================================================================
function updateUIAfterLogin() {
    const role = currentUser?.role || 'employee';
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.employee;

    document.getElementById('navCashier').style.display = permissions.cashier ? 'flex' : 'none';
    document.getElementById('navOrders').style.display = permissions.orders ? 'flex' : 'none';
    document.getElementById('navInventory').style.display = permissions.inventory ? 'flex' : 'none';
    document.getElementById('navCustomers').style.display = permissions.customers ? 'flex' : 'none';
    document.getElementById('navAttendance').style.display = permissions.attendance ? 'flex' : 'none';
    document.getElementById('navReports').style.display = permissions.reports ? 'flex' : 'none';
    document.getElementById('navEmployees').style.display = permissions.employees ? 'flex' : 'none';
    document.getElementById('navAudit').style.display = permissions.audit ? 'flex' : 'none';
    document.getElementById('navSettings').style.display = permissions.settings ? 'flex' : 'none';

    document.getElementById('userRoleDisplay').textContent = (ROLE_PERMISSIONS[role]?.icon || '') + ' ' + (ROLE_PERMISSIONS[role]?.label || role);
    document.getElementById('currentRoleSpan').textContent = ROLE_PERMISSIONS[role]?.label || role;
    document.getElementById('currentUserSpan').textContent = currentUser?.name || currentUser?.username || 'Admin';
    document.getElementById('headerUsername').textContent = currentUser?.name || currentUser?.username || 'Admin';

    updateBranchSelector();
    refreshAll();
    switchTab('dashboard');
    updatePOSPrice();
}

function switchTab(tab) {
    if (currentUser && !currentUser.role) {
        const user = allUsers.find(u => u.id === currentUser.id);
        if (user) {
            currentUser = {
                id: user.id,
                username: user.username,
                password_hash: user.password_hash,
                role: user.role || 'employee',
                name: user.name || user.username,
                status: user.status,
                registered_at: user.registered_at,
                approved_by: user.approved_by,
                approved_at: user.approved_at,
                branch_id: user.branch_id,
                tenant_id: user.tenant_id,
                store_id: user.store_id,
                role_id: user.role_id,
                employee_code: user.employee_code,
                phone: user.phone,
                avatar_url: user.avatar_url,
                last_login_at: user.last_login_at,
                updated_at: user.updated_at
            };
            localStorage.setItem('cw_session', JSON.stringify({ 
                id: user.id, 
                username: user.username,
                role: user.role || 'employee'
            }));
        }
    }
    
    const permissions = ROLE_PERMISSIONS[currentUser?.role] || ROLE_PERMISSIONS.employee;
    if (!permissions[tab]) { 
        showToast('⚠️ 您没有权限访问此页面'); 
        return; 
    }

    document.querySelectorAll('.module-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('module' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('[data-nav]').forEach(el => {
        el.classList.remove('nav-item-active');
        if (el.dataset.nav === tab) el.classList.add('nav-item-active');
    });

    const titles = { dashboard: '仪表板', cashier: '收银台', orders: '订单管理', inventory: '库存管理', members: '客户管理', attendance: '考勤管理', reports: '财务管理', employees: '员工审核', audit: '审计日志', settings: '系统设置' };
    document.getElementById('currentPageTitle').textContent = titles[tab] || tab;

    if (tab === 'dashboard') refreshDashboard();
    if (tab === 'cashier') refreshPOS();
    if (tab === 'orders') loadOrders();
    if (tab === 'inventory') refreshInventory();
    if (tab === 'members') refreshCustomers();
    if (tab === 'attendance') refreshAttendance();
    if (tab === 'employees') loadUsersForReview();
    if (tab === 'reports') { loadDailyReport(); loadCommission(); loadCustomerRank(); }
    if (tab === 'audit') loadAuditLog();
    if (tab === 'settings') { loadSettings(); loadBackupConfig(); refreshBranches(); }
}

document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); switchTab(el.dataset.nav); });
});

// ================================================================
//  数据过滤
// ================================================================
function getFilteredOrders() {
    let orders = allOrders;
    const role = currentUser?.role || 'employee';
    if (role === 'owner' || role === 'manager') return orders;
    const username = currentUser?.name || currentUser?.username || '';
    return orders.filter(o => o.staff_name === username || o.employee_id === currentUser?.id);
}

// ================================================================
//  门店功能
// ================================================================
function updateBranchSelector() {
    const sel = document.getElementById('branchSelector');
    if (!sel) return;
    sel.innerHTML = '<option value="all">🏪 全部门店</option>' + allBranches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    if (currentBranch && currentBranch !== 'all') sel.value = currentBranch;
}

function switchBranch() {
    currentBranch = document.getElementById('branchSelector').value;
    refreshAll();
    const branchName = currentBranch === 'all' ? '全部门店' : allBranches.find(b => b.id === currentBranch)?.name || '未知';
    showToast('已切换到: ' + branchName);
}

async function addBranch() {
    if (!currentUser || currentUser.role !== 'owner') { showToast('只有老板可以添加门店'); return; }
    const name = document.getElementById('newBranchName').value.trim();
    const address = document.getElementById('newBranchAddress').value.trim();
    if (!name) { showToast('请输入门店名称'); return; }
    try {
        const { data, error } = await supabaseClient.from('stores').insert([{ name, address, status: 'active' }]).select();
        if (error) throw new Error(error.message);
        if (data && data.length > 0) { allBranches.push(data[0]); refreshBranches(); updateBranchSelector(); showToast('✅ 门店已添加: ' + name); document.getElementById('newBranchName').value = ''; document.getElementById('newBranchAddress').value = ''; }
    } catch (error) { showToast('❌ 添加失败: ' + error.message); }
}

function refreshBranches() {
    const list = document.getElementById('branchList');
    if (!list) return;
    list.innerHTML = allBranches.map(b => `<div class="flex justify-between items-center p-2 bg-gray-50 rounded"><span><strong>${b.name}</strong> <span class="text-sm text-gray-400">${b.address || ''}</span></span><span class="text-xs text-gray-400">${b.status || 'active'}</span></div>`).join('') || '<div class="text-center text-gray-400">暂无门店</div>';
}

// ================================================================
//  刷新所有
// ================================================================
function refreshAll() {
    refreshDashboard();
    refreshCustomers();
    refreshInventory();
    refreshAttendance();
    refreshEmployees();
    refreshPOS();
    if (!document.getElementById('moduleOrders').classList.contains('hidden')) loadOrders();
    if (!document.getElementById('moduleReports').classList.contains('hidden')) { loadDailyReport(); loadCommission(); loadCustomerRank(); }
    if (!document.getElementById('moduleAudit').classList.contains('hidden')) loadAuditLog();
    if (!document.getElementById('moduleEmployees').classList.contains('hidden')) loadUsersForReview();
}