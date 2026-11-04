# Install Coming Up on TRMNL

The recipe runs on TRMNL Serverless. No Google Apps Script project or Cloudflare service is needed.

## Configure the plugin

1. Create a Private Plugin named Calendar Coming Up.
2. Choose **Polling**, method **GET**, and this single polling URL:

   https://trmnl.com/custom_plugin_example_data.json

   This JSON endpoint triggers refreshes. Its contents are ignored. Do not put ICS feeds in the Polling URL box: direct Google ICS polling produced a Malformed JSON error in live testing.
3. Paste `settings.yml` into Custom Fields and save.
4. Enter one to five ICS links, a maximum of 1–15 events, and your grouping preference. Blank calendar inputs are ignored.
5. Open Edit Markup. Paste the complete `dist/serverless.js` into **Serverless → Node**.
6. Paste `layouts/shared.html` into **Shared**. This is required by every layout.
7. Paste each file into its matching tab:

   | File | TRMNL tab |
   | --- | --- |
   | layouts/full.html | Full |
   | layouts/half_vertical.html | Half vertical |
   | layouts/half_horizontal.html | Half horizontal |
   | layouts/quadrant.html | Quadrant |

8. Save, then Force Refresh. If the plugin was degraded by previous failed refreshes, Reset Health first.
9. Preview the layouts on your target device. Add the plugin to a playlist and choose its refresh interval.

## Updating an existing test installation

The refactored version requires **Shared plus all four layout tabs**. Paste Shared first, then replace the four layout tabs; save the complete update before refreshing. Replace the Serverless code too to enable future recurring changes. Settings remain compatible, so personal links and overrides do not need changing.

## Getting an ICS feed

In Google Calendar: Settings → your calendar → Integrate calendar → **Secret address in iCal format**. Do not use a public address for a private calendar. Other providers need an ICS subscription feed accessible by its link without an interactive sign-in.

Keep private feed links in plugin settings. Do not commit them to GitHub or include them in published screenshots or sample settings.

## Title and footer

Default title: **Coming Up in [calendar name]** for one calendar, or **Coming Up** for multiple calendars. Default footer: the description for a single calendar, if present; otherwise **X events coming up**. Both can be overridden.

| Placeholder | Meaning |
| --- | --- |
| {count} | Events actually visible after fitting this layout |
| {limit} | Selected maximum, which can exceed the visible count |
| {calendars} | Calendar names from the feeds |
| {calendar_count} | Number of distinct configured feed links |
| {description} | Description when using a single feed |

Example: `{count} events coming up from {calendar_count} calendars`.

## Display behaviour

Events are combined chronologically, without a future date cutoff. Ended events disappear; ongoing events remain. Recurring occurrences count separately. Optional groups are Today / This week / Next week / Later. Weeks run Monday–Sunday in your TRMNL account timezone. Empty groups are hidden.

Screen size determines how many events fit, up to the selected maximum. Narrow layouts wrap event names to two lines and retain a separate calendar label. Half horizontal reads down the left column, then the right. Dates omit the year in compact layouts.

Duplicate identical feed links are ignored. The same event present in different feeds can appear twice.

## Troubleshooting and limits

- HTTP 404: check that the feed link works and is a secret feed when appropriate.
- Malformed JSON in plugin health: restore the JSON polling trigger above.
- Save rejected above 100 KB: copy the current built file; the build checks that it is below 100,000 bytes.
- Download timeout: the feed may be slow. A failed feed displays an error rather than a silently incomplete combined list.
- A feed above 2 MB or a complex recurrence history can exceed runtime safeguards. TRMNL permits 5 seconds and 128 MB; downloads run in parallel, with a separate 3.5-second download deadline even when AbortSignal is unavailable, and a 1.2-second parsing budget. When native polling supplies all configured feeds, no downloads run in Serverless.
- Blank description or calendar name: the feed may not provide those optional fields. Use an override.

## Validation and publication

The user has tested two live feeds, 15 selected events, title/footer overrides, grouping on/off, all four layouts, the Shared refactor, and an export/import into a fresh plugin.

Local tests cover five merged feeds, excluded occurrences, moved and cancelled occurrences, changes/cancellation of this-and-future occurrences, timezone conversion, invalid feed responses, chronological layout fitting and visible counts.

Five feeds have automated coverage; optional additional live testing can verify the runtime budget with five real feeds. The repository is public; TRMNL recipe submission is pending.

## Development

Build and parser checks (Node 20+):

```sh
node scripts/build.cjs
node tests/calendar.cjs
node tests/publication.cjs
```

Browser checks require Playwright plus Chromium. Use the complete official stylesheet and physical screen dimensions, rather than a spacing-only fixture:

```sh
curl -fL https://trmnl.com/css/3.4.0/plugins.css -o /tmp/trmnl-plugins.css
export FRAMEWORK_CSS=/tmp/trmnl-plugins.css
# Set BROWSER_PATH if using an installed Chrome executable.
node tests/responsive.cjs
```

The older `layout.cjs` and `horizontal.cjs` fixtures predate native typography; use `responsive.cjs` for current release validation.

ICAL.js 2.2.1 is vendored under MPL-2.0. The build adapts its ES-module export for TRMNL; retain its license and upstream attribution. Our application code is MIT licensed.

## Publication stylesheet

Shared links to `assets/coming-up.css` via jsDelivr, pinned to an immutable Git commit.
This avoids embedding custom CSS in the markup that Chef scans. No calendar data is sent to the CDN.
Layout styles are scoped to each layout root to avoid cross-layout conflicts in mashups.
When changing this stylesheet, publish its new commit and update Shared to pin that commit.
`tests/publication.cjs` checks both the published Chef terms and the broader best-practices list.


## Responsive sizing and account timezone

All four layouts use native TRMNL typography with `lg:` variants for X. The fitting engine first keeps the largest chronological set that fits at a readable compact size (at least 14px event text in compact views and 18px in Full), then tries larger text without dropping any of those events or introducing extra title/calendar-label wrapping. Date and time columns are measured from their actual text instead of expanding by a fixed width multiplier. Dates and calendar labels grow with the event title, with compact metadata kept at least 12px. Compact titles remain limited to two lines, with the calendar label below them. OG half-horizontal retains two columns and discreet continued-group headings.

Event times and Monday-to-Sunday grouping use `trmnl.user.time_zone_iana` from the TRMNL account. The old timezone custom field is removed; a saved value from an earlier installation is ignored. If the account timezone is absent, the transform falls back to UTC. Change the account timezone in TRMNL to change the display timezone.

Run the real Framework layout matrix with `FRAMEWORK_CSS=/path/to/plugins.css BROWSER_PATH=/path/to/chrome node tests/responsive.cjs`. It covers all four layouts on OG and X with empty, sparse and dense agendas (including the four short emoji titles from the live review), grouping on/off, long titles, separate calendar labels, count templates and repeated fitting. Optional `QA_DIR` saves previews. Portrait remains outside this release's supported test matrix.


## Import package and updating the reviewed recipe

Build with `python3 scripts/package.py /path/to/coming-up.zip` after rebuilding the Serverless bundle. The ZIP contains seven files at its root: complete `settings.yml`, `transform.js`, and the five Liquid views. It deliberately omits account IDs, private feed links and settings values. The icon must still be uploaded separately.

Import into a test copy first, enter demo feeds, and preview all layouts on OG and X. To revise the existing recipe under review, update its four layout tabs, Shared tab, Serverless code and Custom Fields from these same files; keep the existing recipe master rather than submitting the test copy as a new recipe. The root repository `settings.yml` is the Custom Fields list; the ZIP's `settings.yml` also contains plugin configuration for importing.

Arial is set explicitly on agenda text as well as through native typography tokens. Compatibility rules preserve the font and baseline sizing for older layout tabs that do not yet have the responsive text classes. Full responsive behavior still requires updating all four layout tabs.


### X mashup density regression

`node tests/mashup.cjs` uses the same `FRAMEWORK_CSS` and `BROWSER_PATH` variables. It renders two independent quadrant calendars above a half-horizontal plugin in the official `mashup--2Tx1B` shell. Ten short labelled events spanning Today, This week and Next week reproduce the prior three-event result; the readable-density fitter must retain at least five, with accurate per-instance counts and no footer overlap. The test also checks repeated fitting and enlargement for a genuinely sparse two-event feed. Baseline sizing is reset before every fit so a prior enlarged view cannot reduce the next render's capacity.

For a mashup containing several private copies of Coming Up, update Shared in every copy to keep their fitting scripts and stylesheet versions consistent. `BIT_DEPTH=1` can be used with the mashup test for a raw black-and-white visual preview.
