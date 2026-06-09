import type { FC } from "hono/jsx";

/**
 * Shared multi-line text input. Always carries the `.form__textarea` base class
 * (auto-grow via `field-sizing: content`, vertical resize) so call sites never
 * hand-roll a textarea on `.form__input` — the fixed-height anti-pattern that
 * breaks auto-grow and triggers the red `:user-invalid` styling.
 *
 * Extra classes append after the base; `attrs` forwards htmx (`hx-*`) and
 * `data-*` attributes; `value` renders as the textarea's children.
 */
type FormTextareaProps = {
  name: string;
  value?: string;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  id?: string;
  maxlength?: number;
  /** Extra classes appended after the base `form__textarea`. */
  class?: string;
  /** Pass-through for htmx (`hx-*`) and `data-*` attributes. */
  attrs?: Record<string, string>;
};

export const FormTextarea: FC<FormTextareaProps> = ({
  value,
  class: extra,
  rows = 3,
  attrs,
  ...rest
}) => (
  <textarea
    class={extra ? `form__textarea ${extra}` : "form__textarea"}
    rows={rows}
    {...rest}
    {...attrs}
  >
    {value}
  </textarea>
);
