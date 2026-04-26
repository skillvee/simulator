# src/i18n/

Internationalization setup using `next-intl`.

## Configuration

- **Locales:** `en`, `es`
- **Default locale:** `en`
- **Locale prefix:** `"always"` — all routes include locale (e.g., `/en/path`, `/es/path`)
- **Message files:** `src/messages/en.json`, `src/messages/es.json` (hierarchical namespaced keys)

## Key files

- `routing.ts` — defines locales, default, prefix strategy. Exports locale-aware `Link`, `redirect`, `usePathname`, `useRouter`.
- `request.ts` — `getRequestConfig()` dynamically imports the correct message JSON. Falls back to English for missing keys.

## Adding a new locale

1. Add locale to `routing.ts` → `locales` array.
2. Update the type guard in `request.ts` to include the new locale.
3. Copy `src/messages/en.json` to `src/messages/<locale>.json` and translate. Missing keys automatically fall back to English.

## Non-obvious rules

- **Error behavior differs by environment:** dev throws on missing translations (to catch issues early); production logs warnings and falls back to the key.
- **Middleware handles locale detection** in `src/middleware.ts` using `createMiddleware` from next-intl.
- **Use the locale-aware navigation exports** from `routing.ts` (`Link`, `redirect`, etc.), not the default Next.js ones.
- **Server-side translations** use `getTranslations()` from `next-intl/server` — email templates and analysis use this pattern.
