import type { FC } from "hono/jsx";
import { APP_NAME } from "../constants/mod.ts";
import { asset } from "../utils/asset.ts";
import type { Person } from "../types/person.types.ts";

type Props = {
  people: Person[];
};

export const IdentityView: FC<Props> = ({ people }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Who are you? — ${APP_NAME}`}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href={asset("/css/index.css")} />
        <link rel="stylesheet" href={asset("/css/views/identity.css")} />
      </head>
      <body class="identity-page">
        <div class="identity-card">
          <h1 class="identity-card__title">Who are you?</h1>
          <p class="identity-card__subtitle">
            Select your identity to continue.
          </p>
          <div class="identity-card__list">
            {people.map((person) => (
              <form
                key={person.id}
                action="/settings/identity"
                method="post"
                class="identity-form"
              >
                <input type="hidden" name="personId" value={person.id} />
                <button type="submit" class="identity-btn">
                  <span class="identity-btn__avatar">
                    {person.name.charAt(0).toUpperCase()}
                  </span>
                  <span class="identity-btn__meta">
                    <span class="identity-btn__name">{person.name}</span>
                    {person.title && (
                      <span class="identity-btn__role">{person.title}</span>
                    )}
                  </span>
                </button>
              </form>
            ))}
          </div>
        </div>
      </body>
    </html>
  );
};
