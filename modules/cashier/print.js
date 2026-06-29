/**
 * print.js - 收银台打印功能
 * 小票 + ZATCA标准税务发票
 */

// ===== 小票打印 =====
window.CashierModule.printReceipt = function() {
    this.closePrintOptions();

    var self = this;
    requestAnimationFrame(function() {
        setTimeout(function() {
            self._generateReceipt();
        }, 50);
    });
};

window.CashierModule._generateReceipt = function() {
    var cart = this.cart || [];
    var customer = this.selectedCustomer || {};
    var total = this.el.cartTotal ? this.el.cartTotal.textContent : '0 SAR';

    var config = AppStore.get('config') || {};
    var shopName = config.shopName || 'Car Wash Pro';
    var taxId = config.shopTaxId || 'N/A';
    var address = config.shopAddress || '';
    var phone = config.shopPhone || '';

    var now = new Date();
    var dateStr = now.toLocaleDateString('zh-CN');
    var timeStr = now.toLocaleTimeString('zh-CN');
    var orderNumber = 'RCP-' + Date.now().toString().slice(-8);

    var win = window.open('', '_blank', 'width=350,height=600');
    if (!win) {
        this.toast('请允许弹窗', 'error');
        return;
    }

    // 生成商品列表HTML
    var itemsHtml = '';
    cart.forEach(function(item) {
        var totalPrice = item.price * item.qty;
        itemsHtml += '<div class="row"><span>' + item.icon + ' ' + item.name + ' ×' + item.qty + '</span><span>' + totalPrice.toFixed(2) + '</span></div>';
    });

    var html = '<!DOCTYPE html><html><head><title>小票</title><style>' +
        'body { font-family: "Courier New", monospace; padding: 8px; max-width: 280px; margin: auto; font-size: 11px; }' +
        '.center { text-align: center; }' +
        '.header { font-size: 16px; font-weight: bold; }' +
        '.line { border-top: 1px dashed #999; margin: 6px 0; }' +
        '.double-line { border-top: 2px solid #000; margin: 6px 0; }' +
        '.row { display: flex; justify-content: space-between; padding: 1px 0; }' +
        '.total { font-size: 18px; font-weight: bold; }' +
        '.footer { font-size: 9px; color: #666; margin-top: 6px; }' +
        '.small { font-size: 9px; }' +
        '.qr { text-align: center; margin: 6px 0; }' +
        '@media print { body { padding: 4px; } }' +
        '</style></head><body>' +
        '<div class="center">' +
        '<div class="header">🧼 ' + shopName + '</div>' +
        '<div class="small">' + address + '</div>' +
        '<div class="small">📞 ' + phone + '</div>' +
        '<div class="small">VAT: ' + taxId + '</div>' +
        '<div class="line"></div>' +
        '<div class="row"><span>日期</span><span>' + dateStr + ' ' + timeStr + '</span></div>' +
        '<div class="row"><span>单号</span><span>' + orderNumber + '</span></div>' +
        '<div class="row"><span>车牌</span><span><strong>' + (customer.plate_number || 'GUEST') + '</strong></span></div>' +
        '<div class="line"></div>' +
        itemsHtml +
        '<div class="double-line"></div>' +
        '<div class="row total"><span>总计</span><span>' + total + '</span></div>' +
        '<div class="line"></div>' +
        '<div class="row"><span>支付</span><span>' + (this.selectedPayment || '现金') + '</span></div>' +
        '<div class="line"></div>' +
        '<div class="center" style="font-size:13px;">✅ 感谢光临！</div>' +
        '<div class="footer center">' + (config.receiptFooter || '欢迎再次光临') + '</div>' +
        '</div>' +
        '<script>setTimeout(function(){ window.print(); }, 500);<\/script>' +
        '</body></html>';

    win.document.write(html);
    win.document.close();
};

// ===== ZATCA标准税务发票 =====
window.CashierModule.printTaxInvoice = function() {
    this.closePrintOptions();

    var self = this;
    requestAnimationFrame(function() {
        setTimeout(function() {
            self._generateTaxInvoice();
        }, 50);
    });
};

window.CashierModule._generateTaxInvoice = function() {
    var cart = this.cart || [];
    var customer = this.selectedCustomer || {};
    var total = this.el.cartTotal ? this.el.cartTotal.textContent : '0 SAR';

    var config = AppStore.get('config') || {};
    var shopNameAr = config.companyNameAr || 'شركة الخدمات البترولية';
    var shopNameEn = config.companyNameEn || 'Petroleum Services Co.';
    var taxId = config.vatNumber || config.shopTaxId || '300056462300003';
    var address = config.companyAddress || config.shopAddress || 'الرياض، النيسيم الشرقى';
    var phone = config.companyPhone || config.shopPhone || '920002667';
    var crNumber = config.crNumber || '4030571509';

    var now = new Date();
    var dateStr = now.getFullYear() + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + String(now.getDate()).padStart(2, '0');
    var timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    var invoiceNumber = 'INV-' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + String(Date.now()).slice(-6);

    var subtotal = cart.reduce(function(sum, item) { return sum + (item.price * item.qty); }, 0);
    var discount = this._couponDiscount || 0;
    var vatRate = 15;
    var vatAmount = (subtotal - discount) * vatRate / 100;
    var totalAmount = subtotal - discount + vatAmount;

    // 生成商品列表HTML
    var itemsHtml = '';
    cart.forEach(function(item, index) {
        var totalPrice = item.price * item.qty;
        itemsHtml += '<tr>' +
            '<td>' + (index + 1) + '</td>' +
            '<td>' + item.name + '</td>' +
            '<td>' + item.qty + '</td>' +
            '<td>' + item.price.toFixed(2) + ' SAR</td>' +
            '<td>0.00 SAR</td>' +
            '<td>15%</td>' +
            '<td>' + (totalPrice * vatRate / 100).toFixed(2) + ' SAR</td>' +
            '<td>' + totalPrice.toFixed(2) + ' SAR</td>' +
            '</tr>';
    });

    var win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) {
        this.toast('请允许弹窗', 'error');
        return;
    }

    var html = '<!DOCTYPE html><html dir="rtl" lang="ar"><head><title>فاتورة ضريبية</title><style>' +
        'body { font-family: "Times New Roman", Arial, sans-serif; padding: 30px; max-width: 900px; margin: auto; background: #f5f5f5; }' +
        '.invoice { background: white; padding: 35px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }' +
        '.header { text-align: center; border-bottom: 3px solid #1a3a6b; padding-bottom: 15px; margin-bottom: 20px; }' +
        '.shop-name-ar { font-size: 26px; font-weight: bold; color: #1a3a6b; }' +
        '.shop-name-en { font-size: 16px; color: #666; }' +
        '.shop-details { font-size: 12px; color: #555; margin-top: 3px; }' +
        '.title { text-align: center; font-size: 22px; font-weight: bold; background: #f0f4f9; padding: 10px; margin: 10px 0; border-radius: 6px; }' +
        '.title-en { text-align: center; font-size: 14px; color: #666; margin-bottom: 15px; }' +
        '.info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px 20px; font-size: 12px; margin: 10px 0; padding: 12px; background: #f8fafc; border-radius: 6px; }' +
        '.info-grid .label { font-weight: bold; color: #333; }' +
        '.table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }' +
        '.table th { background: #1a3a6b; color: white; padding: 8px 6px; text-align: center; font-size: 11px; }' +
        '.table td { padding: 6px; text-align: center; border-bottom: 1px solid #eee; }' +
        '.table .total-row { font-weight: bold; background: #f9f9f9; }' +
        '.totals { width: 55%; margin-right: auto; margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 6px; }' +
        '.totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }' +
        '.totals .grand-total { font-size: 20px; font-weight: bold; color: #1a3a6b; border-top: 2px solid #1a3a6b; padding-top: 8px; margin-top: 4px; }' +
        '.footer { margin-top: 20px; font-size: 11px; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; color: #666; }' +
        '.declaration { font-size: 11px; text-align: justify; margin-top: 15px; padding: 12px; background: #f9f9f9; border-radius: 6px; border-right: 3px solid #1a3a6b; }' +
        '.signature { display: flex; justify-content: space-between; margin-top: 20px; font-size: 12px; }' +
        '.signature div { border-top: 1px solid #999; padding-top: 5px; min-width: 150px; }' +
        '@media print { body { padding: 10px; background: white; } .invoice { box-shadow: none; } }' +
        '.qr-section { text-align: center; margin: 10px 0; }' +
        '</style></head><body>' +
        '<div class="invoice">' +
        // Header
        '<div class="header">' +
        '<div class="shop-name-ar">🧼 ' + shopNameAr + '</div>' +
        '<div class="shop-name-en">' + shopNameEn + '</div>' +
        '<div class="shop-details">' + address + ' | 📞 ' + phone + '</div>' +
        '<div class="shop-details">الرقم الضريبي: ' + taxId + ' | سجل تجاري: ' + crNumber + '</div>' +
        '</div>' +
        // Title
        '<div class="title">فاتورة ضريبية مبسطة</div>' +
        '<div class="title-en">Simplified Tax Invoice</div>' +
        // Info
        '<div class="info-grid">' +
        '<div><span class="label">رقم الفاتورة:</span> ' + invoiceNumber + '</div>' +
        '<div><span class="label">التاريخ:</span> ' + dateStr + ' ' + timeStr + '</div>' +
        '<div><span class="label">نوع الدفع:</span> ' + (this.selectedPayment || 'نقدي') + '</div>' +
        '<div><span class="label">رقم اللوحة:</span> ' + (customer.plate_number || '-') + '</div>' +
        '<div><span class="label">المستفيد:</span> ' + (customer.name || 'عميل عام') + '</div>' +
        '<div><span class="label">الموظف:</span> ' + (AppStore.get('currentUser')?.name || '-') + '</div>' +
        '</div>' +
        // Items Table
        '<table class="table">' +
        '<thead><tr>' +
        '<th>#</th><th>المنتج / الخدمة</th><th>الكمية</th><th>السعر</th>' +
        '<th>الخصم</th><th>نسبة الضريبة</th><th>الضريبة</th><th>الإجمالي</th>' +
        '</tr></thead>' +
        '<tbody>' + itemsHtml + '</tbody></table>' +
        // Totals
        '<div class="totals">' +
        '<div class="row"><span>المبلغ غير شامل الضريبة</span><span>' + (subtotal - discount).toFixed(2) + ' SAR</span></div>' +
        (discount > 0 ? '<div class="row"><span>الخصم</span><span>' + discount.toFixed(2) + ' SAR</span></div>' : '') +
        '<div class="row"><span>ضريبة القيمة المضافة (15%)</span><span>' + vatAmount.toFixed(2) + ' SAR</span></div>' +
        '<div class="row grand-total"><span>المبلغ شامل الضريبة</span><span>' + totalAmount.toFixed(2) + ' SAR</span></div>' +
        '</div>' +
        // Declaration
        '<div class="declaration">' +
        'أقر أنا الموقع على هذه الفاتورة إنني استلمت كافة البضاعة المدونة بها بحالة سليمة وإنني سأقوم بسداد قيمتها وفي حالة عدم السداد تعتبر هذه الورقة تجارية واجبة الدفع' +
        '<br><br>I confirm that I have received all the goods listed above in good condition and will pay the full amount.' +
        '</div>' +
        // Signature
        '<div class="signature">' +
        '<div>اسم المستلم: _________________</div>' +
        '<div>اسم البائع: _________________</div>' +
        '</div>' +
        // Footer
        '<div class="footer">' +
        (config.invoiceFooter || 'شكراً لتعاملكم معنا - Thank you for your business') +
        '<br>📍 ' + address + ' | 📞 ' + phone +
        '</div>' +
        '</div>' +
        '<script>setTimeout(function(){ window.print(); }, 800);<\/script>' +
        '</body></html>';

    win.document.write(html);
    win.document.close();
};