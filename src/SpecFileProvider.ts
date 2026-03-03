import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { SpecJson, SpecFile, SpecMeta } from './types';

// ── Template type system ──────────────────────────────────────────────────────

export type SpecTemplateType = 'web' | 'desktop' | 'windows' | 'embedded';

export const SPEC_TEMPLATE_LABELS: Record<SpecTemplateType, string> = {
  web:      'Web 应用',
  desktop:  '桌面应用（跨平台）',
  windows:  'Windows 应用',
  embedded: '嵌入式软件',
};

// ── Templates ─────────────────────────────────────────────────────────────────

const WEB_APP_TEMPLATE = (title: string): string => `# ${title}

## 一、项目概述

**名称**：（软件系统的完整名称）

**简称**：（项目代号或缩写，用于文档标识）

**软件类型**：Web 应用

**背景**：（描述项目产生的背景及现存的问题）

**目标**：（描述项目要达成的核心目标）

**用户群体**：（描述主要目标用户及其典型使用场景）

**范围说明**：（明确本规格覆盖的范围和不覆盖的内容）

---

## 二、功能需求

### 2.1 （功能模块名称）

#### FR-001: （功能名称）
（描述该功能的具体行为和预期结果）

**触发条件**：

**主流程**：

**异常处理**：

##### FR-001-01: （子功能名称）
（详细描述该子功能，或该功能在特定场景下的行为细节）

##### FR-001-02: （子功能名称）
（详细描述该子功能，或该功能在特定场景下的行为细节）

### 2.2 （功能模块名称）

#### FR-002: （功能名称）
（描述该功能的具体行为和预期结果）

---

## 三、非功能需求

### 3.1 性能要求

#### NFR-001: 响应时间
- 普通页面加载时间 ≤ 2 秒
- API 响应时间 ≤ 500 ms（P95）
- 首屏渲染时间 ≤ 1.5 秒

#### NFR-002: 并发能力
- 系统支持同时在线用户数：____
- 峰值 QPS：____

### 3.2 可用性与可靠性

#### NFR-003: 系统可用性
- 服务可用率 ≥ 99.9%（月度统计）
- 计划维护窗口：每周 ____，持续时间不超过 ____

#### NFR-004: 容错与恢复
- 单点故障不影响整体服务（关键路径冗余）
- 故障恢复时间目标（RTO）≤ 30 分钟
- 数据恢复点目标（RPO）≤ 1 小时

### 3.3 安全性要求

#### NFR-005: 身份认证与授权
- 用户认证机制：（例：JWT / OAuth 2.0 / Session）
- 细粒度权限控制（RBAC）
- 敏感操作需二次验证

#### NFR-006: 数据安全
- 传输层使用 HTTPS / TLS 1.2+
- 敏感数据（密码、支付信息等）加密存储
- 定期数据备份策略

#### NFR-007: 安全审计
- 关键操作日志留存 ≥ 180 天
- 异常访问告警机制

### 3.4 可扩展性与可维护性

#### NFR-008: 横向扩展
- 支持水平扩展，增加节点无需停机
- 无状态服务设计，支持负载均衡

#### NFR-009: 可维护性
- 代码测试覆盖率 ≥ 80%
- 关键模块文档完整
- 接口变更向后兼容

### 3.5 兼容性要求

#### NFR-010: 浏览器 / 客户端兼容性
- （Web）Chrome 90+、Firefox 90+、Safari 14+、Edge 90+
- （移动端）iOS 14+、Android 10+

#### NFR-011: 数据兼容性
- 支持导入 / 导出的文件格式：____
- 历史数据迁移方案：____

---

## 四、设计要求

### 4.1 技术选型

#### DR-001: 前端技术栈
- 框架：（例：React 18 / Vue 3 / Angular）
- 状态管理：
- 构建工具：
- UI 组件库：

#### DR-002: 后端技术栈
- 语言 / 框架：（例：Node.js/Express、Python/FastAPI、Go/Gin）
- 运行时环境：
- 主要依赖库：

#### DR-003: 数据存储
- 主数据库：（例：PostgreSQL、MySQL、MongoDB）
- 缓存：（例：Redis）
- 搜索引擎：（例：Elasticsearch，如需）
- 对象存储：（例：S3、OSS，如需）

#### DR-004: 基础设施与部署
- 云平台 / 托管：（例：AWS、阿里云、自建）
- 容器化：（例：Docker + Kubernetes）
- CI/CD：（例：GitHub Actions、Jenkins）

### 4.2 系统架构

#### DR-005: 整体架构风格
（描述架构模式，例：前后端分离单体、微服务、Serverless 等，并说明选型理由）

#### DR-006: 关键架构决策
- 决策 1：（例：选择微服务 vs 单体的原因）
- 决策 2：（例：同步 vs 异步通信的选择）
- 决策 3：（例：数据一致性策略）

### 4.3 模块设计

#### DR-007: 模块划分

| 模块名 | 职责描述 | 对外接口 |
|--------|----------|----------|
| （模块 A） | （职责） | （接口列表） |
| （模块 B） | （职责） | （接口列表） |

#### DR-008: 核心数据流
（描述核心业务场景下数据的流转路径，例：用户请求 → API 网关 → 业务服务 → 数据库）

### 4.4 数据设计

#### DR-009: 核心数据模型
（描述主要实体及其关系）

| 实体名 | 关键字段 | 与其他实体关系 |
|--------|----------|----------------|
| （实体 A） | id, name, ... | 一对多 → 实体 B |

#### DR-010: 数据存储策略
- 热数据与冷数据分离方案：
- 数据归档策略：
- 数据一致性保证方式：（强一致 / 最终一致）

### 4.5 接口规范

#### DR-011: API 设计规范
- 风格：（例：RESTful / GraphQL / gRPC）
- 版本控制：（例：URL 路径版本 /api/v1/）
- 认证方式：
- 统一错误码规范：

#### DR-012: 第三方集成

| 服务名 | 用途 | 集成方式 |
|--------|------|----------|
| （服务 A） | （用途） | （SDK / Webhook / API） |

### 4.6 部署与运维

#### DR-013: 运行环境要求
- 最低硬件配置：CPU ____，内存 ____，磁盘 ____
- 操作系统：
- 网络带宽要求：

#### DR-014: 监控与告警
- 指标监控：（例：Prometheus + Grafana）
- 日志收集：（例：ELK、Loki）
- 告警通道：（例：钉钉、邮件、PagerDuty）
- 关键告警阈值：（CPU > 80%、错误率 > 1%、P99 延迟 > 2s）

#### DR-015: 灾备方案
- 备份频率与存储位置：
- 故障切换流程：
- 演练计划：

---

## 五、界面要求

### 5.1 视觉规范

#### UIR-001: 整体视觉风格
- 风格定位：（例：简洁商务 / 活泼消费 / 专业工具）
- 主色调：
- 辅助色：
- 字体规范：
- 图标风格：

#### UIR-002: 设计系统
- 使用的设计系统 / 组件库：（例：Ant Design、Material Design、自定义）
- 设计稿工具：（例：Figma、Sketch）
- 设计稿链接：（待补充）

### 5.2 交互规范

#### UIR-003: 通用交互准则
- 操作反馈：所有用户操作需在 300 ms 内给予视觉反馈
- 加载状态：超过 500 ms 的操作需显示加载指示器
- 错误提示：需友好、可操作（告知原因与解决方法）
- 空状态：列表 / 内容区为空时需有引导性提示

#### UIR-004: 表单设计规范
- 验证时机：（实时验证 / 提交时验证）
- 必填字段标注方式：
- 输入格式提示与示例：

#### UIR-005: 响应式与多端适配
- 断点规范：移动端 < 768px，平板 768–1024px，桌面 > 1024px
- 优先级：（移动端优先 / 桌面优先）
- 特殊移动端交互（手势、底部导航等）：

### 5.3 关键页面与流程

#### UIR-006: 核心用户流程

**流程 1：（流程名称）**
步骤 1 → 步骤 2 → 步骤 3 → 预期结果

**流程 2：（流程名称）**
步骤 1 → 步骤 2 → 预期结果

#### UIR-007: 页面清单

| 页面名 | 路由 / 入口 | 核心功能 | 优先级 |
|--------|------------|----------|--------|
| （页面 A） | /path | （功能） | P0 |
| （页面 B） | /path | （功能） | P1 |

---

## 六、约束条件

### 6.1 技术约束
- （例：必须复用现有 xxx 基础设施）
- （例：不能使用 GPL 许可的第三方库）

### 6.2 合规约束
- （例：需符合 GDPR / 个人信息保护法 / 等保三级）
- （例：金融类需满足 PCI DSS）

### 6.3 资源约束
- 开发团队规模：
- 预算上限：
- 关键里程碑与交付日期：

---

## 七、验收标准

### 7.1 功能验收
- 所有 FR 条目对应测试用例通过率 100%
- 关键业务流程 E2E 测试全部通过

### 7.2 性能验收
- 压测报告满足第三章各项性能指标
- 无内存泄漏，无明显性能退化

### 7.3 安全验收
- 通过基础安全扫描（OWASP Top 10 无高危漏洞）
- 权限边界测试通过

### 7.4 交付物清单
- [ ] 源代码（含单元测试）
- [ ] 部署文档
- [ ] API 文档
- [ ] 数据库 Schema 及迁移脚本
- [ ] 用户手册（如需）
`;

// ── Desktop App (cross-platform) ──────────────────────────────────────────────

const DESKTOP_APP_TEMPLATE = (title: string): string => `# ${title}

## 一、项目概述

**名称**：（软件系统的完整名称）

**简称**：（项目代号或缩写，用于文档标识）

**软件类型**：桌面应用（跨平台）

**支持平台**：（Windows / macOS / Linux）

**背景**：

**目标**：

**用户群体**：

**范围说明**：

---

## 二、功能需求

### 2.1 （功能模块名称）

#### FR-001: （功能名称）
（描述该功能的具体行为和预期结果）

**触发条件**：

**主流程**：

**异常处理**：

##### FR-001-01: （子功能名称）
（详细描述该子功能，或该功能在特定场景下的行为细节）

### 2.2 （功能模块名称）

#### FR-002: （功能名称）
（描述该功能的具体行为和预期结果）

---

## 三、非功能需求

### 3.1 性能要求

#### NFR-001: 启动性能
- 冷启动时间 ≤ 3 秒
- 热启动时间 ≤ 1 秒

#### NFR-002: 资源占用
- 空闲内存占用 ≤ ____ MB
- CPU 占用（空闲时）≤ ____%

### 3.2 兼容性

#### NFR-003: 平台兼容性
- Windows：10 / 11（x64）
- macOS：12+（Intel / Apple Silicon）
- Linux：Ubuntu 20.04+

#### NFR-004: 显示适配
- 支持 HiDPI / Retina 屏幕
- 最低分辨率：1280 × 720

### 3.3 可靠性

#### NFR-005: 稳定性
- 7 日崩溃率 ≤ 0.1%
- 自动保存与会话恢复

### 3.4 安全性

#### NFR-006: 本地数据保护
- 敏感数据使用系统密钥链加密（Keychain / Credential Manager）
- 自动更新包签名验证

---

## 四、设计要求

### 4.1 技术选型

#### DR-001: 应用框架
- 框架：（例：Electron / Tauri / Qt / Flutter Desktop）
- 语言：
- UI 框架：

#### DR-002: 数据存储
- 本地数据库：（例：SQLite / LevelDB）
- 配置格式：（例：JSON / TOML）
- 云同步方案（如需）：

#### DR-003: 打包与分发
- 安装包格式：（例：NSIS / MSI / DMG / AppImage）
- 自动更新方案：（例：electron-updater）
- 代码签名：

### 4.2 系统架构

#### DR-004: 整体架构
（描述主进程 / 渲染进程 / 后台服务的职责划分及通信机制）

#### DR-005: 模块划分

| 模块名 | 职责描述 | 对外接口 |
|--------|----------|----------|
| （模块 A） | （职责） | （接口） |

### 4.3 数据设计

#### DR-006: 本地数据模型
（描述主要数据结构和存储方式）

#### DR-007: 数据同步策略（如需）
- 同步触发机制：
- 冲突解决策略：

---

## 五、界面要求

### 5.1 视觉规范

#### UIR-001: 整体风格
- 风格：（原生系统风格 / 自定义设计语言）
- 主题：（支持深色 / 浅色模式）
- 字体规范：

#### UIR-002: 窗口与布局
- 默认窗口尺寸：____ × ____
- 最小窗口尺寸：____ × ____
- 布局模式：（单窗口 / 多窗口 / MDI）

### 5.2 交互规范

#### UIR-003: 键盘与快捷键
- 常用操作需提供键盘快捷键
- 快捷键规范遵循目标平台惯例（macOS Command / Windows Ctrl）

#### UIR-004: 系统集成
- 系统托盘：（是 / 否）
- 文件关联：（关联扩展名：）
- 右键菜单集成：

### 5.3 关键页面与流程

#### UIR-005: 主界面布局
（描述主窗口的布局结构和功能区划分）

#### UIR-006: 核心用户流程

**流程 1：（流程名称）**
步骤 1 → 步骤 2 → 步骤 3 → 预期结果

---

## 六、约束条件

### 6.1 技术约束
-

### 6.2 合规约束
- 应用商店规范（如需上架 Microsoft Store / Mac App Store）

### 6.3 资源约束
- 开发团队规模：
- 关键里程碑：

---

## 七、验收标准

### 7.1 功能验收
- 所有 FR 条目对应测试用例通过率 100%

### 7.2 性能验收
- 满足第三章各项性能指标

### 7.3 交付物清单
- [ ] 各平台安装包
- [ ] 源代码（含测试）
- [ ] 部署 / 安装文档
- [ ] 用户手册
`;

// ── Windows App ───────────────────────────────────────────────────────────────

const WINDOWS_APP_TEMPLATE = (title: string): string => `# ${title}

## 一、项目概述

**名称**：（软件系统的完整名称）

**简称**：（项目代号或缩写，用于文档标识）

**软件类型**：Windows 应用

**最低 Windows 版本**：（例：Windows 10 1903+）

**背景**：

**目标**：

**用户群体**：

**范围说明**：

---

## 二、功能需求

### 2.1 （功能模块名称）

#### FR-001: （功能名称）
（描述该功能的具体行为和预期结果）

**触发条件**：

**主流程**：

**异常处理**：

##### FR-001-01: （子功能名称）
（详细描述该子功能，或该功能在特定场景下的行为细节）

### 2.2 （功能模块名称）

#### FR-002: （功能名称）
（描述该功能的具体行为和预期结果）

---

## 三、非功能需求

### 3.1 性能要求

#### NFR-001: 启动与响应
- 冷启动时间 ≤ 3 秒
- UI 操作响应时间 ≤ 200 ms

#### NFR-002: 资源占用
- 空闲内存占用 ≤ ____ MB
- 安装包大小 ≤ ____ MB

### 3.2 兼容性

#### NFR-003: Windows 版本兼容
- 目标版本：Windows 10 / 11（x64）
- .NET / C++ 运行时版本依赖：

#### NFR-004: 显示适配
- 支持 DPI 缩放（96 / 120 / 144 / 192 DPI）
- 最低分辨率：1280 × 720

### 3.3 可靠性

#### NFR-005: 稳定性
- 7 日崩溃率 ≤ 0.1%
- 崩溃报告上报机制

### 3.4 安全性

#### NFR-006: 权限与签名
- 代码签名（Authenticode）
- 最小权限原则（UAC 级别：标准用户 / 管理员）
- 敏感数据使用 Windows Credential Manager 或 DPAPI

---

## 四、设计要求

### 4.1 技术选型

#### DR-001: UI 框架
- 框架：（例：WPF / WinForms / WinUI 3 / MAUI）
- 语言：（C# / C++ / VB.NET）
- .NET 版本：

#### DR-002: 数据存储
- 本地存储：（例：SQLite / SQL Server LocalDB / 注册表 / 文件系统）
- 配置存储位置：（%AppData% / %LocalAppData% / 注册表）

#### DR-003: 打包与分发
- 安装包格式：（例：MSIX / MSI / InnoSetup / ClickOnce）
- 更新机制：（例：MSIX 自动更新 / 自定义更新检查）
- 代码签名证书：

### 4.2 系统架构

#### DR-004: 整体架构
（描述 UI 层 / 业务逻辑层 / 数据层的职责划分，例：MVVM / MVP）

#### DR-005: Windows 系统集成

| 集成点 | 说明 |
|--------|------|
| 注册表 | （读写路径及用途） |
| 文件关联 | （关联扩展名） |
| 系统托盘 | （是 / 否） |
| 任务计划 / 服务 | （是 / 否） |
| COM / OLE | （是 / 否） |

### 4.3 数据设计

#### DR-006: 本地数据模型
（描述主要数据结构和存储位置）

---

## 五、界面要求

### 5.1 视觉规范

#### UIR-001: 整体风格
- 设计语言：（Fluent Design / 传统 Win32 风格 / 自定义）
- 主题：（深色 / 浅色 / 跟随系统）

#### UIR-002: 窗口布局
- 主窗口尺寸：____ × ____（默认），____ × ____（最小）
- 菜单结构：（菜单栏 / Ribbon / 上下文菜单）

### 5.2 交互规范

#### UIR-003: 键盘快捷键
- 遵循 Windows 标准键盘快捷键规范
- 自定义快捷键列表：

#### UIR-004: 辅助功能（Accessibility）
- 支持 Windows 讲述人（Screen Reader）
- 支持高对比度模式
- 所有控件支持键盘导航

### 5.3 关键页面与流程

#### UIR-005: 主界面布局
（描述主窗口的功能区划分）

#### UIR-006: 核心用户流程

**流程 1：（流程名称）**
步骤 1 → 步骤 2 → 步骤 3 → 预期结果

---

## 六、约束条件

### 6.1 技术约束
-

### 6.2 合规约束
- Microsoft Store 审核规范（如需上架）
- 企业部署策略（ADMX / GPO，如需）

### 6.3 资源约束
- 开发团队规模：
- 关键里程碑：

---

## 七、验收标准

### 7.1 功能验收
- 所有 FR 条目对应测试用例通过率 100%

### 7.2 性能验收
- 满足第三章各项性能指标

### 7.3 交付物清单
- [ ] 安装包（MSIX / MSI）
- [ ] 源代码（含测试）
- [ ] 安装 / 部署文档
- [ ] 用户手册
`;

// ── Embedded Software ─────────────────────────────────────────────────────────

const EMBEDDED_APP_TEMPLATE = (title: string): string => `# ${title}

## 一、项目概述

**名称**：（软件系统的完整名称）

**简称**：（项目代号或缩写，用于文档标识）

**软件类型**：嵌入式软件

**目标硬件平台**：（MCU/CPU 型号，例：STM32F4 / ESP32 / i.MX8）

**操作系统 / 运行环境**：（例：裸机 / FreeRTOS / Linux / Zephyr）

**背景**：

**目标**：

**用户群体**：（使用该嵌入式设备的终端用户 / 维护人员）

**范围说明**：

---

## 二、功能需求

### 2.1 （功能模块名称）

#### FR-001: （功能名称）
（描述该功能的具体行为和预期结果）

**触发条件**：

**主流程**：

**异常处理**：

##### FR-001-01: （子功能名称）
（详细描述该子功能，或该功能在特定场景下的行为细节）

### 2.2 （功能模块名称）

#### FR-002: （功能名称）
（描述该功能的具体行为和预期结果）

---

## 三、非功能需求

### 3.1 实时性要求

#### NFR-001: 任务响应时间
- 关键中断响应时间 ≤ ____ μs
- 控制周期 ≤ ____ ms
- 最坏情况执行时间（WCET）：____

#### NFR-002: 时间确定性
- 系统调度抖动 ≤ ____ μs
- 实时性等级：（硬实时 / 软实时）

### 3.2 资源约束

#### NFR-003: 存储资源
- Flash / ROM 使用上限：____ KB（总 ____ KB，占用率 ≤ ____%）
- RAM 使用上限：____ KB（总 ____ KB，占用率 ≤ ____%）
- 堆栈深度最大值：____ Bytes

#### NFR-004: 功耗要求
- 正常运行功耗 ≤ ____ mW
- 低功耗模式功耗 ≤ ____ μW
- 电池续航（如适用）≥ ____ 小时

### 3.3 可靠性与安全

#### NFR-005: 系统可靠性
- MTBF ≥ ____ 小时
- 看门狗超时恢复机制
- 掉电保护与数据完整性

#### NFR-006: 功能安全（如适用）
- 安全等级目标：（SIL / ASIL 等级）
- 故障检测覆盖率 ≥ ____%

#### NFR-007: 信息安全（如适用）
- 固件加密与签名验证
- 安全启动（Secure Boot）
- 通信加密：

### 3.4 环境适应性

#### NFR-008: 工作环境
- 工作温度范围：____ ~ ____°C
- 存储温度范围：____ ~ ____°C
- 湿度范围：
- 振动 / 冲击等级：（如适用）

#### NFR-009: EMC 要求
- 满足标准：（例：IEC 61000 / FCC Part 15 / CE）

---

## 四、设计要求

### 4.1 硬件平台

#### DR-001: 处理器与内存
- CPU / MCU：型号、主频、核数
- RAM：类型、容量、速率
- Flash / ROM：类型、容量
- 外部存储（如需）：

#### DR-002: 通信接口

| 接口 | 协议 | 速率 | 用途 |
|------|------|------|------|
| UART | | | |
| SPI | | | |
| I2C | | | |
| CAN | | | |
| Ethernet / Wi-Fi | | | |

#### DR-003: 外设与传感器

| 外设 / 传感器 | 接口 | 精度 / 规格 | 用途 |
|--------------|------|------------|------|
| | | | |

### 4.2 软件架构

#### DR-004: 整体软件架构
（描述 BSP / HAL / 中间件 / 应用层的分层结构）

#### DR-005: 任务 / 线程划分（RTOS 适用）

| 任务名 | 优先级 | 周期 / 触发方式 | 堆栈大小 | 职责 |
|--------|--------|----------------|----------|------|
| | | | | |

#### DR-006: 中断设计

| 中断源 | 优先级 | 响应时间要求 | 处理逻辑 |
|--------|--------|------------|----------|
| | | | |

### 4.3 数据设计

#### DR-007: 数据存储结构
- NVM 数据分区：（描述 Flash 分区布局）
- 配置参数存储格式：
- 日志存储策略：

#### DR-008: 通信协议设计
- 应用层协议：（例：Modbus / CANopen / MQTT / 自定义）
- 帧格式定义：
- 错误检测与重传机制：

### 4.4 引导与更新

#### DR-009: Bootloader
- 引导流程：
- 双分区 OTA 更新：（是 / 否）
- 回滚策略：

#### DR-010: 固件更新（OTA / 本地）
- 更新触发方式：
- 更新包完整性验证：
- 更新失败处理：

---

## 五、接口要求

### 5.1 人机接口（HMI）

#### UIR-001: 显示接口
- 显示类型：（LCD / OLED / 数码管 / 无）
- 分辨率 / 尺寸：
- 刷新率要求：

#### UIR-002: 输入接口
- 输入方式：（按键 / 触摸屏 / 旋钮 / 语音）
- 按键防抖时间 ≤ ____ ms

#### UIR-003: 状态指示
- LED 指示灯数量及含义：
- 蜂鸣器 / 告警输出：

### 5.2 外部系统接口

#### UIR-004: 上位机 / 云平台接口
- 通信方式：
- 数据上报周期：
- 远程控制指令集：

---

## 六、约束条件

### 6.1 硬件约束
- PCB 尺寸限制：
- 供电电压：
- BOM 成本目标：

### 6.2 合规与认证
- 需通过认证：（例：CE / FCC / UL / IEC 62443）
- 行业标准：（例：IEC 61508 / ISO 26262 / DO-178C）

### 6.3 资源约束
- 开发团队规模：
- 关键里程碑：

---

## 七、验收标准

### 7.1 功能验收
- 所有 FR 条目测试用例通过率 100%
- 硬件在环（HIL）测试通过

### 7.2 性能验收
- 满足第三章实时性、资源、功耗指标
- 压力测试（连续运行 ____ 小时无异常）

### 7.3 安全验收
- 功能安全分析（FMEA / FTA）完成（如适用）
- 信息安全测试通过（如适用）

### 7.4 交付物清单
- [ ] 固件二进制文件（含版本信息）
- [ ] 源代码（含单元测试）
- [ ] 硬件设计文件（原理图 / PCB，如适用）
- [ ] 软件设计说明书
- [ ] 测试报告
- [ ] 用户 / 维护手册
`;

// ── Template selector ─────────────────────────────────────────────────────────

function getTemplate(type: SpecTemplateType, title: string): string {
  switch (type) {
    case 'web':      return WEB_APP_TEMPLATE(title);
    case 'desktop':  return DESKTOP_APP_TEMPLATE(title);
    case 'windows':  return WINDOWS_APP_TEMPLATE(title);
    case 'embedded': return EMBEDDED_APP_TEMPLATE(title);
  }
}

// ── File helpers ──────────────────────────────────────────────────────────────

function getWorkspaceRoot(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  return folders?.[0]?.uri.fsPath ?? null;
}

function getSpecDir(root: string): string {
  return path.join(root, '.speccraft');
}

function buildFrontmatter(meta: SpecMeta): string {
  return `---
specId: ${meta.specId}
title: ${meta.title}
version: ${meta.version}
created: ${meta.created}
updated: ${meta.updated}
---\n\n`;
}

function parseFrontmatter(content: string): { meta: Partial<SpecMeta>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const fmText = match[1];
  const body = match[2];
  const meta: Partial<SpecMeta> = {};

  for (const line of fmText.split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      const value = rest.join(':').trim();
      (meta as Record<string, string>)[key.trim()] = value;
    }
  }

  return { meta, body };
}

// ── SpecFileProvider ──────────────────────────────────────────────────────────

export class SpecFileProvider {
  async ensureSpecDir(): Promise<string | null> {
    const root = getWorkspaceRoot();
    if (!root) return null;
    const specDir = getSpecDir(root);
    await fs.mkdir(specDir, { recursive: true });
    return specDir;
  }

  async listSpecs(): Promise<SpecFile[]> {
    const uris = await vscode.workspace.findFiles('**/*.spec.md', '**/node_modules/**', 200);
    const results: SpecFile[] = [];

    for (const uri of uris) {
      try {
        const content = await fs.readFile(uri.fsPath, 'utf-8');
        const { meta } = parseFrontmatter(content);
        if (meta.specId) {
          results.push({
            specId: meta.specId,
            title: meta.title ?? path.basename(uri.fsPath).replace('.spec.md', ''),
            version: meta.version ?? '1.0.0',
            mdPath: uri.fsPath,
            created: meta.created ?? new Date().toISOString(),
            updated: meta.updated ?? new Date().toISOString(),
          });
        }
      } catch {
        // skip unreadable files
      }
    }

    return results.sort((a, b) => b.updated.localeCompare(a.updated));
  }

  async readSpec(specId: string): Promise<{ spec: SpecJson; mdContent: string } | null> {
    const specs = await this.listSpecs();
    const specFile = specs.find((s) => s.specId === specId);
    if (!specFile) return null;

    try {
      const mdContent = await fs.readFile(specFile.mdPath, 'utf-8');
      const spec: SpecJson = {
        specId,
        title: specFile.title,
        version: specFile.version,
      };
      return { spec, mdContent };
    } catch {
      return null;
    }
  }

  async createSpec(title: string, templateType: SpecTemplateType = 'web', slug?: string): Promise<SpecFile> {
    const specDir = await this.ensureSpecDir();
    if (!specDir) throw new Error('No workspace folder open');

    const specId = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const effectiveSlug = slug?.trim()
      || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      || `spec-${Date.now()}`;
    const mdPath = path.join(specDir, `${effectiveSlug}.spec.md`);
    const now = new Date().toISOString();

    const meta: SpecMeta = { specId, title, version: '1.0.0', created: now, updated: now };
    const mdContent = buildFrontmatter(meta) + getTemplate(templateType, title);

    await fs.writeFile(mdPath, mdContent, 'utf-8');

    return { specId, title, version: '1.0.0', mdPath, created: now, updated: now };
  }

  async createSpecAtPath(mdPath: string, templateType: SpecTemplateType = 'web'): Promise<SpecFile> {
    const dir = path.dirname(mdPath);
    await fs.mkdir(dir, { recursive: true });

    const filename = path.basename(mdPath).replace(/\.spec\.md$/i, '').replace(/\.md$/i, '');
    const title = filename.replace(/[-_]/g, ' ').trim() || 'New Spec';
    const specId = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const meta: SpecMeta = { specId, title, version: '1.0.0', created: now, updated: now };
    const content = buildFrontmatter(meta) + getTemplate(templateType, title);

    await fs.writeFile(mdPath, content, 'utf-8');
    return { specId, title, version: '1.0.0', mdPath, created: now, updated: now };
  }

  async applyImprovement(specId: string, requirementId: string, improvedText: string): Promise<void> {
    const specs = await this.listSpecs();
    const specFile = specs.find((s) => s.specId === specId);
    if (!specFile) throw new Error(`Spec not found: ${specId}`);

    const uri = vscode.Uri.file(specFile.mdPath);
    const doc = await vscode.workspace.openTextDocument(uri);

    // Match both #### parent and ##### child requirement headings
    const headingPattern = new RegExp(`^#{4,5}\\s+${requirementId}:`);
    let headingLine = -1;
    for (let i = 0; i < doc.lineCount; i++) {
      if (headingPattern.test(doc.lineAt(i).text)) {
        headingLine = i;
        break;
      }
    }
    if (headingLine < 0) {
      throw new Error(`Requirement ${requirementId} not found in document`);
    }

    let bodyEndLine = doc.lineCount;
    for (let i = headingLine + 1; i < doc.lineCount; i++) {
      if (doc.lineAt(i).text.startsWith('#')) {
        bodyEndLine = i;
        break;
      }
    }

    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      uri,
      new vscode.Range(new vscode.Position(headingLine + 1, 0), new vscode.Position(bodyEndLine, 0)),
      improvedText + '\n\n'
    );
    await vscode.workspace.applyEdit(edit);
    await vscode.workspace.save(uri);
  }

  async openSpecInEditor(mdPath: string): Promise<void> {
    const uri = vscode.Uri.file(mdPath);
    await vscode.window.showTextDocument(uri, { preview: false });
  }
}
