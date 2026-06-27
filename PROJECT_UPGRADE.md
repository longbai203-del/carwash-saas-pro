# CarWash SaaS Pro 商业版升级任务（禁止推倒重写）

你现在是拥有15年以上经验的软件架构师、SaaS产品经理、全栈工程师。

请阅读整个项目后再开始开发。

---

## 当前判断

结合目前项目路径：

HTML 单文件 -> React + Vite -> Supabase -> Vercel 部署

以及对 `carwash-saas-pro.vercel.app` 的分析，目前项目并不是缺少功能，而是缺少工程化和商业化。

目前项目大概处于：

> 商业 SaaS 完成度约 45%~55%
>
> - UI：★★★★☆
> - 前端功能：★★★☆☆
> - 后端：★★☆☆☆
> - 数据库：★★★☆☆
> - 权限：★☆☆☆☆
> - 财务：★☆☆☆☆
> - 多门店：☆☆☆☆☆
> - SaaS：☆☆☆☆☆

也就是说：

> 已经不是 Demo。
> 但是还远远不是可以收费的软件。

---

## 第一原则（必须遵守）

禁止：

- 删除已有页面
- 删除已有组件
- 删除已有数据库
- 删除已有API
- 修改现有UI风格
- 修改整体目录结构
- 推倒重写

只能：

- 补充
- 完善
- 修复
- 新增

保持现有页面100%兼容。

---

## 项目定位

将目前项目升级成为：

商业级 SaaS 洗车店管理系统

参考：

- Rewaa
- Square POS
- Lightspeed
- Zoho Inventory
- Shopify POS
- Odoo POS

但必须保持当前项目UI风格。

---

## 技术栈保持不变

Frontend：

- React
- Vite
- TailwindCSS
- React Router
- Axios

Backend：

- FastAPI
- Supabase
- PostgreSQL
- JWT
- Redis

部署：

- Vercel
- Render
- Supabase

禁止更换框架。

---

## 第一阶段：工程化

必须检查：

- 整个项目
- 删除死代码
- 删除重复组件
- 删除重复CSS
- 删除重复API
- 删除重复Model
- 删除重复Hook
- 删除重复Utils
- 删除重复Images
- 删除重复配置
- 删除无引用文件

统一：

- Import
- Alias
- 路径
- 命名
- ESLint
- Prettier
- Type规范

---

## 第二阶段：数据库

重新设计数据库。

要求建立完整关系：

- 用户
- 员工
- 门店
- 角色
- 权限
- 供应商
- 客户
- 库存
- SKU
- 商品分类
- 采购
- 采购入库
- 销售
- 订单
- 订单详情
- 库存流水
- 调拨
- 盘点
- 损耗
- 会员
- 积分
- 优惠券
- 财务
- VAT
- 成本
- 利润
- 应收
- 应付
- 流水
- 审批
- 审计日志
- 通知
- 系统配置
- SaaS租户

---

## 第三阶段：RBAC权限

支持角色：

- 老板
- 管理员
- 店长
- 财务
- 采购
- 仓库
- 员工
- 技师
- 前台
- 客服

每一个菜单、按钮、API、数据，全部权限控制。

---

## 第四阶段：登录

支持：

- Supabase Auth
- 邮箱登录
- 手机号登录
- 验证码登录
- Google
- Apple
- Remember Me
- Forgot Password
- Session
- JWT Refresh
- 自动续期
- 设备管理
- 登录日志

---

## 第五阶段：员工

支持：

- 员工档案
- 排班
- 请假
- 考勤
- 打卡
- GPS
- 照片
- 绩效
- 工资
- 提成
- 奖金
- 处罚
- 员工消息
- 员工App首页

---

## 第六阶段：客户CRM

支持：

- 客户
- 车辆
- VIN
- 车型
- 洗车历史
- 消费记录
- 积分
- 优惠券
- 充值
- 储值卡
- 会员等级
- 推荐奖励
- 生日提醒
- 短信
- WhatsApp
- Email

---

## 第七阶段：库存

支持：

- SKU
- 二维码
- 条码
- 批次
- 库存预警
- 库存流水
- 盘点
- 调拨
- 损耗
- 采购
- 采购审批
- 供应商管理
- 自动生成采购建议

---

## 第八阶段：POS

支持：

- 扫码
- 会员识别
- 现金
- 银行卡
- Apple Pay
- Google Pay
- STC Pay
- Tabby
- Tamara
- 部分付款
- 挂单
- 退款
- 小票打印
- 电子小票

---

## 第九阶段：财务

支持：

- 收入
- 支出
- 利润
- 成本
- VAT
- Saudi VAT
- Invoice
- Expense
- Cash Flow
- Profit Loss
- Balance Sheet
- 自动生成报表

---

## 第十阶段：沙特本地化

必须兼容：

- Arabic RTL
- English
- Chinese
- 三语言
- Hijri
- Gregorian
- Saudi VAT
- Saudi Invoice
- CR
- ZATCA
- SADAD
- Mada
- STC Pay

---

## 第十一阶段：数据分析

支持：

- Dashboard
- 今日营业额
- 本月营业额
- 利润
- 客流
- 复购率
- 员工绩效
- 库存价值
- 热销商品
- 排行榜
- AI预测
- 经营建议
- 全部图表

---

## 第十二阶段：SaaS

真正支持：

- 多租户
- 无限门店
- 独立数据库
- 独立Logo
- 独立域名
- 独立权限
- 套餐
- 试用
- 订阅
- Stripe
- Webhook
- 自动续费
- 后台运营平台
- 超级管理员

---

## 第十三阶段：系统设置

支持：

- Logo
- 主题
- 颜色
- 营业时间
- 打印模板
- 短信
- 邮件
- WhatsApp
- 备份
- 恢复
- 导入
- 导出
- 系统日志
- API Key

---

## 第十四阶段：性能

所有接口支持：

- 分页
- 缓存
- Redis
- Lazy Load
- Code Split
- Virtual List
- 图片压缩
- 数据库索引
- API优化
- SSR兼容

---

## 第十五阶段：安全

支持：

- JWT
- Refresh Token
- RBAC
- SQL Injection 防护
- XSS 防护
- CSRF 防护
- Rate Limit
- Audit Log
- 敏感数据加密
- 操作日志

---

## 第十六阶段：部署

自动：

- GitHub Push
- GitHub Action
- Vercel
- Render
- Supabase Migration
- 自动部署

---

## 第十七阶段：测试

自动生成：

- 单元测试
- 接口测试
- E2E
- 压力测试
- 错误日志
- 自动修复建议

---

## 第十八阶段：AI

集成：

- OpenAI
- 库存预测
- 营业预测
- 客户分析
- 智能采购
- 自动报价
- AI客服
- AI运营建议

---

## 开发规范

每完成一个阶段必须：

1. 修复所有Bug
2. 编译成功
3. `npm run build` 无错误
4. 后端启动成功
5. 数据库迁移成功
6. Git Commit
7. 自动生成CHANGELOG
8. 输出测试报告
9. 再进入下一阶段

严禁一次完成全部。

必须：

- 阶段开发
- 阶段测试
- 阶段提交
- 阶段部署
- 保持系统始终可运行

---

## 推荐开发优先级

如果目标是自己店里长期使用，未来还能卖给其他洗车店，优先做真正影响日常运营的功能，而不是一开始就做 AI 或复杂 SaaS。

建议按下面的优先级推进：

1. 系统稳定化：修复所有 Bug、统一项目结构、完善数据库。
2. 员工与权限：登录、角色、考勤、提成、操作权限。
3. POS 与库存：收银、库存、采购、盘点。
4. 财务与 VAT：利润、成本、发票、税务报表。
5. 客户 CRM：会员、积分、储值、营销。
6. 多门店管理：统一后台、跨门店数据。
7. SaaS 多租户：支持多个客户独立使用。
8. AI 功能：经营分析、库存预测、智能采购建议。

按这个顺序开发，系统在前几阶段就能稳定用于门店，后续再逐步升级为真正符合商业 SaaS 标准的产品，而不会因为一次性增加大量功能导致项目变得难以维护。
