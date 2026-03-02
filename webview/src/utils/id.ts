export function generateId(): string {
  return crypto.randomUUID();
}

export function generateSpecId(): string {
  return `spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
