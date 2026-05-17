import type { FC } from "hono/jsx";
import { APP_NAME } from "../constants/mod.ts";
import type { Person } from "../types/person.types.ts";

type Props = {
  nonce?: string;
  people: Person[];
};

export const IdentityView: FC<Props> = ({ nonce, people }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Who are you? — ${APP_NAME}`}</title>
        <link rel="stylesheet" href="/css/index.css" />
        <link rel="stylesheet" href="/css/views/identity.css" />
      </head>
      <body class="identity-page">
        <div class="identity-card">
          <h1 class="identity-card__title">Who are you?</h1>
          <p class="identity-card__subtitle">
            Select your identity to continue.
          </p>
          <div class="identity-card__list">
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                class="identity-btn"
                data-person-id={person.id}
              >
                <span class="identity-btn__avatar">
                  {person.name.charAt(0).toUpperCase()}
                </span>
                <span>
                  <span class="identity-btn__name">{person.name}</span>
                  {person.title && (
                    <span class="identity-btn__role">{person.title}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <div class="identity-error" id="identity-error">
            Failed to set identity. Please try again.
          </div>
        </div>
        <script nonce={nonce}>
          {`
          document.querySelectorAll('.identity-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var personId = btn.getAttribute('data-person-id');
              fetch('/api/v1/settings/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personId: personId })
              }).then(function(res) {
                if (res.ok) {
                  window.location.href = '/';
                } else {
                  document.getElementById('identity-error').classList.add('is-visible');
                }
              }).catch(function() {
                document.getElementById('identity-error').classList.add('is-visible');
              });
            });
          });
        `}
        </script>
      </body>
    </html>
  );
};
