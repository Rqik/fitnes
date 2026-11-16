import { useId, useState } from 'react';
import { metrics, parseMetricValue, type Metric } from '../domain/metrics';

export function NumericField({ metric, label, name, value, required, onChange }: {
  metric: Metric;
  label?: string;
  name?: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [hasInteracted, setHasInteracted] = useState(false);
  const definition = metrics[metric];
  const hint = !label ? definition.hint : undefined;

  function errorFor(text: string) {
    const parsed = parseMetricValue(metric, text);
    if (parsed === undefined && required) return 'Введите значение.';
    if (parsed === null) {
      const range = metric === 'muscleShare' ? 'от 0,01 до 100' : 'от 0,01 до 9 999,99';
      return `Введите число ${range} с точностью до двух знаков.`;
    }
    return '';
  }

  const error = hasInteracted ? errorFor(value) : '';
  const description = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label htmlFor={id}>
        {label ?? definition.label}<span className="sr-only">, {definition.unit}</span>
      </label>
      {hint ? <small id={`${id}-hint`} className="field-hint">{hint}</small> : null}
      <div className="input-with-unit">
        <input
          id={id}
          name={name ?? metric}
          inputMode="decimal"
          autoComplete="off"
          pattern={String.raw`\s*[0-9]+([.,][0-9]{1,2})?\s*`}
          required={required}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={description || undefined}
          onChange={(event) => {
            const field = event.currentTarget;
            field.setCustomValidity(errorFor(field.value));
            onChange(field.value);
          }}
          onBlur={() => setHasInteracted(true)}
          onInvalid={(event) => {
            const details = event.currentTarget.closest('details');
            if (details) details.open = true;
            setHasInteracted(true);
          }}
        />
        <span aria-hidden="true">{definition.unit}</span>
      </div>
      <small id={`${id}-error`} className="field-error" aria-live="polite">{error}</small>
    </div>
  );
}
