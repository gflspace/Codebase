'use client';

import { useState, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────

interface FieldCondition {
  field: string;
  operator: string;
  value: string | number | boolean | Array<string | number>;
}

interface AllGroup {
  all: Condition[];
}

interface AnyGroup {
  any: Condition[];
}

type Condition = FieldCondition | AllGroup | AnyGroup;

function isAllGroup(c: Condition): c is AllGroup {
  return 'all' in c;
}

function isAnyGroup(c: Condition): c is AnyGroup {
  return 'any' in c;
}

function isFieldCondition(c: Condition): c is FieldCondition {
  return 'field' in c && 'operator' in c;
}

// ─── Constants ──────────────────────────────────────────────────

const FIELDS = [
  { value: 'score', label: 'Risk Score', type: 'number', category: 'Risk Metrics', description: 'Overall trust/risk score (0-100)' },
  { value: 'tier', label: 'Risk Tier', type: 'string', category: 'Risk Metrics', description: 'Risk tier classification' },
  { value: 'signal_count_24h', label: 'Signals (24h)', type: 'number', category: 'Activity Counts', description: 'Number of signals in past 24 hours' },
  { value: 'enforcement_count_30d', label: 'Enforcements (30d)', type: 'number', category: 'Activity Counts', description: 'Enforcement actions in past 30 days' },
  { value: 'total_enforcement_actions', label: 'Total Enforcements', type: 'number', category: 'Activity Counts', description: 'Total enforcement actions all-time' },
  { value: 'user_type', label: 'User Type', type: 'string', category: 'User Properties', description: 'User role (client, provider, customer)' },
  { value: 'service_category', label: 'Service Category', type: 'string', category: 'User Properties', description: 'Service category classification' },
  { value: 'event_type', label: 'Event Type', type: 'string', category: 'User Properties', description: 'Type of event or action' },
  { value: 'has_active_restriction', label: 'Has Active Restriction', type: 'boolean', category: 'User Properties', description: 'Whether user has active restrictions' },
  { value: 'pattern_flags', label: 'Pattern Flags', type: 'array', category: 'Risk Metrics', description: 'Detected behavioral pattern flags' },
];

const FIELD_CATEGORIES = ['Risk Metrics', 'User Properties', 'Activity Counts'];

interface Template {
  name: string;
  description: string;
  condition: Condition;
}

const TEMPLATES: Template[] = [
  {
    name: 'High Risk Score',
    description: 'Users with risk score >= 75',
    condition: { all: [{ field: 'score', operator: 'gte', value: 75 }] },
  },
  {
    name: 'Repeat Offender',
    description: 'Users with 3+ enforcements in 30 days',
    condition: { all: [{ field: 'enforcement_count_30d', operator: 'gte', value: 3 }] },
  },
  {
    name: 'Suspicious Activity Burst',
    description: 'High signal count with elevated score',
    condition: {
      all: [
        { field: 'signal_count_24h', operator: 'gte', value: 5 },
        { field: 'score', operator: 'gte', value: 50 },
      ],
    },
  },
  {
    name: 'Critical Account',
    description: 'Critical tier accounts',
    condition: { all: [{ field: 'tier', operator: 'eq', value: 'critical' }] },
  },
];

const OPERATORS: Record<string, Array<{ value: string; label: string }>> = {
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '!=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
  ],
  string: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '!=' },
    { value: 'in', label: 'in' },
    { value: 'not_in', label: 'not in' },
  ],
  boolean: [
    { value: 'eq', label: '=' },
  ],
  array: [
    { value: 'contains', label: 'contains' },
  ],
};

const TIER_VALUES = ['normal', 'low', 'medium', 'high', 'critical'];
const USER_TYPE_VALUES = ['client', 'provider', 'customer'];

// ─── Helpers ────────────────────────────────────────────────────

function defaultCondition(): FieldCondition {
  return { field: 'score', operator: 'gte', value: 50 };
}

function getFieldType(fieldName: string): string {
  return FIELDS.find((f) => f.value === fieldName)?.type || 'string';
}

function getFieldDescription(fieldName: string): string {
  return FIELDS.find((f) => f.value === fieldName)?.description || '';
}

function validateCondition(condition: FieldCondition): string | null {
  const fieldType = getFieldType(condition.field);
  const { operator, value } = condition;

  if (['gt', 'gte', 'lt', 'lte'].includes(operator) && fieldType !== 'number') {
    return 'Numeric operators require number field';
  }

  if (fieldType === 'number' && typeof value === 'string' && isNaN(Number(value))) {
    return 'Number field requires numeric value';
  }

  if (['in', 'not_in'].includes(operator) && !Array.isArray(value)) {
    return 'in/not_in operators require array value';
  }

  return null;
}

function humanReadableSummary(condition: Condition): string {
  if (isFieldCondition(condition)) {
    const fieldLabel = FIELDS.find((f) => f.value === condition.field)?.label || condition.field;
    const opMap: Record<string, string> = {
      eq: '=',
      neq: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      in: 'in',
      not_in: 'not in',
      contains: 'contains',
    };
    const opSymbol = opMap[condition.operator] || condition.operator;
    const valueStr = Array.isArray(condition.value)
      ? `[${condition.value.join(', ')}]`
      : String(condition.value);
    return `${fieldLabel} ${opSymbol} ${valueStr}`;
  }

  if (isAllGroup(condition)) {
    const parts = condition.all.map(humanReadableSummary);
    return parts.length > 1 ? `(${parts.join(' AND ')})` : parts[0] || '';
  }

  if (isAnyGroup(condition)) {
    const parts = condition.any.map(humanReadableSummary);
    return parts.length > 1 ? `(${parts.join(' OR ')})` : parts[0] || '';
  }

  return '';
}

// ─── FieldConditionRow ──────────────────────────────────────────

function FieldConditionRow({
  condition,
  onChange,
  onRemove,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  condition: FieldCondition;
  onChange: (c: FieldCondition) => void;
  onRemove: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const [tagInput, setTagInput] = useState('');
  const fieldType = getFieldType(condition.field);
  const ops = OPERATORS[fieldType] || OPERATORS.string;
  const validationError = validateCondition(condition);

  const handleFieldChange = (field: string) => {
    const newType = getFieldType(field);
    const defaultOp = (OPERATORS[newType] || OPERATORS.string)[0].value;
    const defaultVal = newType === 'number' ? 0 : newType === 'boolean' ? true : '';
    onChange({ field, operator: defaultOp, value: defaultVal });
  };

  const handleValueChange = (raw: string) => {
    if (fieldType === 'number') {
      onChange({ ...condition, value: parseFloat(raw) || 0 });
    } else if (fieldType === 'boolean') {
      onChange({ ...condition, value: raw === 'true' });
    } else if (condition.operator === 'in' || condition.operator === 'not_in') {
      onChange({ ...condition, value: raw.split(',').map((s) => s.trim()).filter(Boolean) });
    } else {
      onChange({ ...condition, value: raw });
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const current = Array.isArray(condition.value) ? condition.value : [];
    onChange({ ...condition, value: [...current, tagInput.trim()] });
    setTagInput('');
  };

  const handleRemoveTag = (index: number) => {
    const current = Array.isArray(condition.value) ? condition.value : [];
    onChange({ ...condition, value: current.filter((_, i) => i !== index) });
  };

  // Render value input
  const renderValueInput = () => {
    if (fieldType === 'boolean') {
      return (
        <select
          value={String(condition.value)}
          onChange={(e) => handleValueChange(e.target.value)}
          className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    // Tag-style multi-value input for in/not_in operators
    if (condition.operator === 'in' || condition.operator === 'not_in') {
      const values = Array.isArray(condition.value) ? condition.value : [];

      if (condition.field === 'tier') {
        return (
          <div className="flex flex-wrap gap-1">
            {TIER_VALUES.map((tv) => {
              const selected = values.includes(tv);
              return (
                <button
                  key={tv}
                  type="button"
                  onClick={() => {
                    const newVals = selected ? values.filter((v) => v !== tv) : [...values, tv];
                    onChange({ ...condition, value: newVals });
                  }}
                  className={`px-2 py-0.5 text-xs rounded border ${selected ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-200' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400'}`}
                >
                  {tv}
                </button>
              );
            })}
          </div>
        );
      }

      return (
        <div className="flex-1 min-w-[120px]">
          <div className="flex flex-wrap gap-1 mb-1">
            {values.map((val, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded text-xs"
              >
                {String(val)}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(i)}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              placeholder="Type and press Enter"
            />
          </div>
        </div>
      );
    }

    if (condition.field === 'tier') {
      return (
        <select
          value={String(condition.value)}
          onChange={(e) => handleValueChange(e.target.value)}
          className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
        >
          {TIER_VALUES.map((tv) => <option key={tv} value={tv}>{tv}</option>)}
        </select>
      );
    }

    if (condition.field === 'user_type') {
      return (
        <select
          value={String(condition.value)}
          onChange={(e) => handleValueChange(e.target.value)}
          className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
        >
          {USER_TYPE_VALUES.map((ut) => <option key={ut} value={ut}>{ut}</option>)}
        </select>
      );
    }

    const displayValue = Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value);
    return (
      <input
        type={fieldType === 'number' ? 'number' : 'text'}
        value={displayValue}
        onChange={(e) => handleValueChange(e.target.value)}
        className={`border rounded px-2 py-1 text-sm flex-1 min-w-[80px] bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 ${
          validationError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-slate-600'
        }`}
        placeholder={condition.operator === 'in' || condition.operator === 'not_in' ? 'val1, val2, ...' : 'value'}
      />
    );
  };

  return (
    <div
      className="flex items-center gap-2 py-1.5"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {draggable && (
        <div className="cursor-move text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      )}
      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        title={getFieldDescription(condition.field)}
        className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
      >
        {FIELD_CATEGORIES.map((cat) => (
          <optgroup key={cat} label={cat}>
            {FIELDS.filter((f) => f.category === cat).map((f) => (
              <option key={f.value} value={f.value} title={f.description}>
                {f.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm w-20 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
      >
        {ops.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
      </select>

      {renderValueInput()}

      <button type="button" onClick={onRemove} className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs px-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {validationError && (
        <div className="absolute right-0 top-full mt-1 text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
          {validationError}
        </div>
      )}
    </div>
  );
}

// ─── ConditionGroup ─────────────────────────────────────────────

function ConditionGroup({
  condition,
  onChange,
  onRemove,
  depth,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
  depth: number;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (isFieldCondition(condition)) {
    return <FieldConditionRow condition={condition} onChange={onChange} onRemove={onRemove} draggable={false} />;
  }

  const isAll = isAllGroup(condition);
  const children: Condition[] = isAll ? (condition as AllGroup).all : (condition as AnyGroup).any;
  const groupType = isAll ? 'all' : 'any';

  const updateChild = (index: number, child: Condition) => {
    const newChildren = [...children];
    newChildren[index] = child;
    onChange(isAll ? { all: newChildren } : { any: newChildren });
  };

  const removeChild = (index: number) => {
    const newChildren = children.filter((_, i) => i !== index);
    if (newChildren.length === 0) {
      onRemove();
    } else {
      onChange(isAll ? { all: newChildren } : { any: newChildren });
    }
  };

  const reorderChildren = (fromIndex: number, toIndex: number) => {
    const newChildren = [...children];
    const [movedItem] = newChildren.splice(fromIndex, 1);
    newChildren.splice(toIndex, 0, movedItem);
    onChange(isAll ? { all: newChildren } : { any: newChildren });
  };

  const addField = () => {
    const newChildren = [...children, defaultCondition()];
    onChange(isAll ? { all: newChildren } : { any: newChildren });
  };

  const addGroup = (type: 'all' | 'any') => {
    const subGroup = type === 'all'
      ? { all: [defaultCondition()] }
      : { any: [defaultCondition()] };
    const newChildren = [...children, subGroup];
    onChange(isAll ? { all: newChildren } : { any: newChildren });
  };

  const toggleGroupType = () => {
    onChange(isAll ? { any: children } : { all: children });
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderChildren(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDrop = () => {
    setDraggedIndex(null);
  };

  const borderColor = depth === 0 ? 'border-blue-200 dark:border-blue-800' : depth === 1 ? 'border-purple-200 dark:border-purple-800' : 'border-gray-200 dark:border-slate-700';
  const bgColor = depth === 0 ? 'bg-blue-50/50 dark:bg-blue-950/30' : depth === 1 ? 'bg-purple-50/30 dark:bg-purple-950/20' : 'bg-gray-50/50 dark:bg-slate-800/30';

  const hasEmptyConditions = children.length === 0;

  return (
    <div className={`border ${borderColor} ${bgColor} rounded-lg p-3 ${depth > 0 ? 'ml-4' : ''} relative`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleGroupType}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              isAll
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800'
            }`}
          >
            {groupType.toUpperCase()}
          </button>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {isAll ? 'All conditions must match' : 'Any condition can match'}
          </span>
        </div>
        {depth > 0 && (
          <button type="button" onClick={onRemove} className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs">Remove Group</button>
        )}
      </div>

      {hasEmptyConditions && (
        <div className="text-xs text-amber-600 dark:text-amber-400 mb-2 italic">
          Add at least one condition to this group
        </div>
      )}

      <div className="space-y-1">
        {children.map((child, i) => {
          if (isFieldCondition(child)) {
            return (
              <div key={i} className="relative">
                <FieldConditionRow
                  condition={child}
                  onChange={(c) => updateChild(i, c)}
                  onRemove={() => removeChild(i)}
                  draggable={true}
                  onDragStart={handleDragStart(i)}
                  onDragOver={handleDragOver(i)}
                  onDrop={handleDrop}
                />
              </div>
            );
          }
          return (
            <ConditionGroup
              key={i}
              condition={child}
              onChange={(c) => updateChild(i, c)}
              onRemove={() => removeChild(i)}
              depth={depth + 1}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button type="button" onClick={addField} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">+ Add Condition</button>
        {depth < 2 && (
          <>
            <span className="text-gray-300 dark:text-slate-600">|</span>
            <button type="button" onClick={() => addGroup('all')} className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300">+ ALL Group</button>
            <button type="button" onClick={() => addGroup('any')} className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300">+ ANY Group</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

interface ConditionBuilderProps {
  value: string; // JSON string
  onChange: (json: string) => void;
}

export default function ConditionBuilder({ value, onChange }: ConditionBuilderProps) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [parseError, setParseError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Parse JSON to condition tree
  let condition: Condition;
  try {
    condition = JSON.parse(value);
    if (parseError) setParseError(null);
  } catch {
    condition = { all: [defaultCondition()] };
    if (!parseError) setParseError('Invalid JSON — showing default');
  }

  const handleConditionChange = useCallback((c: Condition) => {
    onChange(JSON.stringify(c, null, 2));
  }, [onChange]);

  const handleRemoveRoot = useCallback(() => {
    const fresh = { all: [defaultCondition()] };
    onChange(JSON.stringify(fresh, null, 2));
  }, [onChange]);

  const handleLoadTemplate = (template: Template) => {
    const isEmpty = JSON.stringify(condition) === JSON.stringify({ all: [defaultCondition()] });
    if (!isEmpty) {
      const confirmed = window.confirm(
        `Replace current conditions with "${template.name}" template?\n\n${template.description}`
      );
      if (!confirmed) return;
    }
    onChange(JSON.stringify(template.condition, null, 2));
    setShowTemplates(false);
  };

  const summary = humanReadableSummary(condition);

  return (
    <div className="space-y-3">
      {/* Header with mode toggle and template button */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Conditions</label>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-xs px-3 py-1 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Load Template
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg z-10">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                    Select Template
                  </div>
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => handleLoadTemplate(template)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                    >
                      <div className="font-medium text-gray-900 dark:text-slate-100">{template.name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{template.description}</div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplates(false)}
                  className="w-full text-center px-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 border-t border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            )}
          </div>
          <div className="flex border border-gray-300 dark:border-slate-600 rounded-md overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setMode('visual')}
              className={`px-3 py-1 ${mode === 'visual' ? 'bg-cis-green text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              Visual
            </button>
            <button
              type="button"
              onClick={() => setMode('json')}
              className={`px-3 py-1 ${mode === 'json' ? 'bg-cis-green text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {parseError && mode === 'visual' && (
        <div className="text-xs text-amber-600 dark:text-amber-400">{parseError}</div>
      )}

      {mode === 'visual' ? (
        <>
          <ConditionGroup
            condition={condition}
            onChange={handleConditionChange}
            onRemove={handleRemoveRoot}
            depth={0}
          />
          {/* Human-readable summary */}
          {summary && (
            <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-md p-3">
              <div className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Summary
              </div>
              <div className="text-sm text-gray-900 dark:text-slate-100 font-mono">
                {summary}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            rows={8}
            placeholder='{ "all": [{ "field": "score", "operator": "gte", "value": 75 }] }'
          />
          <p className="text-xs text-gray-400 dark:text-slate-500">Supports: all/any groups, operators: eq, neq, gt, gte, lt, lte, in, not_in, contains</p>
        </>
      )}
    </div>
  );
}
