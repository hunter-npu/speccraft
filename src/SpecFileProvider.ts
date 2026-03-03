import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { SpecJson, SpecFile, SpecMeta } from './types';

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

const DEFAULT_MD_TEMPLATE = (title: string) => `# ${title}

## 一、项目概述

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

  async createSpec(title: string): Promise<SpecFile> {
    const specDir = await this.ensureSpecDir();
    if (!specDir) throw new Error('No workspace folder open');

    const specId = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const mdPath = path.join(specDir, `${slug}.spec.md`);
    const now = new Date().toISOString();

    const meta: SpecMeta = { specId, title, version: '1.0.0', created: now, updated: now };
    const mdContent = buildFrontmatter(meta) + DEFAULT_MD_TEMPLATE(title);

    await fs.writeFile(mdPath, mdContent, 'utf-8');

    return { specId, title, version: '1.0.0', mdPath, created: now, updated: now };
  }

  async createSpecAtPath(mdPath: string): Promise<SpecFile> {
    const dir = path.dirname(mdPath);
    await fs.mkdir(dir, { recursive: true });

    const filename = path.basename(mdPath).replace(/\.spec\.md$/i, '').replace(/\.md$/i, '');
    const title = filename.replace(/[-_]/g, ' ').trim() || 'New Spec';
    const specId = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const meta: SpecMeta = { specId, title, version: '1.0.0', created: now, updated: now };
    const content = buildFrontmatter(meta) + DEFAULT_MD_TEMPLATE(title);

    await fs.writeFile(mdPath, content, 'utf-8');
    return { specId, title, version: '1.0.0', mdPath, created: now, updated: now };
  }

  async applyImprovement(specId: string, requirementId: string, improvedText: string): Promise<void> {
    const specs = await this.listSpecs();
    const specFile = specs.find((s) => s.specId === specId);
    if (!specFile) throw new Error(`Spec not found: ${specId}`);

    const uri = vscode.Uri.file(specFile.mdPath);
    const doc = await vscode.workspace.openTextDocument(uri);

    const headingPattern = new RegExp(`^#{4}\\s+${requirementId}:`);
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
