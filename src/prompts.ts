export function buildRefinePrompt(text: string, requirement?: string): string {
  const extra = requirement?.trim() ? `\n- 特别要求：${requirement.trim()}` : '';
  return `你是一位专业的技术写作专家。请对以下内容进行润色和修订，使其更清晰、准确、专业。

原始内容：
${text}

要求：
- 保持原意不变
- 改善表达方式，使其更简洁、专业
- 修正语病和歧义
- 保持与原文大致相同的长度${extra}

直接输出修订后的内容，不要任何说明或前缀。`;
}

export function buildImproveRequirementPrompt(
  id: string,
  content: string,
  extra?: string
): string {
  return `You are a software requirements expert. Improve the following requirement to be more specific, measurable, and testable (SMART).

Requirement ID: ${id}
Current content:
${content}
${extra ? `\nFocus: ${extra}` : ''}
Output ONLY the improved requirement text. No heading, no explanation.`;
}
