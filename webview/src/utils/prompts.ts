export function buildImproveRequirementPrompt(
  requirementId: string,
  requirementContent: string
): string {
  return `You are a software requirements expert. Review and improve the following requirement to make it more specific, measurable, achievable, relevant, and time-bound (SMART).

Requirement ID: ${requirementId}
Current Content:
${requirementContent}

Provide an improved version that:
1. Is more specific and unambiguous
2. Has clear acceptance criteria
3. Is testable
4. Follows best practices for software requirements

Output only the improved requirement text.`;
}

/**
 * System prompt for the chat panel.
 * The full .spec.md content is injected so the model has complete context.
 */
export function buildSystemPrompt(mdContent?: string): string {
  const docSection = mdContent?.trim()
    ? `\n\n---\n以下是当前正在编辑的规格说明文档（请以此为上下文回答问题）：\n\`\`\`markdown\n${mdContent}\n\`\`\``
    : '';

  return `你是 SpecCraft AI 助手，专注于软件规格说明写作。你能帮助：
- 编写和改进软件规格说明
- 检查需求的完整性和可测试性
- 提供 TDD 工作流指导

请简洁、务实地回答，遵循软件工程最佳实践。${docSection}`;
}
