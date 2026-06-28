/**
 * reports.js - 财务管理模块（含 VAT + 发票）
 */
(function() {
    'use strict';

    window.ReportsModule = Object.create(ModuleBase);
    window.ReportsModule.moduleName = 'reports';

    // ===== 缓存 DOM =====
    window.ReportsModule.cacheDom = function() {
        this.el = {
            orders: document.getElementById('dailyOrders'),
            revenue: document.getElementById('dailyRevenue'),
            expense: document.getElementById('dailyExpense'),
            profit: document.getElementById('dailyProfit'),
            table: document.getElementById('reportTableBody'),
            picker: document.getElementById('reportDatePicker'),
            
            // VAT 设置
            vatRate: document.getElementById('vatRateSetting'),
            taxNumber: document.getElementById('taxNumberSetting'),
            companyName: document.getElementById('companyNameSetting'),
            companyAddress: document.getElementById('companyAddressSetting'),
            invoicePrefix: document.getElementById('invoicePrefixSetting'),
            zatcaStatus: document.getElementById('zatcaStatus'),
            
            // 发票
            invoiceList: document.getElementById('invoiceList'),
            invoiceModal: document.getElementById('invoiceModal'),
            invoiceOrder: document.getElementById('invoiceOrder'),
            invoiceCustomer: document.getElementById('invoiceCustomer'),
            invoiceDate: document.getElementById('invoiceDate'),
            invoicePayment: document.getElementById('invoicePayment'),
            invoiceNotes: document.getElementById('invoiceNotes'),
            invoiceSubtotal: document.getElementById('invoiceSubtotal'),
            invoiceVat: document.getElementById('invoiceVat'),
            invoiceTotal: document.getElementById('invoiceTotal'),
            
            // 发票预览
            invoicePreviewModal: document.getElementById('invoicePreviewModal'),
            invoicePreviewContent: document.getElementById('invoicePreviewContent'),
            invoicePreviewTitle: document.getElementById('invoicePreviewTitle'),
            
            // Credit Note
            creditNoteList: document.getElementById('creditNoteList'),
            creditNoteModal: document.getElementById('creditNoteModal'),
            creditNoteInvoice: document.getElementById('creditNoteInvoice'),
            creditNoteAmount: document.getElementById('creditNoteAmount'),
            creditNoteReason: document.getElementById('creditNoteReason'),
            creditNoteDetail: document.getElementById('creditNoteDetail')
        };
    };

    // ===== 绑定事件 =====
    window.ReportsModule.bindEvents = function() {
        var self = this;
        if (this.el.picker) {
            this.el.picker.addEventListener('change', function() { self.loadData(); });
        }
    };

    // ===== 加载数据 =====
    window.ReportsModule.loadData = function() {
        var date = this.el.picker ? this.el.picker.value || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        var orders = this.getData('allOrders');
        var filtered = orders.filter(function(o) { return o.date === date; });
        var total = filtered.reduce(function(s, o) { return s + (o.total || 0); }, 0);

        if (this.el.orders) this.el.orders.textContent = filtered.length;
        if (this.el.revenue) this.el.revenue.textContent = total.toFixed(2) + ' SAR';

        // 加载费用
        this.loadExpenses(date);
        this.loadVatSettings();
        this.loadInvoices();
        this.loadCreditNotes();
        this.renderReport(filtered);
    };

    // ===== 加载费用 =====
    window.ReportsModule.loadExpenses = function(date) {
        var expenses = this.getData('allExpenses') || [];
        var filtered = expenses.filter(function(e) { return e.expense_date === date; });
        var totalExpense = filtered.reduce(function(s, e) { return s + (e.amount || 0); }, 0);
        if (this.el.expense) this.el.expense.textContent = totalExpense.toFixed(2) + ' SAR';

        var revenue = this.el.revenue ? parseFloat(this.el.revenue.textContent) || 0 : 0;
        var profit = revenue - totalExpense;
        if (this.el.profit) this.el.profit.textContent = profit.toFixed(2) + ' SAR';
    };

    // ===== 渲染报表 =====
    window.ReportsModule.renderReport = function(orders) {
        var table = this.el.table;
        if (!table) return;
        if (!orders || orders.length === 0) {
            table.innerHTML = '<div class="text-center text-gray-400 py-4">今日暂无订单</div>';
            return;
        }
        var html = '<div class="font-semibold text-sm text-gray-600 mb-2">📋 收入明细</div>';
        orders.slice(0, 30).forEach(function(o) {
            html += '<div class="flex justify-between p-1 border-b text-sm">';
            html += '<span>' + (o.plate_number || 'N/A') + '</span>';
            html += '<span class="text-green-600">+' + (o.total || 0).toFixed(2) + ' SAR</span>';
            html += '</div>';
        });
        table.innerHTML = html;
    };

    // ============================================================
    // VAT 设置
    // ============================================================

    window.ReportsModule.loadVatSettings = function() {
        var self = this;
        AppApi.query('vat_settings', { limit: 1 })
            .then(function(data) {
                if (data && data.length > 0) {
                    var settings = data[0];
                    if (self.el.vatRate) self.el.vatRate.value = settings.vat_rate || 15;
                    if (self.el.taxNumber) self.el.taxNumber.value = settings.tax_number || '';
                    if (self.el.companyName) self.el.companyName.value = settings.company_name || '';
                    if (self.el.companyAddress) self.el.companyAddress.value = settings.company_address || '';
                    if (self.el.invoicePrefix) self.el.invoicePrefix.value = settings.invoice_prefix || 'INV-';
                    if (self.el.zatcaStatus) {
                        self.el.zatcaStatus.textContent = settings.zatca_registered ? '✅ ZATCA 已注册' : '⚠️ ZATCA 未注册';
                        self.el.zatcaStatus.className = settings.zatca_registered ? 'text-xs text-green-600' : 'text-xs text-amber-600';
                    }
                }
            })
            .catch(function(error) {
                console.error('[Reports] 加载 VAT 设置失败:', error);
            });
    };

    window.ReportsModule.saveVatSettings = function() {
        var self = this;
        var currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'owner') {
            this.toast('只有老板可以修改 VAT 设置', 'error');
            return;
        }

        var tenant = AppStore.get('currentTenant');
        if (!tenant) {
            this.toast('请先选择租户', 'error');
            return;
        }

        var vatRate = this.el.vatRate ? parseFloat(this.el.vatRate.value) || 15 : 15;
        var taxNumber = this.el.taxNumber ? this.el.taxNumber.value.trim() : '';
        var companyName = this.el.companyName ? this.el.companyName.value.trim() : '';
        var companyAddress = this.el.companyAddress ? this.el.companyAddress.value.trim() : '';
        var invoicePrefix = this.el.invoicePrefix ? this.el.invoicePrefix.value.trim() || 'INV-' : 'INV-';

        if (!taxNumber || !companyName) {
            this.toast('请填写税号和公司名称', 'error');
            return;
        }

        var settingsData = {
            tenant_id: tenant.id,
            vat_rate: vatRate,
            tax_number: taxNumber,
            company_name: companyName,
            company_address: companyAddress,
            invoice_prefix: invoicePrefix,
            vat_enabled: true,
            updated_at: new Date().toISOString()
        };

        AppApi.query('vat_settings', { filter: { tenant_id: tenant.id } })
            .then(function(existing) {
                if (existing && existing.length > 0) {
                    return AppApi.update('vat_settings', existing[0].id, settingsData);
                } else {
                    return AppApi.insert('vat_settings', settingsData);
                }
            })
            .then(function() {
                self.toast('✅ VAT 设置已保存', 'success');
                self.loadVatSettings();
            })
            .catch(function(error) {
                self.toast('❌ 保存失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 发票管理
    // ============================================================

    window.ReportsModule.loadInvoices = function() {
        var self = this;
        AppApi.query('invoices', { order: { by: 'created_at', ascending: false }, limit: 50 })
            .then(function(data) {
                var list = self.el.invoiceList;
                if (!list) return;
                if (!data || data.length === 0) {
                    list.innerHTML = '<div class="text-center text-gray-400 py-4">暂无发票</div>';
                    return;
                }
                var html = '';
                data.forEach(function(inv) {
                    var statusClass = inv.status === 'issued' ? 'text-green-600' : inv.status === 'paid' ? 'text-blue-600' : 'text-gray-400';
                    html += '<div class="flex justify-between items-center p-2 border-b hover:bg-gray-50 cursor-pointer" onclick="ReportsModule.previewInvoice(\'' + inv.id + '\')">';
                    html += '<div><span class="font-medium">#' + inv.invoice_number + '</span>';
                    html += '<span class="text-sm text-gray-400 ml-2">' + inv.issue_date + '</span></div>';
                    html += '<div class="flex items-center gap-3">';
                    html += '<span class="font-bold">' + (inv.total || 0).toFixed(2) + ' SAR</span>';
                    html += '<span class="text-xs ' + statusClass + '">' + inv.status + '</span>';
                    html += '<button onclick="event.stopPropagation();ReportsModule.downloadInvoicePDF(\'' + inv.id + '\')" class="text-blue-600 hover:text-blue-800 text-sm"><i class="fas fa-file-pdf"></i></button>';
                    html += '<button onclick="event.stopPropagation();ReportsModule.printInvoice(\'' + inv.id + '\')" class="text-gray-600 hover:text-gray-800 text-sm"><i class="fas fa-print"></i></button>';
                    html += '</div></div>';
                });
                list.innerHTML = html;
            })
            .catch(function(error) {
                console.error('[Reports] 加载发票失败:', error);
            });
    };

    window.ReportsModule.showCreateInvoice = function() {
        var modal = this.el.invoiceModal;
        if (!modal) return;

        // 加载订单
        var orders = this.getData('allOrders') || [];
        var orderSel = this.el.invoiceOrder;
        if (orderSel) {
            var html = '';
            orders.slice(0, 50).forEach(function(o) {
                html += '<option value="' + o.id + '">#' + (o.order_number || o.id.slice(0, 8)) + ' - ' + (o.total || 0).toFixed(2) + ' SAR</option>';
            });
            orderSel.innerHTML = html || '<option value="">暂无订单</option>';
        }

        // 加载客户
        var customers = this.getData('allCustomers') || [];
        var custSel = this.el.invoiceCustomer;
        if (custSel) {
            var html = '<option value="">散客</option>';
            customers.forEach(function(c) {
                html += '<option value="' + c.id + '">' + c.name + ' (' + c.plate_number + ')</option>';
            });
            custSel.innerHTML = html;
        }

        // 设置默认日期
        if (this.el.invoiceDate) {
            this.el.invoiceDate.value = new Date().toISOString().split('T')[0];
        }

        // 重置金额
        if (this.el.invoiceSubtotal) this.el.invoiceSubtotal.textContent = '0.00 SAR';
        if (this.el.invoiceVat) this.el.invoiceVat.textContent = '0.00 SAR';
        if (this.el.invoiceTotal) this.el.invoiceTotal.textContent = '0.00 SAR';

        modal.classList.remove('hidden');
    };

    window.ReportsModule.closeInvoiceModal = function() {
        var modal = this.el.invoiceModal;
        if (modal) modal.classList.add('hidden');
    };

    window.ReportsModule.generateInvoice = function() {
        var self = this;
        var currentUser = this.getCurrentUser();

        var orderId = this.el.invoiceOrder ? this.el.invoiceOrder.value : '';
        var customerId = this.el.invoiceCustomer ? this.el.invoiceCustomer.value || null : null;
        var date = this.el.invoiceDate ? this.el.invoiceDate.value : new Date().toISOString().split('T')[0];
        var payment = this.el.invoicePayment ? this.el.invoicePayment.value : 'cash';
        var notes = this.el.invoiceNotes ? this.el.invoiceNotes.value.trim() : '';

        if (!orderId) {
            this.toast('请选择订单', 'error');
            return;
        }

        // 获取订单详情
        var orders = this.getData('allOrders');
        var order = orders.find(function(o) { return o.id === orderId; });
        if (!order) {
            this.toast('订单不存在', 'error');
            return;
        }

        var tenant = AppStore.get('currentTenant');
        var store = AppStore.get('currentStore');

        // 获取 VAT 设置
        AppApi.query('vat_settings', { filter: { tenant_id: tenant ? tenant.id : null }, limit: 1 })
            .then(function(settings) {
                var vatRate = (settings && settings.length > 0) ? settings[0].vat_rate || 15 : 15;
                var invoicePrefix = (settings && settings.length > 0) ? settings[0].invoice_prefix || 'INV-' : 'INV-';
                var taxNumber = (settings && settings.length > 0) ? settings[0].tax_number || '' : '';
                var companyName = (settings && settings.length > 0) ? settings[0].company_name || '' : 'CarWash Pro';

                var subtotal = order.amount || 0;
                var vatAmount = subtotal * vatRate / 100;
                var total = subtotal + vatAmount;

                var invoiceData = {
                    order_id: orderId,
                    tenant_id: tenant ? tenant.id : null,
                    store_id: store ? store.id : null,
                    customer_id: customerId,
                    issue_date: date,
                    subtotal: subtotal,
                    vat_rate: vatRate,
                    vat_amount: vatAmount,
                    total: total,
                    payment_method: payment,
                    notes: notes,
                    status: 'issued',
                    created_by: currentUser ? currentUser.id : null,
                    created_at: new Date().toISOString()
                };

                return AppApi.insert('invoices', invoiceData);
            })
            .then(function(result) {
                if (result && result.length > 0) {
                    self.toast('✅ 发票已生成: ' + result[0].invoice_number, 'success');
                    self.closeInvoiceModal();
                    self.loadInvoices();
                }
            })
            .catch(function(error) {
                self.toast('❌ 生成发票失败: ' + error.message, 'error');
            });
    };

    // ============================================================
    // 发票预览
    // ============================================================

    window.ReportsModule.previewInvoice = function(invoiceId) {
        var self = this;
        AppApi.query('invoices', { filter: { id: invoiceId } })
            .then(function(data) {
                if (!data || data.length === 0) {
                    self.toast('发票不存在', 'error');
                    return;
                }
                var invoice = data[0];
                var modal = self.el.invoicePreviewModal;
                var content = self.el.invoicePreviewContent;
                var title = self.el.invoicePreviewTitle;

                if (!modal || !content) return;

                if (title) title.textContent = '🧾 发票 #' + invoice.invoice_number;

                // 查询 VAT 设置获取公司信息
                AppApi.query('vat_settings', { filter: { tenant_id: invoice.tenant_id }, limit: 1 })
                    .then(function(settings) {
                        var companyName = (settings && settings.length > 0) ? settings[0].company_name : 'CarWash Pro';
                        var taxNumber = (settings && settings.length > 0) ? settings[0].tax_number : '';

                        // 生成 ZATCA QR 数据
                        var qrData = companyName + '|' + taxNumber + '|' + invoice.invoice_number + '|' + invoice.total + '|' + invoice.vat_amount;

                        var html = generateInvoiceHTML(invoice, companyName, taxNumber, qrData);
                        content.innerHTML = html;
                        modal.classList.remove('hidden');
                    });

                function generateInvoiceHTML(invoice, companyName, taxNumber, qrData) {
                    return `
                        <div class="text-center border-b pb-4">
                            <h1 class="text-2xl font-bold text-blue-600">CarWash Pro</h1>
                            <p class="text-gray-500">${companyName}</p>
                            <p class="text-gray-500">税号: ${taxNumber}</p>
                        </div>
                        <div class="grid grid-cols-2 gap-4 py-4 border-b">
                            <div>
                                <p class="text-sm text-gray-500">发票号</p>
                                <p class="font-bold">${invoice.invoice_number}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">日期</p>
                                <p>${invoice.issue_date}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">订单号</p>
                                <p>${invoice.order_id ? invoice.order_id.slice(0, 8) : 'N/A'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">支付方式</p>
                                <p>${invoice.payment_method || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="py-4 border-b">
                            <p class="text-sm text-gray-500">备注</p>
                            <p>${invoice.notes || '-'}</p>
                        </div>
                        <div class="py-4">
                            <div class="flex justify-between"><span>小计</span><span>${(invoice.subtotal || 0).toFixed(2)} SAR</span></div>
                            <div class="flex justify-between"><span>增值税 (${invoice.vat_rate || 15}%)</span><span>${(invoice.vat_amount || 0).toFixed(2)} SAR</span></div>
                            <div class="flex justify-between text-xl font-bold text-blue-600 pt-2 border-t"><span>总计</span><span>${(invoice.total || 0).toFixed(2)} SAR</span></div>
                        </div>
                        <div class="text-center pt-4 border-t">
                            <div style="display:inline-block;padding:10px;background:#f8f9fa;border-radius:8px;">
                                <div style="font-size:12px;color:#666;">QR 码 (ZATCA)</div>
                                <div style="font-family:monospace;font-size:10px;color:#333;word-break:break-all;max-width:200px;">${qrData}</div>
                                <div style="font-size:10px;color:#999;margin-top:4px;">✅ ZATCA 合规</div>
                            </div>
                        </div>
                        <div class="text-center text-xs text-gray-400 pt-4 border-t mt-4">
                            <p>感谢您的光临！</p>
                        </div>
                    `;
                }
            })
            .catch(function(error) {
                self.toast('❌ 加载发票失败: ' + error.message, 'error');
            });
    };

    window.ReportsModule.closeInvoicePreview = function() {
        var modal = this.el.invoicePreviewModal;
        if (modal) modal.classList.add('hidden');
    };

    window.ReportsModule.printInvoice = function(invoiceId) {
        var preview = this.el.invoicePreviewContent;
        if (preview) {
            var win = window.open('', '_blank');
            if (win) {
                win.document.write('<html><head><title>发票</title><style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:auto;}</style></head><body>');
                win.document.write(preview.innerHTML);
                win.document.write('</body></html>');
                win.document.close();
                setTimeout(function() { win.print(); }, 500);
            }
        } else {
            this.toast('请先预览发票', 'error');
        }
    };

    window.ReportsModule.downloadInvoicePDF = function(invoiceId) {
        var self = this;
        // 简化版：使用 window.print 保存为 PDF
        var preview = this.el.invoicePreviewContent;
        if (preview) {
            var win = window.open('', '_blank');
            if (win) {
                win.document.write('<html><head><title>发票</title><style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:auto;}</style></head><body>');
                win.document.write(preview.innerHTML);
                win.document.write('</body></html>');
                win.document.close();
                setTimeout(function() { win.print(); }, 500);
            }
        } else {
            // 如果没预览，直接生成
            this.toast('请先预览发票', 'error');
        }
    };

    // ============================================================
    // Credit Note 管理
    // ============================================================

    window.ReportsModule.loadCreditNotes = function() {
        var self = this;
        AppApi.query('credit_notes', { order: { by: 'created_at', ascending: false }, limit: 50 })
            .then(function(data) {
                var list = self.el.creditNoteList;
                if (!list) return;
                if (!data || data.length === 0) {
                    list.innerHTML = '<div class="text-center text-gray-400 py-4">暂无 Credit Note</div>';
                    return;
                }
                var html = '';
                data.forEach(function(cn) {
                    html += '<div class="flex justify-between items-center p-2 border-b hover:bg-gray-50">';
                    html += '<div><span class="font-medium">#' + cn.credit_note_number + '</span>';
                    html += '<span class="text-sm text-gray-400 ml-2">' + (cn.reason || '') + '</span></div>';
                    html += '<div class="flex items-center gap-3">';
                    html += '<span class="font-bold text-red-600">-' + (cn.total || 0).toFixed(2) + ' SAR</span>';
                    html += '<span class="text-xs text-gray-400">' + cn.status + '</span>';
                    html += '</div></div>';
                });
                list.innerHTML = html;
            })
            .catch(function(error) {
                console.error('[Reports] 加载 Credit Note 失败:', error);
            });
    };

    window.ReportsModule.showCreateCreditNote = function() {
        var modal = this.el.creditNoteModal;
        if (!modal) return;

        // 加载已发行的发票
        AppApi.query('invoices', { filter: { status: 'issued' }, order: { by: 'created_at', ascending: false }, limit: 50 })
            .then(function(data) {
                var sel = document.getElementById('creditNoteInvoice');
                if (!sel) return;
                var html = '';
                if (data && data.length > 0) {
                    data.forEach(function(inv) {
                        html += '<option value="' + inv.id + '">#' + inv.invoice_number + ' - ' + (inv.total || 0).toFixed(2) + ' SAR</option>';
                    });
                } else {
                    html = '<option value="">暂无可用发票</option>';
                }
                sel.innerHTML = html;
            });

        if (this.el.creditNoteAmount) this.el.creditNoteAmount.value = '';
        if (this.el.creditNoteDetail) this.el.creditNoteDetail.value = '';

        modal.classList.remove('hidden');
    };

    window.ReportsModule.closeCreditNoteModal = function() {
        var modal = this.el.creditNoteModal;
        if (modal) modal.classList.add('hidden');
    };

    window.ReportsModule.generateCreditNote = function() {
        var self = this;
        var currentUser = this.getCurrentUser();

        var invoiceId = this.el.creditNoteInvoice ? this.el.creditNoteInvoice.value : '';
        var amount = this.el.creditNoteAmount ? parseFloat(this.el.creditNoteAmount.value) || 0 : 0;
        var reason = this.el.creditNoteReason ? this.el.creditNoteReason.value : 'other';
        var detail = this.el.creditNoteDetail ? this.el.creditNoteDetail.value.trim() : '';

        if (!invoiceId) {
            this.toast('请选择关联发票', 'error');
            return;
        }
        if (amount <= 0) {
            this.toast('请输入有效金额', 'error');
            return;
        }

        // 获取发票信息
        AppApi.query('invoices', { filter: { id: invoiceId } })
            .then(function(data) {
                if (!data || data.length === 0) {
                    self.toast('发票不存在', 'error');
                    return;
                }
                var invoice = data[0];
                var tenant = AppStore.get('currentTenant');

                // 计算 VAT
                var vatRate = invoice.vat_rate || 15;
                var vatAmount = amount * vatRate / 100;
                var total = amount + vatAmount;

                // 生成 Credit Note 编号
                var cnNumber = 'CN-' + Date.now().toString().slice(-8);

                var cnData = {
                    credit_note_number: cnNumber,
                    invoice_id: invoiceId,
                    tenant_id: tenant ? tenant.id : null,
                    customer_id: invoice.customer_id,
                    original_invoice_total: invoice.total || 0,
                    credit_amount: amount,
                    vat_amount: vatAmount,
                    total: total,
                    reason: reason,
                    reason_detail: detail,
                    status: 'issued',
                    created_by: currentUser ? currentUser.id : null,
                    created_at: new Date().toISOString()
                };

                return AppApi.insert('credit_notes', cnData);
            })
            .then(function(result) {
                if (result && result.length > 0) {
                    self.toast('✅ Credit Note 已生成: ' + result[0].credit_note_number, 'success');
                    self.closeCreditNoteModal();
                    self.loadCreditNotes();
                }
            })
            .catch(function(error) {
                self.toast('❌ 生成失败: ' + error.message, 'error');
            });
    };

    console.log('[Reports] 模块已注册');
})();