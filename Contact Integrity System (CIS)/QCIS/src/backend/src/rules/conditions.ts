// QwickServices CIS — Layer 9: Condition Evaluator
// Pure function that evaluates JSONB condition trees against a context object.
// Supports nested all/any groups with field-level operators.

// ─── Types ────────────────────────────────────────────────────

export interface FieldCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';
  value: string | number | boolean | Array<string | number>;
}

export interface AllGroup {
  all: RuleCondition[];
}

export interface AnyGroup {
  any: RuleCondition[];
}

export type RuleCondition = FieldCondition | AllGroup | AnyGroup;

export type RuleConditions = RuleCondition;

export interface RuleContext {
  score: number;
  tier: string;
  signal_count_24h: number;
  enforcement_count_30d: number;
  user_type: string | null;
  service_category: string | null;
  event_type: string;
  has_active_restriction: boolean;
  pattern_flags: string[];
  total_enforcement_actions: number;
}

// ─── Type Guards ──────────────────────────────────────────────

function isAllGroup(cond: RuleCondition): cond is AllGroup {
  return 'all' in cond && Array.isArray((cond as AllGroup).all);
}

function isAnyGroup(cond: RuleCondition): cond is AnyGroup {
  return 'any' in cond && Array.isArray((cond as AnyGroup).any);
}

function isFieldCondition(cond: RuleCondition): cond is FieldCondition {
  return 'field' in cond && 'operator' in cond;
}

// ─── Single Condition Evaluation ──────────────────────────────

export function evaluateSingleCondition(condition: FieldCondition, context: RuleContext): boolean {
  const fieldValue = (context as unknown as Record<string, unknown>)[condition.field];

  // Unknown field — cannot evaluate, return false
  if (fieldValue === undefined) return false;

  const { operator, value } = condition;

  switch (operator) {
    case 'eq':
      return fieldValue === value;

    case 'neq':
      return fieldValue !== value;

    case 'gt':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;

    case 'gte':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;

    case 'lt':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;

    case 'lte':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;

    case 'in':
      return Array.isArray(value) && value.includes(fieldValue as string | number);

    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue as string | number);

    case 'contains':
      return Array.isArray(fieldValue) && fieldValue.includes(value as string | number);

    default:
      // Unknown operator — return false
      return false;
  }
}

// ─── Recursive Condition Evaluation ───────────────────────────

export function evaluateConditions(conditions: RuleConditions, context: RuleContext): boolean {
  if (isAllGroup(conditions)) {
    return conditions.all.every((child) => evaluateConditions(child, context));
  }

  if (isAnyGroup(conditions)) {
    return conditions.any.some((child) => evaluateConditions(child, context));
  }

  if (isFieldCondition(conditions)) {
    return evaluateSingleCondition(conditions, context);
  }

  // Unrecognized structure — fail closed
  return false;
}
