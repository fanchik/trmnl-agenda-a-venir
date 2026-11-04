# TRMNL recipe submission draft

Name: Coming Up

Short description: Your next events, however far ahead.

Description:
Combine up to five ICS calendars into one upcoming-event list. Choose a maximum of 1–15 events, optionally grouped into Today, This week, Next week and Later. Smaller screens show as many events as fit. Includes full, half vertical, two-column half horizontal and quadrant layouts, plus custom title/footer with automatic event counts. Runs on TRMNL Serverless; just enter your ICS feed links.

Icon: assets/icon.svg (512 × 512)

Categories: calendar, productivity

Before submitting:
- [x] Complete a live smoke test of the refactored Shared version.
- [ ] Optional additional coverage: test five real feeds (five mocked feeds pass; two live feeds tested).
- [x] Export/import into a fresh private plugin and confirm calendar events display.
- Export/import does not carry the uploaded icon in the tested workflow; upload it again on the imported copy.
- Add screenshots with fictional calendars or redact personal events.
- Confirm the GitHub repository visibility and merge the draft PR only when authorized.
- In TRMNL, Publish as a Recipe and review the submission before publishing.


## November review revisions

- Native `text--small`, `text--base`, `lg:text--large`, `title` and `lg:title--large` utilities, with scoped typography tokens for compact views.
- Sparse agendas grow by up to 50% after the fitter determines the largest visible chronological prefix. Enlargement never drops an event from that prefix.
- Account `trmnl.user.time_zone_iana` replaces the custom timezone selector (UTC fallback when absent).
- Full-view calendar labels have reserved space beside truncated event names.
- Real Framework matrix covers OG (800x480) and X (1040x780), four views, 0/2/4/5/15 events and grouping on/off. Portrait is deferred.

Import the supplied ZIP into a test copy and check the previews. Apply its files to the existing recipe master before asking Mario for another review. Do not replace the reviewed recipe with a new submission by accident. No support reply is sent automatically.


### Follow-up: avoid unnecessary wrapping on X

Enlargement now preserves the baseline title/calendar-label line counts, in addition to preserving event count. Date and time column widths are measured from their actual text at each candidate type size. This gives event titles the available width instead of reserving excessive fixed-width metadata columns. The OG/X half-horizontal regression uses the four reported titles (zoo, live music, Christmas market, new-year planning), and requires all four titles to remain on one line. Genuinely long compact-view titles may still wrap to two lines and then truncate.


### Follow-up: maximise readable capacity before enlargement

The previous X quadrant could fit only three labelled events across Today and This week at its normal 18px event size, then enlarged them to 27px. A new three-plugin mashup regression reproduces that failure. Capacity is now calculated at a readable compact floor (14px event text, 12px metadata; Full event floor 18px) before enlargement. With the same ten-event mock feed, the Together quadrant keeps five chronological events across Today/This week/Next week. A sparse two-event feed still enlarges. Calendar retrieval and custom fields are unchanged.


### Follow-up: use spare title width for calendar names

Compact calendar names are inline beside the event title when both complete strings fit. Long titles retain two-line wrapping with the calendar name underneath. Capacity is measured after this arrangement, and enlargement preserves inline rows. The mashup regression includes a long appointment and requires at least six chronological events, with five short titles using inline calendar names and the appointment's calendar kept visible below it.


### Follow-up: use spare space on the second title line

Calendar names now flow after wrapped compact titles as well as single-line titles. A third calendar line remains allowed when needed. The title alone keeps its existing two-line clamp; it is not shortened to fit the calendar into two combined lines. Regression checks cover a second-line name when there is space and a third-line name when there is not, while preserving exactly the same title text.
