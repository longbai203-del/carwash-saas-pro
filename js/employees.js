// ================================================================
//  员工审核管理
// ================================================================
async function loadUsersForReview() {
    const statusFilter = document.getElementById('userStatusFilter')?.value || 'all';
    let users = allUsers;
    if (statusFilter !== 'all') users = users.filter(u => u.status === statusFilter);

    const list = document.getElementById('usersReviewList');
    list.innerHTML = users.map(u => {
        const statusClass = u.status === 'pending' ? 'status-badge-pending' : u.status === 'approved' ? 'status-badge-approved' : 'status-badge-rejected';
        const statusLabel = u.status === 'pending' ? '⏳ 待审核' : u.status === 'approved' ? '✅ 已通过' : '❌ 已拒绝';
        const rowClass = u.status === 'pending' ? 'pending-user' : u.status === 'approved' ? 'approved-user' : 'rejected-user';
        return `
            <div class="${rowClass} flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border">
                <div>
                    <span class="font-bold">${u.name || u.username}</span>
                    <span class="text-sm text-gray-400 ml-2">@${u.username}</span>
                    <span class="role-badge role-${u.role}">${ROLE_PERMISSIONS[u.role]?.label || u.role}</span>
                    <span class="status-badge ${statusClass} ml-2">${statusLabel}</span>
                    <div class="text-xs text-gray-400">注册时间: ${u.registered_at ? new Date(u.registered_at).toLocaleString() : '未知'}</div>
                </div>
                <div class="flex gap-2">
                    ${u.status === 'pending' ? `
                        <button onclick="approveUser('${u.id}')" class="btn-success btn-sm">✅ 通过</button>
                        <button onclick="rejectUser('${u.id}')" class="btn-danger btn-sm">❌ 拒绝</button>
                    ` : ''}
                    ${u.status === 'approved' ? `
                        <button onclick="rejectUser('${u.id}')" class="btn-warning btn-sm">⛔ 停用</button>
                    ` : ''}
                    ${u.status === 'rejected' ? `
                        <button onclick="approveUser('${u.id}')" class="btn-success btn-sm">✅ 恢复</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('') || '<div class="text-center text-gray-400">暂无用户</div>';
}

async function approveUser(userId) {
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'manager')) {
        showToast('❌ 只有老板和店长可以审核用户');
        return;
    }
    try {
        await supabaseClient
            .from('users')
            .update({ 
                status: 'approved', 
                approved_by: currentUser.id,
                approved_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        const user = allUsers.find(u => u.id === userId);
        if (user) user.status = 'approved';
        
        showToast('✅ 用户已审核通过');
        loadUsersForReview();
        refreshAll();
    } catch (error) {
        showToast('❌ 操作失败: ' + error.message);
    }
}

async function rejectUser(userId) {
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'manager')) {
        showToast('❌ 只有老板和店长可以审核用户');
        return;
    }
    if (!confirm('确认拒绝/停用该用户？')) return;
    try {
        await supabaseClient
            .from('users')
            .update({ 
                status: 'rejected', 
                approved_by: currentUser.id,
                approved_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        const user = allUsers.find(u => u.id === userId);
        if (user) user.status = 'rejected';
        
        showToast('✅ 用户已拒绝/停用');
        loadUsersForReview();
        refreshAll();
    } catch (error) {
        showToast('❌ 操作失败: ' + error.message);
    }
}

// ================================================================
//  创建老板账号（管理员专用，无需审核）
// ================================================================
async function createAdminAccount() {
    if (!currentUser || currentUser.role !== 'owner') {
        showToast('❌ 只有老板可以创建老板账号');
        return;
    }
    const username = document.getElementById('adminCreateUsername').value.trim();
    const password = document.getElementById('adminCreatePassword').value.trim();
    if (!username || !password) { showToast('请填写用户名和密码'); return; }
    if (password.length < 6) { showToast('密码至少6位'); return; }

    try {
        const { data: existing } = await supabaseClient
            .from('users')
            .select('username')
            .eq('username', username);
        if (existing && existing.length > 0) { showToast('❌ 用户名已存在'); return; }

        const passwordHash = CryptoJS.SHA256(password).toString();
        const { error } = await supabaseClient
            .from('users')
            .insert([{
                username,
                password_hash: passwordHash,
                role: 'owner',
                name: username,
                status: 'approved',
                registered_at: new Date().toISOString(),
                approved_by: currentUser.id,
                approved_at: new Date().toISOString()
            }]);

        if (error) throw new Error(error.message);

        showToast('✅ 老板账号已创建: ' + username);
        document.getElementById('adminCreateUsername').value = '';
        document.getElementById('adminCreatePassword').value = '';
        loadUsersForReview();
        refreshEmployees();
    } catch (error) {
        showToast('❌ 创建失败: ' + error.message);
    }
}

function refreshEmployees() {
    const list = document.getElementById('employeesList');
    if (!list) return;
    list.innerHTML = allUsers.filter(u => u.status === 'approved').map(u =>
        `<div class="flex justify-between bg-gray-50 p-3 rounded-xl"><span><strong>${u.name || u.username}</strong> <span class="role-badge role-${u.role}">${ROLE_PERMISSIONS[u.role]?.label || u.role}</span></span><span>${u.username}</span></div>`
    ).join('');
}