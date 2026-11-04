# Coming Up — a TRMNL calendar recipe

Display upcoming events from up to five ICS calendars, however far ahead they are.

**Status: human review revisions prepared.** Native responsive typography, count-aware enlargement and account timezone handling are covered by automated checks. Previous live testing covered two feeds, all four layouts, custom titles/footers and export/import. The revised build still needs previewing in TRMNL before resubmission.

## Features

- One to five ICS feed links, combined chronologically.
- Optional saved labels beside each feed link, for reference in settings only.
- Maximum 1–15 events (default 10); fewer may fit on smaller screens.
- Optional Today / This week / Next week / Later grouping, with Monday–Sunday weeks.
- Full, half vertical, two-column half horizontal and quadrant layouts.
- Native responsive typography for OG and X; sparse agendas enlarge text when it fits without dropping events or adding title wrapping.
- Automatic timezone from the TRMNL account.
- Calendar names flow after event titles, sharing the final line when there is room. Compact titles keep their two-line limit; the calendar moves to a third line only when needed.
- Default title includes the calendar name for a single feed; multiple feeds use Coming Up.
- Custom title/footer, with `{count}` reporting visible events and `{limit}` reporting the chosen maximum.
- Recurring events, excluded occurrences, moved occurrences and future occurrence changes/cancellations.

## Where it runs

**TRMNL Serverless** downloads and processes the feeds; TRMNL renders the screen. Users enter their links in plugin settings. No user-installed code, Google Apps Script project or Cloudflare account is needed. Styling loads from a version-pinned public stylesheet served by jsDelivr; the CDN receives no calendar feed links or event data.

## Setup

Follow [the setup guide](docs/setup.md). Use the JSON polling trigger specified there. Paste `settings.yml` into Custom Fields, `dist/serverless.js` into Serverless → Node, and **`layouts/shared.html` into Shared**. Paste each remaining layout into its matching tab. Use `assets/icon.svg` as the icon.

Private ICS links belong in TRMNL settings, not in this repository. The GitHub repo stores the code; it does not run the plugin.

## Development and checks

Node 20+, no package installation required for parser tests:

```sh
node scripts/build.cjs
node tests/calendar.cjs
node tests/publication.cjs
```

Edit `src/serverless.js`, then rebuild `dist/serverless.js`. The build enforces TRMNL's 100 KB code limit. Browser test instructions are in [the setup guide](docs/setup.md).

Tests cover five feeds, invalid links, recurrence exceptions and future changes, timezones, layout fitting, chronological ordering and visible counts. Large or slow feeds can exceed TRMNL's runtime limits; see the setup guide. Five feeds are covered by automated tests; live testing has used two feeds.

## License

Original code: [MIT](LICENSE). ICAL.js 2.2.1: [MPL-2.0](vendor/LICENSE-ICAL.txt), with [upstream source](https://github.com/kewisch/ical.js/tree/v2.2.1). Its vendored source is unmodified; the build adapts the module export in the generated bundle.
