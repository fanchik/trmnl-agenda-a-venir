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
- Real Framework matrix covers OG (800x480) and X (1040x780), four views, 0/2/5/15 events and grouping on/off. Portrait is deferred.

Import the supplied ZIP into a test copy and check the previews. Apply its files to the existing recipe master before asking Mario for another review. Do not replace the reviewed recipe with a new submission by accident. No support reply is sent automatically.
