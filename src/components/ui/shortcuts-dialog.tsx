// Keyboard-shortcuts reference dialog.
import type { FC } from "hono/jsx";

type ShortcutRow = { keys: string[]; action: string; chord?: boolean };
type ShortcutGroup = { label: string; rows: ShortcutRow[] };

const GROUPS: ShortcutGroup[] = [
  {
    label: "Global",
    rows: [
      { keys: ["Cmd", "K"], action: "Open search" },
      { keys: ["?"], action: "Show keyboard shortcuts" },
      { keys: ["t"], action: "Toggle theme" },
      { keys: ["f"], action: "Toggle focus mode" },
    ],
  },
  {
    label: "List Views",
    rows: [
      { keys: ["j"], action: "Move selection down" },
      { keys: ["k"], action: "Move selection up" },
      { keys: ["g"], action: "Jump to top" },
      { keys: ["G"], action: "Jump to bottom" },
      { keys: ["Enter"], action: "Open selected row" },
      { keys: ["x"], action: "Toggle select task (task list only)" },
      { keys: ["a"], action: "Select / deselect all tasks (task list only)" },
    ],
  },
  {
    label: "Views",
    rows: [
      { keys: ["m", "g"], action: "Switch to grid view", chord: true },
      { keys: ["m", "l"], action: "Switch to table (list) view", chord: true },
      { keys: ["m", "t"], action: "Switch to timeline view", chord: true },
      { keys: ["m", "b"], action: "Switch to board view", chord: true },
      { keys: ["m", "o"], action: "Switch to org chart view", chord: true },
    ],
  },
  {
    label: "Search",
    rows: [
      { keys: ["↑", "↓"], action: "Navigate results" },
      { keys: ["Enter"], action: "Open result" },
      { keys: ["Esc"], action: "Close search" },
    ],
  },
];

const Kbd: FC<{ keys: string[]; chord?: boolean }> = ({ keys, chord }) => (
  <span class="shortcuts-dialog__keys">
    {keys.map((k, i) => (
      <span key={i}>
        {i > 0 && (
          <span class="shortcuts-dialog__plus">{chord ? "→" : "+"}</span>
        )}
        <kbd class="shortcuts-dialog__kbd">{k}</kbd>
      </span>
    ))}
  </span>
);

/** Keyboard-shortcuts reference dialog (opened with ?); rows defined in GROUPS. */
export const ShortcutsDialog: FC = () => (
  <dialog
    class="shortcuts-dialog"
    id="shortcuts-dialog"
    aria-label="Keyboard shortcuts"
  >
    <div class="shortcuts-dialog__content">
      <div class="shortcuts-dialog__header">
        <span class="shortcuts-dialog__title">Keyboard Shortcuts</span>
        <kbd class="shortcuts-dialog__kbd-esc">ESC</kbd>
      </div>
      <div class="shortcuts-dialog__body">
        {GROUPS.map((group) => (
          <div key={group.label} class="shortcuts-dialog__group">
            <div class="shortcuts-dialog__group-label">{group.label}</div>
            <table class="shortcuts-dialog__table">
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.action} class="shortcuts-dialog__row">
                    <td class="shortcuts-dialog__cell-keys">
                      <Kbd keys={row.keys} chord={row.chord} />
                    </td>
                    <td class="shortcuts-dialog__cell-action">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  </dialog>
);
