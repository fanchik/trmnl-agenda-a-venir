// The release file includes ICAL.js above this code; no npm installation is needed.
function clean(value, max = 120) {
  return Array.from(String(value || '').replace(/\s+/g, ' ').trim()).slice(0, max).join('');
}
function parts(date, zone) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
function dayKey(date, zone) {
  const p = parts(date, zone); return `${p.year}-${p.month}-${p.day}`;
}
function civilDate(time) {
  return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
}
function wallMillis(time, zone) {
  const wall = Date.UTC(time.year, time.month - 1, time.day, time.hour || 0, time.minute || 0, time.second || 0);
  let guess = wall;
  for (let i = 0; i < 4; i++) {
    const p = parts(new Date(guess), zone);
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    const correction = wall - shown;
    if (!correction) break;
    guess += correction;
  }
  return guess;
}
function millis(time, prop, displayZone) {
  if (time.isDate) return wallMillis(time, displayZone);
  const tzid = prop && prop.getParameter('tzid');
  if (tzid && !ICAL.TimezoneService.has(tzid)) return wallMillis(time, tzid);
  if (!tzid && time.zone.tzid === 'floating') return wallMillis(time, displayZone);
  return time.toUnixTime() * 1000;
}
function parseFeed(text, index, limit, zone, now, deadline, mode = 'boundaries', color = 'blue') {
  ICAL.TimezoneService.reset();
  const root = new ICAL.Component(ICAL.parse(text));
  if (root.name !== 'vcalendar') throw new Error('Expected an ICS calendar feed.');
  for (const tz of root.getAllSubcomponents('vtimezone')) {
    const id = tz.getFirstPropertyValue('tzid');
    ICAL.TimezoneService.register(new ICAL.Timezone({component: tz, tzid: id}), id);
  }
  const name = clean(root.getFirstPropertyValue('x-wr-calname') || root.getFirstPropertyValue('name') || `Calendrier ${index + 1}`, 60);
  const description = clean(root.getFirstPropertyValue('x-wr-caldesc') || root.getFirstPropertyValue('description'), 150);
  const components = root.getAllSubcomponents('vevent');
  const masters = components.filter(c => !c.hasProperty('recurrence-id'));
  const overrides = components.filter(c => c.hasProperty('recurrence-id'));
  const rows = [];
  const seen = new Set();
  const localizedDate = (ms, allDay) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: allDay ? 'UTC' : zone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(ms));
  const localizedTime = (ms, allDay) => allDay ? 'Toute la journée' :
    new Intl.DateTimeFormat('fr-FR', {timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(ms));
  const pushRow = (title, ms, allDay, eventTime, dateOverride) => {
    const key = dateOverride || (allDay ? new Date(ms).toISOString().slice(0, 10) : dayKey(new Date(ms), zone));
    rows.push({title, calendar: name, calendar_index: index + 1, calendar_color: color,
      date_key: key, sort: ms, date: localizedDate(allDay ? Date.parse(key + 'T12:00:00Z') : ms, allDay),
      time: eventTime || localizedTime(ms, allDay)});
  };
  function add(item, start, end, identity) {
    if (String(item.component.getFirstPropertyValue('status')).toUpperCase() === 'CANCELLED') return false;
    const startMs = millis(start, item.component.getFirstProperty('dtstart'), zone);
    const endMs = millis(end, item.component.getFirstProperty('dtend') || item.component.getFirstProperty('dtstart'), zone);
    if (endMs <= now.getTime() && !(startMs === endMs && startMs >= now.getTime())) return false;
    const key = `${item.uid}|${identity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    const allDay = start.isDate;
    const startDay = allDay ? civilDate(start) : dayKey(new Date(startMs), zone);
    // RFC 5545: DTEND is exclusive; full-day end reminders belong to the previous day.
    const finalMs = allDay ? Date.parse(civilDate(end) + 'T12:00:00Z') - 86400000 : endMs;
    const endDay = allDay ? new Date(finalMs).toISOString().slice(0, 10) : dayKey(new Date(Math.max(startMs, endMs - 1)), zone);
    const multiDay = startDay !== endDay;
    const label = clean(item.summary || '(Sans titre)', 100);
    if (!multiDay) {
      pushRow(label, startMs, allDay, undefined, startDay);
    } else if (mode === 'hide') {
      return false;
    } else if (mode === 'daily') {
      // Enumerate only the forward-looking days, with a hard cap for extremely long events.
      let day = startDay, count = 0;
      const currentDay = dayKey(now, zone);
      while (day <= endDay && count++ < 3660) {
        if (day >= currentDay) {
          const dayMs = allDay ? Date.parse(day + 'T12:00:00Z') : wallMillis({
            year: +day.slice(0, 4), month: +day.slice(5, 7), day: +day.slice(8, 10), hour: 0, minute: 0
          }, zone);
          // Do not show a start-of-day placeholder for a past day.
          if (dayMs >= now.getTime() || day === currentDay) pushRow(label, dayMs, allDay, allDay ? 'Toute la journée' : 'En cours', day);
        }
        const nextDay = new Date(day + 'T12:00:00Z');
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        day = nextDay.toISOString().slice(0, 10);
        if (rows.length >= limit) break;
      }
    } else {
      if (startMs >= now.getTime()) pushRow('Début : ' + label, startMs, allDay, undefined, startDay);
      const finishMs = allDay ? Date.parse(endDay + 'T12:00:00Z') : endMs;
      if (finishMs >= now.getTime()) pushRow('Fin : ' + label, finishMs, allDay, allDay ? 'Toute la journée' : undefined, endDay);
    }
    return true;
  }
  // Process moved occurrences separately so an occurrence moved much earlier is not missed.
  for (const component of overrides) {
    const item = new ICAL.Event(component);
    if (component.hasProperty('dtstart')) add(item, item.startDate, item.endDate, item.recurrenceId.toString());
  }
  // Process nearer starts first. Real Google ICS exports can include many years of history.
  // Skip obsolete non-repeating events before creating ICAL.Event objects.
  masters.sort((a, b) => {
    const x = a.getFirstPropertyValue('dtstart'), y = b.getFirstPropertyValue('dtstart');
    return (y ? Date.UTC(y.year, y.month - 1, y.day) : 0) -
      (x ? Date.UTC(x.year, x.month - 1, x.day) : 0);
  });
  for (const component of masters) {
    // Keep already extracted future events instead of failing the entire calendar.
    if (Date.now() > deadline) break;
    if (!component.hasProperty('rrule') && !component.hasProperty('rdate')) {
      const end = component.getFirstPropertyValue('dtend') || component.getFirstPropertyValue('dtstart');
      if (end && millis(end, component.getFirstProperty('dtend') || component.getFirstProperty('dtstart'), zone) < now.getTime()) continue;
    }
    const item = new ICAL.Event(component, {exceptions: []});
    if (!component.hasProperty('dtstart')) continue;
    if (!item.isRecurring()) { add(item, item.startDate, item.endDate, 'single'); continue; }
    const related = overrides.filter(c => c.getFirstPropertyValue('uid') === item.uid);
    for (const exception of related) {
      let normalized = exception;
      if (!exception.hasProperty('dtstart') && exception.getFirstProperty('recurrence-id').getParameter('range') === 'THISANDFUTURE') {
        // A cancellation may omit DTSTART. Supply the original occurrence time
        // for the library's range arithmetic; its CANCELLED status is preserved.
        normalized = new ICAL.Component(JSON.parse(JSON.stringify(exception.toJSON())));
        const start = exception.getFirstPropertyValue('recurrence-id').clone();
        normalized.addPropertyWithValue('dtstart', start);
        const end = start.clone(); end.addDuration(item.duration);
        normalized.addPropertyWithValue('dtend', end);
      }
      if (normalized.hasProperty('dtstart')) item.relateException(normalized);
    }
    const replaced = new Set(related.filter(c => !c.getFirstProperty('recurrence-id').getParameter('range'))
      .map(c => c.getFirstPropertyValue('recurrence-id').toString()));
    const iterator = item.iterator();
    let accepted = 0, steps = 0, occurrence;
    while ((occurrence = iterator.next())) {
      // One very old daily rule must not monopolise TRMNL's short runtime.
      if (++steps > 10000 || Date.now() > deadline) break;
      if (replaced.has(occurrence.toString())) continue;
      const detail = item.getOccurrenceDetails(occurrence);
      const cancelled = String(detail.item.component.getFirstPropertyValue('status')).toUpperCase() === 'CANCELLED';
      if (cancelled && detail.item.modifiesFuture()) {
        const laterActiveRange = related.some(c => c.getFirstProperty('recurrence-id').getParameter('range') === 'THISANDFUTURE'
          && c.getFirstPropertyValue('recurrence-id').compare(occurrence) > 0
          && String(c.getFirstPropertyValue('status')).toUpperCase() !== 'CANCELLED');
        if (!laterActiveRange) break;
      }
      if (add(detail.item, detail.startDate, detail.endDate, occurrence.toString())) accepted++;
      if (accepted >= limit) break;
    }
  }
  rows.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
  return {name, description, events: rows.slice(0, limit)};
}
async function fetchFeed(url) {
  const address = url.replace(/^webcal:/i, 'https:');
  if (!/^https:\/\/[^\s/]+\//i.test(address)) throw new Error('Use an HTTPS calendar feed link.');
  // TRMNL may provide fetch without the native Web Streams / AbortSignal globals.
  const options = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? {signal: AbortSignal.timeout(4300)} : {};
  const response = await fetch(address, options);
  if (!response.ok) throw new Error(`Calendar download failed (HTTP ${response.status}).`);
  const declaredSize = Number(response.headers?.get?.('content-length') || 0);
  if (declaredSize > 2000000) throw new Error('Calendar feed exceeds the 2 MB preview limit.');
  const text = await response.text();
  if (text.length > 2000000) throw new Error('Calendar feed exceeds the 2 MB preview limit.');
  if (!text.trimStart().startsWith('BEGIN:VCALENDAR')) throw new Error('Expected an ICS calendar feed, but the link returned another page.');
  return text;
}
// A separate deadline also covers runtimes whose fetch shim lacks AbortSignal.
async function downloadFeeds(urls, timeoutMs = 4350) {
  let timer;
  try {
    return await Promise.race([
      Promise.all(urls.map(url => fetchFeed(url))),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Calendar downloads timed out. Try refreshing again or use a smaller feed.')), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
// Native polling can supply raw text inside a payload wrapper. Find calendar
// strings without depending on a particular TRMNL plaintext wrapper key.
function polledFeeds(input) {
  const found = [];
  const visited = new Set();
  function visit(value, depth) {
    if (depth > 8 || value == null) return;
    if (typeof value === 'string') {
      if (value.trimStart().startsWith('BEGIN:VCALENDAR')) found.push(value);
      return;
    }
    if (typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (key !== 'trmnl' && key !== 'custom_fields_values') visit(child, depth + 1);
    }
  }
  visit(input, 0);
  return [...new Set(found)];
}
async function run(input) {
  const fields = input.trmnl?.plugin_settings?.custom_fields_values || input.custom_fields_values || {};
  const limit = Math.max(1, Math.min(15, parseInt(fields.event_limit, 10) || 10));
  const zone = input.trmnl?.user?.time_zone_iana || 'UTC';
  const now = new Date();
  const startedAt = Date.now();
  const grouping = ![false, 'false', 'no', '0'].includes(fields.group_events);
  const calendars = [1, 2, 3, 4, 5].map(i => ({
    url: String(fields['ics_' + i] || '').trim(),
    color: String(fields['ics_' + i + '_color'] || ['blue', 'green', 'amber', 'rose', 'violet'][i - 1])
  })).filter(feed => feed.url);
  const urls = [...new Set(calendars.map(feed => feed.url))];
  const multiDayMode = ['daily', 'boundaries', 'hide'].includes(fields.multi_day_mode) ? fields.multi_day_mode : 'boundaries';
  let stage = 'timezone';
  try {
    parts(now, zone); // Validate timezone before processing any feed.
    if (!urls.length) throw new Error('Add at least one ICS calendar link in settings.');
    stage = 'download';
    const polled = polledFeeds(input);
    const downloaded = polled.length === urls.length ? polled : await downloadFeeds(urls);
    stage = 'parse';
    // Keep a small processing budget within TRMNL's overall 5-second runtime.
    const deadline = Date.now() + Math.max(250, Math.min(2200, 4750 - (Date.now() - startedAt)));
    const feeds = downloaded.map((text, i) => parseFeed(text, i, limit, zone, now, deadline, multiDayMode, calendars[i]?.color || 'blue'));
    stage = 'format';
    const selected = feeds.flatMap(f => f.events).sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title)).slice(0, limit);
    const today = dayKey(now, zone);
    const monday = new Date(today + 'T00:00:00Z');
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const next = new Date(monday); next.setUTCDate(next.getUTCDate() + 7);
    const later = new Date(monday); later.setUTCDate(later.getUTCDate() + 14);
    const events = selected.map(e => ({title: e.title, date: e.date, time: e.time, calendar: e.calendar, calendar_color: e.calendar_color, calendar_index: e.calendar_index,
      group: grouping ? (e.date_key <= today ? 'Aujourd’hui' : e.date_key < next.toISOString().slice(0, 10) ? 'Cette semaine' : e.date_key < later.toISOString().slice(0, 10) ? 'Semaine prochaine' : 'Plus tard') : ''}));
    const values = {count: events.length, limit, calendars: feeds.map(f => f.name).join(', '), calendar_count: feeds.length,
      description: feeds.length === 1 ? feeds[0].description : ''};
    const expand = value => clean(String(value).replace(/\{(count|limit|calendars|calendar_count|description)\}/g, (_, key) => values[key]), 150);
    const defaultTitle = feeds.length === 1 ? 'À venir — {calendars}' : 'Agenda à venir';
    const defaultFooter = values.description || '{count} événements à venir';
    const countTemplate = value => clean(String(value).replace(/\{(limit|calendars|calendar_count|description)\}/g, (_, key) => values[key]), 150);
    return {title: expand(fields.title_override || defaultTitle), footer: expand(fields.footer_override || defaultFooter),
      title_count_template: countTemplate(fields.title_override || defaultTitle),
      footer_count_template: countTemplate(fields.footer_override || defaultFooter),
      events, show_calendar: feeds.length > 1 && ![false, 'false', 'no', '0'].includes(fields.show_calendar_names), grouping, count: events.length,
      updated: new Intl.DateTimeFormat('fr-FR', {timeZone: zone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(now), error: ''};
  } catch (error) {
    // Never echo private feed URLs or parser input into screen/error output.
    if (error.name === 'TimeoutError') return {title: 'Agenda à venir', footer: 'Téléchargement trop lent', events: [], count: 0,
      error: 'Google Agenda ne répond pas dans le délai autorisé. Réessayez ou utilisez un relais de calendrier.', updated: ''};
    const safe = /^(Add at least|Use an HTTPS|Calendar download failed|Calendar feed exceeds|Expected an ICS|This feed uses|Calendar is too complex|Recurrence expansion)/.test(error.message);
    return {title: 'Agenda à venir', footer: 'Vérifiez les paramètres', events: [], count: 0,
      error: safe ? error.message : `Erreur de calendrier pendant ${stage} (${error.name || 'Erreur'}).`,
      input_keys: Object.keys(input).filter(k => k !== 'trmnl'), polled_feed_count: polledFeeds(input).length, updated: ''};
  }
}
