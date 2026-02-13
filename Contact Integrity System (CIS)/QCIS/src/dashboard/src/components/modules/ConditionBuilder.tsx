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
  { value: 'score', label: 'Risk Score', type: 'number' },
  { value: 'tier', label: 'Risk Tier', type: 'string' },
  { value: 'signal_count_24h', label: 'Signals (24h)', type: 'number' },
  { value: 'enforcement_count_30d', label: 'Enforcements (30d)', type: 'number' },
  { value: 'total_enforcement_actions', label: 'Total Enforcements', type: 'number' },
  { value: 'user_type', label: 'User Type', type: 'string' },
  { value: 'service_category', label: 'Service Category', type: 'string' },
  { value: 'event_type', label: 'Event Type', type: 'string' },
  { value: 'has_active_restriction', label: 'Has Active Restriction', type: 'boolean' },
  { value: 'pattern_flags', label: 'Pattern Flags', type: 'array' },
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

// ─── FieldConditionRow ──────────────────────────────────────────

function FieldConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: FieldCondition;
  onChange: (c: FieldCondition) => void;
  onRemove: () => void;
}) {
  const fieldType = getFieldType(condition.field);
  const ops = OPERATORS[fieldType] || OPERATORS.string;

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

  // Render value input
  const renderValueInput = () => {
    if (fieldType === 'boolean') {
      return (
        <select
          value={String(condition.value)}
          onChange={(e) => handleValueChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (condition.field === 'tier') {
      if (condition.operator === 'in' || condition.operator === 'not_in') {
        return (
          <div className="flex flex-wrap gap-1">
            {TIER_VALUES.map((tv) => {
              const vals = Array.isArray(condition.value) ? condition.value : [];
              const selected = vals.includes(tv);
              return (
                <button
                  key={tv}
                  type="button"
                  onClick={() => {
                    const newVals = selected ? vals.filter((v) => v !== tv) : [...vals, tv];
                    onChange({ ...condition, value: newVals });
                  }}
                  className={`px-2 py-0.5 text-xs rounded border ${selected ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-500'}`}
                >
                  {tv}
                </button>
              );
            })}
          </div>
        );
      }
      return (
        <select
          value={String(condition.value)}
          onChange={(e) => handleValueChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
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
          className="border border-gray-300 rounded px-2 py-1 text-sm"
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
        className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-[80px]"
        placeholder={condition.operator === 'in' || condition.operator === 'not_in' ? 'val1, val2, ...' : 'value'}
      />
    );
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-sm"
      >
        {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
      >
        {ops.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
      </select>

      {renderValueInput()}

      <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 text-xs px-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
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
  if (isFieldCondition(condition)) {
    return <FieldConditionRow condition={condition} onChange={onChange} onRemove={onRemove} />;
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

  const borderColor = depth === 0 ? 'border-blue-200' : depth === 1 ? 'border-purple-200' : 'border-gray-200';
  const bgColor = depth === 0 ? 'bg-blue-50/50' : depth === 1 ? 'bg-purple-50/30' : 'bg-gray-50/50';

  return (
    <div className={`border ${borderColor} ${bgColor} rounded-lg p-3 ${depth > 0 ? 'ml-4' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleGroupType}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              isAll
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            {groupType.toUpperCase()}
          </button>
          <span className="text-xs text-gray-400">
            {isAll ? 'All conditions must match' : 'Any condition can match'}
          </span>
        </div>
        {depth > 0 && (
          <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 text-xs">Remove Group</button>
        )}
      </div>

      {children.map((child, i) => (
        <ConditionGroup
          key={i}
          condition={child}
          onChange={(c) => updateChild(i, c)}
          onRemove={() => removeChild(i)}
          depth={depth + 1}
        />
      ))}

      <div className="flex items-center gap-2 mt-2">
        <button type="button" onClick={addField} className="text-xs text-blue-600 hover:text-blue-800">+ Add Condition</button>
        {depth < 2 && (
          <>
            <span className="text-gray-300">|</span>
            <button type="button" onClick={() => addGroup('all')} className="text-xs text-purple-600 hover:text-purple-800">+ ALL Group</button>
            <button type="button" onClick={() => addGroup('any')} className="text-xs text-amber-600 hover:text-amber-800">+ ANY Group</button>
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

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">Conditions</label>
        <div className="flex border border-gray-300 rounded-md overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={`px-3 py-1 ${mode === 'visual' ? 'bg-cis-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => setMode('json')}
            className={`px-3 py-1 ${mode === 'json' ? 'bg-cis-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            JSON
          </button>
        </div>
      </div>

      {parseError && mode === 'visual' && (
        <div className="text-xs text-amber-600 mb-2">{parseError}</div>
      )}

      {mode === 'visual' ? (
        <ConditionGroup
          condition={condition}
          onChange={handleConditionChange}
          onRemove={handleRemoveRoot}
          depth={0}
        />
      ) : (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
            rows={8}
            placeholder='{ "all": [{ "field": "score", "operator": "gte", "value": 75 }] }'
          />
          <p className="text-xs text-gray-400 mt-1">Supports: all/any groups, operators: eq, neq, gt, gte, lt, lte, in, not_in, contains</p>
        </>
      )}
    </div>
  );
}
