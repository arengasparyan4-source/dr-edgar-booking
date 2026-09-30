# NIGHT_LOG — autonomous work on AUDIT_REPORT.md, Queue 2

Started 2026-09-29. Base commit: `658bc56` (Step 0 and Queue 1 done).

## Ground rules followed
- After every task: `npm run lint`, `npm run typecheck`, `npm run build`, then a separate commit.
- Real `storage/app-data.json` is never modified by tests. Snapshot taken before any work:
  `storage/app-data.json.before-queue2-20260929-200005.bak` (kept, not deleted).
- Tests run in an offline harness: TypeScript is compiled into the session scratch
  directory, `process.cwd()` points at a temporary copy of `storage/`, `global.fetch`
  is replaced with a stub that throws on any network call, and Telegram/Google/SMS
  env variables are unset (mock providers only). `.env.local` is never read or changed.
- No push, no history rewrite, no access to real Google Calendar / Telegram / SMS.

## Note on the task text
The task message was cut off in the middle of item 2.6 (after "уникальный dayOfWeek;").
Everything up to and including 2.6 is done as written; for the rest of 2.6 I followed the
audit report (bug #14: blocked times, NaN in `minutesFromTime`). Anything that was meant
to come after 2.6 (e.g. a "Part B") did not reach me and was not started.

## Log

### 2.0 Clinic time zone foundation — done
- New `src/lib/time/clinicTime.ts`: `getClinicTimeZone`, `nowInClinic`, `clinicToday`,
  `utcToClinic`, `clinicToUtc`, `clinicOffsetString`, `toClinicRfc3339` — Intl only, no deps.
- `CLINIC_TIMEZONE` (default `Asia/Yerevan`) added to `.env.example`. `.env.local` untouched:
  without the variable the default applies, which matches the current behaviour.
- Decision: an invalid zone name falls back to Asia/Yerevan with one warning instead of
  crashing every request (safer for a single-clinic app).
- Verified offline: UTC<->Yerevan, date rollover at midnight, Berlin DST gap/overlap, New York.

### 2.1 Google Calendar time zone (bug #6) — done
- New `src/lib/google/freeBusy.ts`: freeBusy instants -> clinic wall-clock slots; events
  crossing midnight and multi-day events are split per clinic day (`24:00` marks end of day).
- `googleCalendarProvider`: `toDateTime` uses the CLINIC_TIMEZONE offset instead of `+04:00`;
  `timeZone` field comes from CLINIC_TIMEZONE; freeBusy `timeMin/timeMax` are the clinic-day
  bounds as UTC instants.
- Found while fixing: once busy times are correct, a booking's *own* Google event (created
  on confirm) would block its own slot on re-confirm / change of services. freeBusy gives
  no event ids, so availability now subtracts the excluded booking's stored interval from
  Google busy time on that date. Decision: accept that an external event exactly overlapping
  the booking's own time is hidden during that re-check (it was a conflict already).
- Verified offline on sample freeBusy responses (stubbed fetch + throwaway RSA key, no
  requests to Google): 13:00 Yerevan no longer blocks 09:00, midnight/multi-day split,
  request bounds, event body offsets.

### 2.2 Telegram reschedule (bug #5) — done
- `showRescheduleOptions` stores the shown list in `booking.rescheduleOptions` (ids `1..5`);
  a button press resolves the slot from that stored list only, so the doctor's choice is
  exactly what the client gets.
- Before sending, the chosen option is re-checked against fresh availability. If it was
  taken meanwhile: nothing is sent to the client, the Telegram list is refreshed and the
  doctor sees "Это время уже занято. Список вариантов обновлён — выберите другое".
- Options are searched from max(today in clinic zone, booking date), never before "now",
  and the booking's current time is not offered as an "other time".
- Found while fixing: `booking_offer_slot:<44-byte id>:slot_N` was 70 bytes, over Telegram's
  64-byte `callback_data` limit, so the option buttons could never be sent. New action
  `booking_slot:<id>:<n>` is 59 bytes; `buildCallbackData` throws if any button exceeds 64.
  The old spelling is still accepted (old stored ids `slot_N` still resolve).
- Decisions: reschedule is refused for cancelled/completed bookings; an unknown/stale option
  id gives the doctor "Этот вариант устарел…" (new API code `reschedule_option_not_found`,
  translated hy/ru/en); unknown errors are no longer echoed raw to Telegram.
- Verified offline via the webhook route (mock Telegram, no network): stored list, no past
  slots, all callback_data <= 64 bytes, taken slot -> no SMS + refreshed list, chosen slot
  is the one in the SMS, stale id handled, legacy action works.

### 2.3 Past slots and booking horizon (bugs #8, #23) — done
- New setting `minBookingLeadMinutes` (default 60, 0–1440), editable in admin → Settings
  (hy/ru/en labels). New module `src/lib/availability/bookingWindow.ts`.
- Public `/api/availability` and `/api/booking`: dates before clinic-today or after
  today + max(7, bookingHorizonDays) − 1 are rejected with `date_out_of_range` (400); slots
  sooner than now + lead are never returned and cannot be booked (`slot_unavailable`);
  `daysAhead` can no longer reach past the horizon.
- `/api/site-data` returns `today` (clinic zone); the landing page uses it instead of the
  browser clock (browser date only as a fallback if the request fails).
- Reschedule options sent to clients use the same lead time.
- Decisions (conservative): admin manual booking and admin date change only forbid the past
  (no lead, no horizon — the doctor may book further ahead); confirm and service edits of an
  existing booking are not re-checked against "now", so an already-agreed booking is never
  blocked by the clock.
- Verified offline: window maths at 23:30 (lead crosses midnight), route rejections for
  yesterday / 2020 / after horizon, clamping, no slot before now+lead, `today` in site data.

### 2.4 Double booking (bug #3) — done
- `getAvailability` split into a pure `computeAvailability(data, googleBusy, input)` plus
  `assertSlotAvailableInData`, which runs *inside* `appRepository.updateData` on the freshest
  data. All 5 places now check and save in one write: public booking, manual booking,
  admin date change, confirm, service change. Google busy time (network) is fetched before
  the lock so the write queue is never blocked by HTTP.
- New error `slot_taken` (409) when another active booking overlaps; every other reason
  (past, break, blocked, outside hours, Google) stays `slot_unavailable` (409). Admin texts
  hy/ru/en added. Landing page: on 409 `slot_taken`/`slot_unavailable` it shows
  "Это время только что заняли, выберите другое" (hy/ru/en) and reloads the day's slots.
- Order changes (decisions): public booking now saves the booking first and links/creates
  the client card afterwards, so the losing request leaves no client record; manual booking
  keeps "early check → client → atomic save" because the doctor's flow needs the client id.
  Confirm now secures the slot first and creates the Google event afterwards.
- Verified offline by parallel calls into the real route handler/scenarios: 2 and 10
  simultaneous `/api/booking` on one slot → exactly one 201, rest 409 `slot_taken`, no
  extra client; confirm racing a move into the same slot → one wins; parallel admin moves,
  parallel manual bookings, service extension into a just-taken slot → 409.
  Note: tested in one Node process (what `next start` is); multiple instances would still
  need a real DB lock (audit §9.1), out of scope here.

### 2.5 Services (bug #13) — done
- Deleting a service is refused (409 `service_in_use`, clear hy/ru/en message in the admin
  "Services" page) while any booking dated today or later with status pending / confirmed /
  reschedule_requested uses it. The check runs inside the write. Deactivation is allowed.
- Existing bookings are sized by `servicesSnapshot`: confirm, admin date change and
  reschedule options use the agreed services/duration/price, so editing, deactivating or
  (later) deleting a service no longer freezes bookings. Changing services of a booking
  keeps services it already has from the snapshot; newly added ones must be active.
- Clients cannot pick an inactive service (site data hides it; availability/booking APIs
  answer `invalid_services`) — this was already so, now covered by a check.
- Decision: `reschedule_requested` counts as active for the delete check (conservative).
- Verified offline: delete refused/allowed, deactivate + price/duration change leaves the
  booking's confirm / move / options / edit on the old values, inactive service rejected.

### 2.6 Schedule validation (bug #14) — done
- Times must be 00:00–23:59 (the old regex accepted `99:99`); dates must exist
  (`2026-02-31` rejected). Applies to working hours, breaks, blocked times, admin
  date/time change and manual booking.
- Working day: start < end; each break start < end, inside the working hours, breaks do not
  overlap (adjacent is fine); `dayOfWeek` unique. Blocked times: start < end, no overlapping
  or duplicated intervals on one date.
- The admin gets a precise message instead of "validation failed": new codes
  `invalid_time`, `invalid_date`, `time_range_invalid`, `break_outside_hours`,
  `breaks_overlap`, `duplicate_day`, `blocked_times_overlap` (hy/ru/en).
- `minutesFromTime` now throws on garbage instead of returning NaN (NaN made every slot look
  free). `24:00` stays valid only as the internal end-of-day marker from 2.1.
- Decision: rules apply to disabled days too (their hours are kept and shown in the UI).
  The current real schedule passes all rules (checked), so the doctor can save as before.

## Summary (end of Part A)
- Queue 2 items 2.0–2.6: all done, 7 commits (`fd3c34d`..`c3b5868`), each passing
  `npm run lint`, `npm run typecheck`, `npm run build`. Nothing rolled back.
- `storage/app-data.json` is byte-identical to the snapshot (md5 `149f8892…`); all tests
  used temporary copies. Snapshot kept. No network calls were made by any test.
- Open points for the owner:
  1. The task text stopped mid-2.6; anything after it was not received.
  2. The first time the site uses the fixed Google conversion, busy times move by 4 hours
     compared to before (the correct direction). Worth one look at the doctor's real calendar.
  3. Telegram reschedule buttons never worked before (callback_data over 64 bytes), so this is
     their first real use; a `scripts/test-telegram.mjs` run on a test chat is advisable.
  4. The atomic slot check holds for one server process; several instances would need a DB
     (audit §9.1).

### Follow-up (autonomous check)
- `updateBookingDetails`: if the booking's date changed between reading it and the write, it
  now asks for a retry (`slot_unavailable`) like `confirmBooking`, instead of skipping the
  Google busy check. All offline tests re-run green; lint/typecheck/build pass.

---

# Part 2 of the night (continuation message)

`NIGHT_PROMPT.md` saved (with the resume header); `NIGHT_PROMPT.md`, `NIGHT_DONE.txt`,
`night-output.txt`, `night.ps1` added to `.gitignore` and not committed.

### 2.7 Booking status transitions — done
- New `src/lib/bookings/bookingStatus.ts` with the allowed transitions; `cancelled` and
  `completed` are final. Cannot complete a cancelled booking, cannot cancel a completed one,
  and repeating a final status is refused too (no double visit count, no second
  cancellation SMS). Error → `booking_status_conflict` (409, already translated).
- `updateBookingStatus` and `cancelBooking` check the transition inside the write on fresh
  data; `cancelBooking` now deletes the Google event only after the status is saved.
- `completedAt` added to the `Booking` type; `extra` is typed `Partial<Booking>`.
- Decisions: completing pending / reschedule_requested stays allowed (the doctor may mark a
  visit done without a formal confirm); `lastVisitDate` never moves backwards when an older
  booking is completed later.
- Verified offline: all refused cases, parallel double "complete" → visit counted once.

### B.1 Next.js upgrade — done
- `next` and `eslint-config-next` 16.2.6 → 16.3.7 (latest 16.x). This fixes the critical
  advisories (RCE on Windows-hosted servers and via AVIF in Image Optimization, both fixed
  in 16.3.3) and the high/moderate ones fixed in 16.2.11. Same major version, no code changes.
- lint/typecheck/build pass. New lint *warnings* (not errors) from a rule added in 16.3:
  `no-location-assign-relative-destination` for `window.location` redirects on 401 in admin
  pages. Left as is — it's the 401-handling rework planned in audit Queue 5.5.
- Smoke test on a real `next start` (port 3100) run from an isolated directory: junctions
  to `.next`/`node_modules`/`public`, a *copy* of storage, no `.env.local`, test-only admin
  password in the process env, Google disabled, no Telegram token → no external calls.
  Checked: landing and all 11 admin pages load (200, `/admin` → 307 redirect); site-data
  (with server `today`), availability, past date → `date_out_of_range`; admin API 401 without
  a session, login works, 7 admin endpoints 200 with a session; bad schedule →
  `time_range_invalid`; webhook without secret → 401. Real storage untouched.

### B.2 npm audit fix (no --force) — done
- Updated in the lockfile: postcss 8.5.28, sharp 0.35.5, nanoid 3.3.19, brace-expansion
  (1.1.21 / 2.1.7 / 5.0.12), baseline-browser-mapping 2.11.26. Production audit: 9 → 3.
- Remaining: `xlsx` (high, no fix exists) → removed in B.3; `uuid <11.1.1` (moderate) via
  `exceljs` — only fixable with `--force` (downgrades exceljs to 3.4.0, breaking). Not
  reachable here: exceljs only calls `uuid.v4()`, the advisory concerns v3/v5/v6 with a
  caller-supplied buffer. Decision: leave it, no forced downgrade.
- `next-env.d.ts` regenerated by the Next 16.3 build (adds `root-params.d.ts`); committed.
- lint/typecheck/build pass.

### B.3 xlsx → exceljs in client import — done
- New `src/lib/clients/spreadsheetRows.ts`: .xlsx via exceljs (already a dependency, used for
  export), .csv via a small RFC 4180 parser (all cells stay strings → phone leading zeros
  kept; `,` `;` or tab detected; UTF-8/BOM, falls back to Windows-1251). Format is detected
  by content (zip signature), not by name. `parseClientImportWorkbook` is now async.
- `scripts/import-clients-from-excel.mjs` switched to exceljs with the same logic.
- `xlsx` removed from dependencies. Production audit now: 2 moderate (uuid via exceljs,
  see B.2), 0 high, 0 critical.
- Checked against a baseline recorded with the old xlsx code on the same files
  (`imports/clients-template.xlsx` + generated xlsx/csv fixtures in the scratch dir):
  identical results except these intended differences:
  1. Date cells → `1990-01-15` (old: US text `1/15/90`, even with a dd.mm.yyyy format).
  2. Row numbers in the preview now match the real spreadsheet row (old skipped blank rows).
  3. A title row above the header is skipped: header = first row with a phone column.
  4. `;`-separated CSV (Russian/Armenian Excel default) now works (old: nothing mapped).
  Also: Windows-1251 CSV, corrupt zip → "Import file is empty", multiline quoted cells.
- CLI script run only with cwd = temporary storage copy; import-preview route tested on the
  isolated server with a test session. Real data untouched.

### B.4 Auto-completion of past bookings — done
- New `src/lib/bookings/autoCompleteBookings.ts`: every `confirmed` booking whose end time
  (clinic zone) has passed → `completed` + `completedAt`; the client's `visitsCount` is
  increased and `lastVisitDate` set (never moved backwards) *in the same write*, so parallel
  runs cannot double count. If nothing is due, the data file is not rewritten.
- Triggers: server start (`src/instrumentation.ts`; skipped during `next build`, verified
  the build leaves storage untouched) and opening the admin — `GET /api/admin/bookings`
  (dashboard, bookings, calendar), `/api/admin/calendar/bookings`, `/api/admin/clients`,
  throttled to once per 5 minutes per process; failures are logged, never break a page.
- Decisions: "recalculation" = increment by the newly completed visits, not recount from
  scratch (a recount would wipe visit counts imported from Excel). Bookings without a
  client card are completed but no client is touched.
- Copy first: harness (26 completed, 5 clients, parallel runs counted once, future and
  not-yet-ended bookings untouched, no rewrite when idle) and the isolated `next start`
  (startup hook completed 26 on the copy; admin endpoints 200).
- Then real data. Snapshot before:
  `storage/app-data.json.before-autocomplete-20260929-204846.bak` (kept).
  Result: 26 bookings confirmed → completed; 5 clients updated
  (visits 10 / 3 / 1 / 1 / 1, last visits 2026-07-08 … 2026-08-12). Compared with the snapshot:
  no other booking field changed, clients/queue/logs/services/schedule identical; the only
  other difference is `settings.minBookingLeadMinutes: 60` written by `mergeWithDefaults`
  (the default added in 2.3 — same value as before, now explicit).
- To undo: stop the server and copy the snapshot back over `storage/app-data.json`.

### B.5 SMS demo mode — done
- Every SMS provider now declares `canDeliver`. None can today (mock only logs, `gsm` is a
  not-connected stub, `http` is a skeleton), so the app is in **demo mode**:
  - stub providers are never called → no failed items / provider errors are produced
    (with `.env.local` as it is: `SMS_PROVIDER=gsm`, `SMS_AUTO_SEND_ENABLED=true`);
  - the admin SMS page shows a "Демо-режим…" banner (hy/ru/en), the auto-send switch is
    disabled with an explanation, "Send now" answers "not sent, stays in the queue";
  - the SMS API hides old provider errors (failed logs / `lastError`) in demo mode.
  The mock provider keeps its old dev behaviour (logs and marks "sent").
- `Settings.smsProvider` — decision: **removed from the Settings UI**, not used. Using it
  would let a UI click switch providers; the env variable stays the only source (safer).
  The field stays in the type/data for compatibility.
- Reminders are stored as UTC ISO: 09:00 clinic time N days before the visit
  (was a zone-less local string compared with UTC "now" — bug #11). "Today" for reminder
  generation uses the clinic zone. `mergeWithDefaults` normalises every `scheduledAt` to UTC
  ISO (idempotent), so old items migrate automatically.
- Real data migrated with a snapshot first:
  `storage/app-data.json.before-sms-utc-20260929-205312.bak` (kept). Exactly 4 zone-less
  reminder times changed (`…T09:00:00` → `…T05:00:00.000Z`); everything else identical.
- Real sending was **not** enabled; nothing was sent anywhere.
- Verified: harness (demo gating, stub never called, `demo_mode` reason, no failed logs,
  UTC reminder, migration, mock unchanged) and isolated `next start` with `SMS_PROVIDER=gsm`,
  `SMS_AUTO_SEND_ENABLED=true` and admin auto-send on: runtime `demoMode: true`, no provider
  error in the API, all queue times UTC, "send now" → `demo_mode`, 0 calls to the GSM stub.

---

# ИТОГОВЫЙ ОТЧЁТ ЗА НОЧЬ (29.09.2026)

## Что сделано
Все задачи из обоих сообщений выполнены: Очередь 2 (2.0–2.7) и Часть B (B.1–B.5).
Откатывать ничего не пришлось. После каждой задачи проходили `npm run lint`,
`npm run typecheck`, `npm run build`, и каждая задача — отдельный коммит.

| Задача | Коммит | Коротко |
|---|---|---|
| 2.0 Часовой пояс | `fd3c34d` | `CLINIC_TIMEZONE`, модуль времени клиники без новых зависимостей |
| 2.1 Google Calendar | `2453399` | freeBusy из UTC во время клиники, события через полночь и многодневные |
| 2.2 Перенос в Telegram | `9f86c66` | слот из сохранённого списка, перепроверка, лимит 64 байта |
| 2.3 Прошлое и горизонт | `807c2d0` | запас 60 мин (настройка), даты до сегодня/после горизонта отклоняются, «сегодня» с сервера |
| 2.4 Двойная запись | `c866d73`, `182ef2e` | проверка и сохранение в одной записи, 409 `slot_taken`, сообщение на лендинге hy/ru/en |
| 2.5 Услуги | `2ce25c8` | нельзя удалить услугу с будущими записями, записи используют `servicesSnapshot` |
| 2.6 Расписание | `c3b5868` | 00:00–23:59, начало < конца, перерывы, уникальный день, блокировки |
| 2.7 Статусы | `a897079` | отменённую нельзя завершить, завершённую нельзя отменить, `completedAt` |
| B.1 Next.js | `968d710` | 16.2.6 → 16.3.7, закрыты critical-уязвимости |
| B.2 npm audit fix | `8e5e455` | без `--force`: 9 уязвимостей → 3 |
| B.3 xlsx → exceljs | `1b6ef22` | импорт клиентов без SheetJS; осталось 2 moderate, 0 high, 0 critical |
| B.4 Автозакрытие | `a889606`, `ed810b3` | завершённые визиты закрываются при старте и при открытии админки |
| B.5 SMS демо-режим | `e8411d0` | ошибки провайдера не показываются, напоминания в UTC, выбор провайдера убран из настроек |

Плюс служебные коммиты с записями в журнал (`1275c60`, этот отчёт).
Всё только локально, `git push` не делался.

## Изменения в реальных данных (`storage/app-data.json`)
Перед каждым изменением делался снимок, все снимки лежат в `storage/`:
1. `app-data.json.before-queue2-20260929-200005.bak` — исходное состояние до ночи.
2. `app-data.json.before-autocomplete-20260929-204846.bak` — до B.4. После: 26 записей
   `confirmed` → `completed`, у 5 клиентов обновлены `visitsCount` и `lastVisitDate`.
3. `app-data.json.before-sms-utc-20260929-205312.bak` — до B.5. После: 4 времени
   напоминаний переведены в UTC ISO, всё остальное совпадает байт в байт.
Кроме того, появилось явное поле `settings.minBookingLeadMinutes: 60` (значение по умолчанию).
Откат: остановить сервер и скопировать нужный `.bak` поверх `storage/app-data.json`.

## Что проверено и как
- Офлайн-стенд: код компилируется в scratch-каталог, данные — временная копия `storage`,
  любой `fetch` заблокирован, переменные Telegram/Google/SMS удалены. Ни одного сетевого
  запроса за ночь.
- Параллельные запросы: 2 и 10 одновременных записей на один слот → ровно одна, остальные 409.
- Google Calendar: только на примерах ответа freeBusy, к реальному календарю обращений не было.
- Живой сервер `next start` (порт 3100) из изолированного каталога: копия данных, без
  `.env.local`, тестовый пароль только в окружении процесса. Проверены лендинг, все
  страницы админки, публичный и админский API, импорт клиентов, SMS в демо-режиме, хук
  автозакрытия при старте.

## Что отложено и почему
- `uuid` (moderate, через exceljs): исправляется только `npm audit fix --force` с понижением
  exceljs до 3.4.0 (ломающее изменение). В нашем коде уязвимость недостижима:
  exceljs вызывает только `uuid.v4()`.
- Новые предупреждения ESLint из Next 16.3 (`window.location` при 401 в админке, 29 штук) —
  это не ошибки. Их исправление входит в задачу 5.5 (единый обработчик 401).
- Реальная отправка SMS не включалась (по заданию). Внимание: в очереди 19 старых сообщений
  со временем в прошлом (июль–август). Перед подключением настоящего провайдера их нужно
  отменить в /admin/sms, иначе клиенты получат устаревшие напоминания.
- Защита от двойной записи работает в пределах одного процесса сервера; для нескольких
  серверов нужна база данных (Очередь 6.1).

## Что проверить в браузере
1. Лендинг: выберите услугу и дату. Сегодняшние слоты должны начинаться не раньше чем
   через час от текущего времени, даты — только в пределах горизонта.
2. Откройте лендинг в двух вкладках, выберите одно время и отправьте обе заявки: во второй
   должно появиться «Это время только что заняли, выберите другое» и обновиться список.
3. /admin/settings: новое поле «Минимальный запас до записи (минуты)», поля «SMS provider» нет.
4. /admin/schedule: попробуйте начало позже конца или перерыв вне рабочего дня — должна
   появиться понятная ошибка, а не «Данные заполнены неверно».
5. /admin/services: удаление услуги, у которой есть будущая запись, должно быть запрещено
   с пояснением, а выключение (active) — разрешено.
6. /admin/bookings: 26 старых подтверждённых записей теперь «Завершена». Завершённую
   нельзя отменить.
7. /admin/sms: синий баннер «Демо-режим…», переключатель автоотправки неактивен,
   «Отправить сейчас» пишет, что сообщение осталось в очереди.
8. /admin/clients → импорт: `.xlsx` и `.csv` (в том числе с `;`) показывают предпросмотр.

## Что проверить в Telegram
1. Создайте тестовую заявку на сайте → в чате придёт сообщение с кнопками.
2. «Предложить другое время» → появятся до 5 кнопок со временем. До этой ночи эти кнопки
   не работали вообще: `callback_data` был длиннее допустимых 64 байт.
3. Нажмите вариант → ответ «Вариант отправлен клиенту», статус заявки — «перенос».
   (SMS клиенту не уйдёт: демо-режим.)
4. Нажмите «Отменить» на уже завершённой записи → «Запись уже отменена или завершена».
5. Если настроен Google Calendar: подтвердите заявку и убедитесь, что событие появилось
   в правильное время. Раньше занятость читалась со сдвигом на 4 часа — теперь сдвига
   быть не должно.

## Переменные для `.env.local`
- `CLINIC_TIMEZONE=Asia/Yerevan` — можно не добавлять: это значение по умолчанию.
  Указывайте явно, если нужна ясность или клиника сменит пояс.
- Другие новые переменные не нужны. Действующие требования Очереди 1 остаются:
  `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `TELEGRAM_WEBHOOK_SECRET` должны быть заполнены.
- Для SMS менять ничего не нужно: пока провайдер-заглушка (`gsm`), приложение само
  остаётся в демо-режиме, даже при `SMS_AUTO_SEND_ENABLED=true`.
- После `git pull` на сервере нужны `npm install` (обновлён Next.js, удалён `xlsx`)
  и `npm run build`.

---

# Ночь 3 — задачи C.1–C.6 (начато 29.09.2026)

База: `f21c88f`. Правила прежние: lint + typecheck + build + отдельный коммит после каждой
задачи, тесты только на копии данных, без реальных Google/Telegram/SMS, без push.
`NIGHT_DONE.txt` удалён, `NIGHT_PROMPT.md` перезаписан новым текстом.

### C.1 Портфолио: коричневый квадрат после замены фото — готово
- Причина (воспроизведено на изолированном `next start`, порт 3100): `next start` отдаёт из
  `public/` только файлы, которые были там на момент `next build`. Фото, загруженное позже в
  `public/uploads/portfolio/`, отвечало 404; на лендинге `onError` прятал `<img>`, и был виден
  фон карточки `bg-champagne-glow` — тот самый «коричневый квадрат». Кэш next/image ни при чём
  (везде `unoptimized`), путь сохранялся правильно.
- Исправление: новый обработчик `src/app/media/portfolio/[fileName]/route.ts` читает файл с диска
  при каждом запросе (строгая проверка имени, без `..`/слэшей, 404 на неизвестное). Загрузка
  теперь возвращает `/media/portfolio/<имя>`. Старые URL `/uploads/portfolio/…` продолжают
  работать: в `next.config.mjs` fallback-rewrite на `/media/portfolio/…` (файлы, бывшие при сборке,
  по-прежнему отдаются напрямую). Данные не мигрировались — не нужно.
- Кэш: каждое загруженное фото получает новое уникальное имя, поэтому `immutable` безопасен —
  при замене меняется URL.
- В форме админки добавлен предпросмотр текущего фото (видно, что замена сработала до сохранения).
- Проверено на `next start` с копией данных: существующее фото 200, новое 200 (байты совпадают),
  новое по старому URL 200, `..%2F` → 404; добавление → на лендинге новый URL, замена → новый URL
  отдаётся, старый ушёл из данных, удаление → число фото вернулось к исходному.
- Решение: старый файл при замене с диска не удаляется (на него может ссылаться другая карточка).

### C.2 Ручная запись: поиск клиента с автодополнением — готово
- Новый `src/lib/clients/clientSearch.ts`: имя/фамилия/телефон приводятся к латинскому «скелету»
  (транслитерация армянского и кириллицы + свёртка вариантов написания kh/x/h, ts/c, zh/j,
  y перед гласной, двойные буквы). Проверено: Արամ/Арам/ARAM, Խաչատրյան/Хачатрян/Khachatryan,
  Ժաննա/Жанна/Zhanna, Եղիշե/Егише/Yeghishe → совпадают. Регистр не важен. Телефон ищется по
  цифрам, в т.ч. в местной форме `091…` для +374. Подстрочный поиск — только от 3 символов,
  чтобы «ан» не находил всех подряд. Ограничение: Հ/Г (Հակոբ ↔ Акоп) не сводятся — это разные
  звуки в транслитерации, сознательно не склеивал.
- `ManualBookingModal` (используется и кнопкой «+», и календарём): вместо `<select>` —
  поле поиска с подсказками (стрелки/Enter/Esc, мышь), карточка выбранного клиента с кнопкой
  «Сменить». Если набранный телефон уже есть в базе — клиент подставляется автоматически и
  показывается зелёная плашка «Клиент с этим телефоном уже есть — выбран автоматически».
- Решение: при выбранном клиенте поля «Имя» и «Телефон» скрыты — раньше ручная запись могла
  молча переписать имя существующего клиента (сервер делает upsert по телефону).
- Дата по умолчанию теперь «сегодня» в поясе клиники (было UTC). Добавлен проп
  `initialStartTime` (понадобится в C.3).
- Проверено на копии данных (`next start`): запись с телефоном клиента в местном формате
  `093 ******` (номер скрыт при F.3) → привязана к существующему клиенту, число клиентов 6 → 6.

### C.3 Календарь День / Неделя / Месяц — готово
- Одна страница `/admin/calendar`, переключатель «День / Неделя / Месяц» (выбор запоминается в
  localStorage; при первом заходе с телефона открывается «День»).
- Неделя и день — новая сетка по часам `CalendarTimeGrid`: шаг 30 минут (строка 44px — удобно
  пальцем), записи цветом статуса, пересекающиеся записи рядом по дорожкам, перерывы и блокировки
  заштрихованы, выходной подписан, красная линия «сейчас». Неделя на телефоне прокручивается
  по горизонтали с закреплённой колонкой времени. Клик по дню недели → режим «День».
- Свободные слоты считает сервер: `src/lib/availability/calendarSchedule.ts` вызывает тот же
  `computeAvailability`, что и публичная запись, с «услугой» 30 минут — значит учитываются рабочие
  часы, перерывы, блокировки, занятость Google и активные записи. Нижняя граница — «сейчас»
  (как в ручной записи), прошедшее время слотов не имеет. Ошибка Google не ломает календарь.
  `GET /api/admin/calendar/bookings` теперь возвращает `schedule` рядом с `bookings`.
- Клик по свободному слоту → ручная запись с подставленными датой и временем (проверено: 30.09, 10:00).
- В месяце в ячейке дня — «N свободно».
- Внизу панель «Итоги за период»: всего, подтверждено, ожидают, отменено, завершено, свободных
  слотов (+ «не пришли» — добавится в C.4). Решения: итоги считаются по всем записям периода
  без учёта фильтров (иначе цифры не сходятся); «ожидают» = pending + запрос переноса; для месяца —
  только дни самого месяца, без хвостов соседних.
- Замечено при проверке (исправлю в C.5): в армянском интерфейсе Chromium выводит даты
  по-русски (нет данных `hy-AM` в Intl); подпись «Длительность» у поля времени окончания в ручной
  записи. Также в консоли React #418 (hydration) — разберу в C.5.

### C.4 Статус «не пришёл» (no_show) — готово
- Новый статус `no_show` (+ поле `noShowAt`). Переходы (`bookingStatus.ts`):
  confirmed → no_show, completed → no_show (исправление: визит засчитали автоматически, а клиент
  не пришёл), no_show → completed («Всё-таки пришёл» — исправление ошибки). Из pending/переноса —
  нельзя (визит не был подтверждён), no_show нельзя отменить, повторный no_show → 409.
  Отметить можно только после начала записи (время клиники) — иначе 409 `booking_not_started`.
- visitsCount/lastVisitDate пересчитываются в той же атомарной записи данных:
  completed → no_show уменьшает счётчик (не ниже 0), и если последний визит был в этот день,
  берётся дата последнего другого завершённого визита; no_show → completed — обратно.
  (`updateBookingStatus` теперь меняет клиента внутри `updateData`, а не отдельным вызовом.)
- Telegram: в сообщении врачу статус теперь человеческий («Ավարտված / Завершена»,
  «Չներկայացավ / Не пришёл» и т.д.) вместо `completed`; при завершении и no_show сообщение
  обновляется («✔️ Визит завершён» / «🚫 Клиент не пришёл»), кнопки убираются. SMS клиенту не шлётся.
- UI: кнопка «Не пришёл» в карточке записи (календарь) и в списке записей; на странице записей
  теперь показываются только допустимые для статуса действия (раньше все кнопки всегда, сервер
  отвечал 409). Фильтры (список и календарь) — новый статус; календарь — оранжевый цвет, в сетке
  приглушён; итоги периода — «Не пришли»; дашборд — карточка «Не пришли», «сегодня» по поясу клиники.
- Проверено на копии данных через API: completed(18.08) → no_show: визиты 1→0, последний визит
  убран; повтор → 409; отмена no_show → 409; «Всё-таки пришёл» → 1 и 18.08 вернулись; будущая
  confirmed → 409 booking_not_started; pending → 409. Telegram — только мок-лог.

### C.5 Полный перевод hy/ru/en — готово
- Язык: новый `src/lib/i18n/languageStore.ts` на `useSyncExternalStore`. Раньше каждый компонент
  админки держал язык в собственном `useState` и читал localStorage прямо при первом рендере —
  отсюда ошибка гидратации React #418 (виделась в консоли при сохранённом ru/en). Теперь при
  гидратации рендерится армянский (серверный снимок), затем сохранённый язык; все компоненты
  переключаются одновременно. Админка: ключ `dr_edgar_admin_language`; лендинг теперь тоже
  запоминает выбор (`dr_edgar_site_language`). Армянский — по умолчанию.
- Даты: Chromium не содержит армянских данных Intl и выводил `hy-AM` по-русски («вторник,
  29 сентября»). Новый `src/lib/i18n/formatDate.ts`: армянский по своим таблицам (месяцы в
  родительном падеже, сокращения), ru/en через Intl. Все видимые даты в админке (записи, дашборд,
  клиенты, карточка клиента, процедуры, фото, блокировки, SMS-очередь и журнал, карточка записи)
  и на лендинге (выбор даты) идут через него; сырые `2026-09-30` в интерфейсе больше не выводятся.
  Числа — единый `formatNumber` (15 000).
- Проверка: скрипт Playwright обходит лендинг и все 11 страниц админки на трёх языках и ищет
  в видимом тексте «чужой» алфавит и латиницу. Остались только: названия языков в переключателе
  (так и задумано), бренд (Dr. Edgar, UltraFormer, Instagram, SMS, AMD), подписи полей вида
  «Название (Рус)» (это указание языка поля) и данные пользователя — имена, тексты SMS, адрес
  из настроек (данные не переводятся по заданию).
- Переписаны «технические» тексты для врача: подсказка входа (было «ADMIN_PASSWORD из окружения
  backend»), подзаголовок и предупреждение настроек (backend env / mock), статус SMS-провайдера
  («Демо-режим (только запись в журнал)» вместо «mock · Mock»).
- Мелочи: подпись «Длительность» у поля окончания в ручной записи → «Конец»; кнопка входа
  `type="submit"`; фавикон (был 404 на каждой странице); заголовок страницы; сырые английские
  ошибки импорта/портфолио → переведённые.
- Серверные тексты не трогал: сообщения врачу в Telegram (двуязычные hy/ru), SMS-шаблоны
  клиентам (их редактирует врач), листы экспорта Excel.

### C.6 Автотесты Playwright — готово
- `@playwright/test` 1.63.0 (dev), `playwright.config.ts`, команда `npm run test:e2e`
  (= `next build && playwright test`). Один воркер: тесты делят один сервер и его данные.
- Данные — НЕ реальные: `e2e/server.mjs` создаёт временный каталог в `%TEMP%\edgar-e2e-*`,
  кладёт туда синтетические данные из `e2e/seed.mjs` (выдуманные клиенты и записи, даты считаются
  от «сейчас» в поясе клиники), `public/images`, пустую папку загрузок и ссылки (junction) на
  `.next` и `node_modules`, и запускает там `next start` на порту 3210. Telegram/Google/SMS
  принудительно выключены (переменные удаляются из окружения, SMS = mock), `.env.local` не
  читается. Удаление временного каталога сначала снимает ссылки и только потом удаляет папку —
  проверено на макете, что настоящие `.next`/`node_modules` не задеваются. Реальный
  `storage/app-data.json` после прогонов не менялся.
- 13 тестов (`e2e/booking.spec.ts`, `admin.spec.ts`, `i18n.spec.ts`): запись клиентом на лендинге;
  запрет прошедшего времени (вчера нет в UI, сервер → 400 `date_out_of_range`, сегодняшние слоты
  только после «сейчас»); две одновременные записи на слот → 201 и 409; вход (неверный пароль →
  ошибка, верный → панель); подтверждение, отмена, no_show с проверкой visitsCount и фильтра;
  календарь день/неделя/месяц и запоминание вида; ручная запись со свободного слота + поиск
  «хачатрян» → «Արամ Խաչատրյան» + автоподстановка клиента по телефону + отсутствие дублей;
  портфолио: добавление, замена (фото реально загружается — naturalWidth > 0), показ на сайте,
  удаление; переключение трёх языков на лендинге и в админке с запоминанием; нет ошибок в консоли.
- Скриншоты: `test-results/screenshots/` — лендинг, панель, календарь неделя/месяц, записи,
  клиенты, SMS, портфолио и мобильный «день» на hy/ru/en + экраны действий (31 файл).
  `test-results/` добавлен в `.gitignore`.
- Найдено тестами и исправлено: **на лендинге нельзя было переключить язык** — блок контента
  Hero (`z-10`) перекрывал верхнюю панель с переключателем (тоже `z-10`); панель теперь `z-20`.
  По скриншотам: поле поиска в фильтрах календаря сжималось в кнопку на широком экране; точка
  «Не пришли» в итогах сплющивалась.
- Добавлены `data-testid` в форму записи, услуги, строки записей; `tsconfig` включает `e2e/`.
- Результат: 13 passed (~50 с).

## D. Предпочтительный канал связи

### D.1 + D.5 Данные и архитектура каналов — готово
- Тип `MessageChannel = sms | whatsapp | viber | telegram`. Поле `Client.preferredChannel`
  (по умолчанию `sms`), снимок `Booking.preferredChannel`, `channel` у каждой записи очереди и
  журнала сообщений.
- Миграция: в коде — при чтении данных недостающие значения становятся `sms` (идемпотентно);
  явный скрипт `scripts/migrate-preferred-channel.mjs` (сам делает снимок). Сначала прогнан на
  копии (совпадает всё, кроме новых полей; повторный запуск — «Nothing to migrate»), затем на
  реальных данных (сервер не был запущен): снимок
  `storage/app-data.json.before-channels-20260929-182715.bak`; 6 клиентов, 22 записи очереди,
  журнал пуст.
- Архитектура (`src/lib/messaging/`): общий интерфейс `MessageProvider` (channel, name,
  canDeliver, logOnly, send) и реестр `getChannelProvider(channel)`. SMS — существующие адаптеры
  (mock/gsm/http) без изменений поведения; WhatsApp/Viber/Telegram — `DemoChannelProvider`:
  только запись в лог сервера, никаких сетевых запросов. `channelStatuses()` отдаёт в админку
  состояние каждого канала («не подключён» для всех сейчас).
- `smsService`: сообщение ставится в очередь в канал клиента (подтверждение, напоминания,
  отмена/перенос, рассылки, «заявка получена»); отправка идёт через провайдер канала; «шлюз
  безопасности» теперь по каналу: log-only провайдеры (mock SMS, демо-каналы) безопасны, реальный —
  только при canDeliver + env-флаге + настройке. При SMS_PROVIDER=gsm SMS по-прежнему остаются
  в очереди (демо-режим), ничего реального не включено.
- Смена канала (`setClientChannel`) одной записью меняет клиента, его открытые записи и ещё не
  отправленные сообщения очереди; отправленные/журнал сохраняют свой канал. Доступна из карточки
  клиента (PATCH) и из записи (действие `setChannel`); неизвестный канал → 400.
- Проверено на копии данных (`next start`): запись с WhatsApp → клиент/запись/очередь `whatsapp`,
  журнал `whatsapp-demo`; подтверждение → напоминание в WhatsApp; смена на Viber из записи →
  запланированное напоминание стало Viber, отправленные — нет; PATCH клиента → Telegram.

### Остановка (лимит использования) — продолжить отсюда
Сделано: C.1–C.6, D.1, D.5 (коммиты `11a5b75`…`226f064`). НЕ сделано: D.2 (выбор канала на
лендинге), D.3 (канал в админке: карточка клиента, запись, ручная запись, список + фильтр),
D.4 (канал в очереди/журнале SMS-страницы + фильтр, статус каналов из `runtime.channels`),
D.6 (Playwright), итоговый отчёт. Серверная часть для D.2–D.4 уже готова: API принимают
`preferredChannel`, действие `setChannel`, `runtime.channels` в `/api/admin/sms`.
`NIGHT_DONE.txt` не создан.

### D.2 + D.3 Выбор канала на лендинге и в админке — готово
- Общие компоненты `src/components/ChannelIcon.tsx`: `ChannelIcon`, `ChannelBadge` (значок +
  название), `ChannelPicker` (4 кнопки, роль radiogroup). У lucide нет логотипов брендов —
  используются нейтральные значки в фирменных цветах (SMS — серый, WhatsApp — зелёный,
  Viber — фиолетовый, Telegram — голубой). Названия каналов — бренды, не переводятся.
- Лендинг: в форме записи блок «Куда вам удобнее получать напоминания?» с подсказкой (hy/ru/en),
  по умолчанию SMS; выбор уходит в заявку и сохраняется в клиенте и записи.
- Админка: карточка клиента — плашка канала в обзоре, выбор в редакторе клиента; карточка записи
  (календарь и карточка клиента) — выбор канала, изменение сразу сохраняется (действие
  `setChannel`), панель остаётся открытой; ручная запись — выбор канала (для выбранного клиента
  подставляется его текущий); список клиентов — колонка/плашка канала и фильтр «Все каналы / …».

### D.4 Каналы на странице сообщений — готово
- `/admin/sms`: блок «Каналы сообщений» — у каждого канала значок и понятный статус
  («Не подключён — демо-режим (только запись в журнал)»), пояснение, что сообщения ставятся
  в очередь в канал клиента и реально ничего не отправляется, пока канал не подключён.
- Очередь и журнал: колонка «Канал» (значок + название) и фильтр по каналу у обеих таблиц.
- Ошибок провайдера в демо-режиме по-прежнему не показываем.

### D.6 Playwright: каналы — готово
- `e2e/channels.spec.ts` (2 теста): клиент на лендинге выбирает Viber (SMS выбран по умолчанию) →
  в админке канал у клиента, фильтр «Viber» в списке клиентов, значок в шапке карточки клиента,
  на странице сообщений статус «Не подключён», сообщение «заявка получена» в журнале с каналом
  Viber (демо-провайдер); врач меняет канал в карточке записи на Telegram → «Канал сохранён»,
  клиент теперь Telegram, ручная запись для этого клиента подставляет Telegram.
- По ходу: канал был виден только во вкладке «Обзор» карточки клиента, а по умолчанию открыта
  вкладка «Записи» — значок канала добавлен в шапку карточки.
- Скриншоты: `landing-channel-choice-ru`, `admin-clients-channel-filter-ru`, `admin-sms-channels-ru`.
- Итог: `npm run test:e2e` — 15 passed.

---

# ИТОГОВЫЙ ОТЧЁТ — НОЧЬ 3 (задачи C.1–C.6 и D)

## Что сделано
| Задача | Коммит | Коротко |
|---|---|---|
| C.1 Портфолио | `11a5b75` | «коричневый квадрат»: `next start` не отдавал фото, загруженные после сборки; теперь их отдаёт `/media/portfolio/…`, старые ссылки работают |
| C.2 Поиск клиента | `5f0545e` | поиск по имени/фамилии/телефону с автодополнением, транслитерация hy/ru/lat, автоподстановка по телефону, без дублей |
| C.3 Календарь | `544e008` | День/Неделя/Месяц, сетка по часам, свободные слоты как в getAvailability, клик → ручная запись, панель итогов |
| C.4 No-show | `c000d98` | статус «не пришёл», пересчёт визитов, фильтры, статистика, календарь, Telegram |
| C.5 Перевод | `ca87b91` | общий запоминаемый язык (без ошибки гидратации), армянские даты, оставшиеся строки |
| C.6 Playwright | `d0029ec` | 13 тестов на копии данных, скриншоты; найден баг — на лендинге не переключался язык |
| D.1 + D.5 | `226f064` | канал у клиента/записи/очереди/журнала, миграция, реестр провайдеров, демо WhatsApp/Viber/Telegram |
| D.2 + D.3 | `2d77a4d` | выбор канала на лендинге, в карточке клиента, записи, ручной записи, список + фильтр |
| D.4 | `0e4b707` | канал в очереди/журнале, фильтр, статус каналов |
| D.6 | `8308477` | 2 теста на каналы; итого 15 passed |

Плюс записи в журнал (`59a9465`). Всё локально, `git push` не делался.

## Изменения в реальных данных
Одно: миграция каналов (D.1), сервер в этот момент не работал.
Снимок: `storage/app-data.json.before-channels-20260929-182715.bak`. 6 клиентов получили
`preferredChannel: "sms"`, 22 записи очереди — `channel: "sms"`; остальное не менялось
(проверено сравнением на копии). Откат: остановить сервер и скопировать `.bak` поверх
`storage/app-data.json`. Всё остальное тестировалось только на копиях.

## Как проверено
- После каждой задачи: `npm run lint` (0 ошибок; 32 старых предупреждения про `window.location`),
  `npm run typecheck`, `npm run build`.
- Изолированный `next start` на копии данных без `.env.local` — API и сценарии каждой задачи.
- `npm run test:e2e` — 15 тестов в Chromium на синтетических данных во временном каталоге
  (Telegram/Google/SMS выключены), все зелёные; 34 скриншота в `test-results/screenshots/`.
- Скрипт-обход всех страниц на трёх языках на «чужой» алфавит и латиницу (C.5).

## Что проверить руками
1. Лендинг: переключение языка (раньше кнопки не нажимались!), выбор языка сохраняется после
   перезагрузки; в форме записи — блок «Куда вам удобнее получать напоминания?».
2. /admin/portfolio: заменить фото карточки → новое фото сразу видно в админке и на сайте.
3. /admin/calendar: День/Неделя/Месяц; на телефоне по умолчанию «День»; клик по «+ 10:30» открывает
   ручную запись с этой датой и временем; внизу итоги периода.
4. Ручная запись: набрать фамилию по-русски для армянского клиента (или наоборот); набрать
   телефон существующего клиента — должна появиться зелёная плашка «Клиент … выбран автоматически».
5. /admin/bookings: у прошедшей подтверждённой/завершённой записи — кнопка «Не пришёл»; число визитов
   клиента уменьшается; «Всё-таки пришёл» возвращает; фильтр «Не пришёл».
6. Язык админки (Հայ/Рус/Eng) — вся страница переключается сразу и запоминается; даты на армянском.
7. Каналы: карточка клиента (значок в шапке, выбор в «Редактировать»), карточка записи в календаре
   (смена канала сохраняется сразу), список клиентов (колонка + фильтр), /admin/sms (статус каналов,
   колонка и фильтр «Канал»).
8. Telegram (реальный бот): после «Не пришёл» сообщение врачу обновляется на «🚫 Клиент не пришёл»,
   статус в сообщениях теперь словами («Ավարտված / Завершена»), а не `completed`.

## Замечания и ограничения
- WhatsApp/Viber/Telegram клиентам — только демо: сообщение пишется в журнал сервера. В журнале
  такие записи имеют статус «Отправлено» и провайдера `whatsapp-demo`/`viber-demo`/… — это значит
  «обработано демо-провайдером», реально никто ничего не получил (так же, как mock-SMS раньше).
- При `SMS_PROVIDER=gsm` SMS по-прежнему остаются в очереди (демо-режим) — поведение не менялось.
- Транслитерация не сводит разные звуки (Հակոբ ↔ Акоп).
- Для e2e нужен `npx playwright install chromium` на новой машине; `npm run test:e2e` сам делает сборку.
- Новые переменные в `.env.local` не нужны. После `git pull` на сервере: `npm install` (добавлен
  `@playwright/test` как dev-зависимость) и `npm run build`.

---

# НОЧЬ 4 — задачи F и E

### F.1 Демо-данные, сегменты, рейтинг активности — готово
- Прошлый запуск остановился посреди F.1 (незакоммиченные `bookingStats.ts`, `clientSegments.ts`,
  переводы `rating`, `tsx` + `vitest` в devDependencies) — продолжено с этого места.
- `npm run demo:setup` (`scripts/demo-setup.ts` → `src/lib/demo/demoData.ts`): сначала снимок
  `storage/app-data.json` + `storage/client-photos` в `storage/snapshots/before-demo-<время>/`,
  затем заменяет клиентов, записи, заметки, процедуры, фото клиентов, очередь и журнал сообщений.
  Услуги, график, портфолио, настройки и шаблоны сохраняются. Повторный запуск безопасен.
  Данные детерминированы относительно «сегодня» (фиксированный seed). Без `storage/` (свежий
  клон) берёт данные по умолчанию. `DEMO_STORAGE_DIR` — другой каталог. Сервер должен быть остановлен.
- Содержимое: 30 выдуманных клиентов (+37477000001…030; армянские имена армянским письмом,
  часть латиницей/кириллицей, 5 русских), 4 канала; ~120 записей: 3 месяца истории + 2 недели
  вперёд, все статусы, без пересечений, в рабочих часах, не в перерыв и не в блокировку
  (добавлена блокировка «Մասնագիտական սեմինար»); сегменты: VIP/постоянные, редкие, новые, спящие,
  потерянные, 2 в чёрном списке (с неявками); заметки и процедуры на армянском (препараты, дозы,
  зоны, реакция, рекомендации); 11 фото — сгенерированные абстрактные текстуры и «бланк
  согласия», без лиц (PNG кодируется node:zlib); очередь/журнал: sent/failed/skipped/scheduled/
  cancelled во всех каналах; запланированные сообщения — только в будущем.
- Применено к реальному storage (сервер не работал). Снимок: `storage/snapshots/before-demo-20260929-214019/`
  (имя по UTC; теперь имя снимка — по местному времени). Откат: скопировать оттуда `app-data.json`
  и `client-photos` в `storage/`.
- Найденные и исправленные ошибки расчётов (раньше логика была в странице клиентов):
  - сегменты пересекались (клиент мог быть одновременно «активным» и «потерянным»), проценты
    не давали 100 %; теперь active/sleeping/lost/new — ровно один сегмент на клиента;
  - клиент из онлайн-записи получает status "new" и оставался «новым» навсегда (даже с 10 визитами);
  - «последний визит» брался из любой записи, включая отменённые и будущие; дата «сегодня» — по UTC,
    а не по часовому поясу клиники;
  - «один визит»: `visitsCount === 1 || записей === 1` → теперь по завершённым визитам;
  - дашборд: «новые заявки» не учитывали запросы переноса; «сегодня» учитывал отменённые;
    «предстоящие» включали прошедшие ожидающие.
- Рейтинг активности (`rankClients`): по визитам, затем по сумме, затем по дате последнего визита;
  чёрный список и клиенты без визитов не участвуют; при равенстве — общее место. Блок «Рейтинг
  активности» (топ-5) на дашборде и в разделе клиентов; в списке у топ-10 значок «#N», у всех —
  значок сегмента («Активный»/«Спящий»/…), колонки «Визиты» и «Сумма», сортировка по визитам/сумме.
  На дашборде добавлены «Визиты за месяц» и «Выручка за месяц».
- Поиск в списке клиентов теперь тоже с транслитерацией (как в ручной записи).
- Vitest: `npm run test` — 28 тестов (сегменты, рейтинг, проценты, дашборд, итоги календаря,
  инварианты демо-данных: нет пересечений, рабочие часы, счётчики визитов, все статусы/сегменты).
- Проверено: lint (0 ошибок, 32 старых предупреждения), typecheck, build, `npm run test`,
  `npm run test:e2e` — 15 passed; просмотр дашборда и клиентов на копии демо-данных (`next start`
  без .env.local, ошибок в консоли нет).

### F.2 README, скриншоты, демо-режим — готово
- `README.md` (English) и `README.hy.md` (армянский), ссылки друг на друга: описание, функции,
  скриншоты, быстрый старт для Windows/macOS/Linux (Node.js ≥ 20.9, проверено на 24; добавлено
  `engines` в package.json), демо-вход, конфигурация, тесты, технологии, архитектура,
  безопасность, использование AI (Codex, Claude Code, Claude), планы.
- Решение: демо-режим. Раньше без `ADMIN_PASSWORD` вход в админку был невозможен, т.е. свежий
  клон «без .env.local» не работал. Теперь, если `ADMIN_PASSWORD` пуст И не настроено ничего
  реального (Telegram-токен, Google Calendar, не-mock SMS) И не `DEMO_MODE=false`, пароль —
  публичный `demo-edgar`; страница входа показывает подсказку (GET `/api/admin/login` →
  `{demoMode}`). Любая реальная интеграция выключает демо-режим → поведение как раньше (вход
  закрыт без пароля). Unit-тесты на эти условия (`src/lib/admin/auth.test.ts`).
  На сервере клиники `.env.local` содержит `ADMIN_PASSWORD` и токены → демо-режим там не включится.
- `.env.example`: пояснения, демо-пароль `ADMIN_PASSWORD=demo-edgar` (с предупреждением
  заменить), `DEMO_MODE`.
- Скриншоты `docs/screenshots/` (19 шт., hy и en): сделаны скриптом `scripts/take-screenshots.mjs`
  на временной копии, где данные созданы `demo:setup` с нуля (т.е. как у свежего клона: портфолио
  по умолчанию, без загруженных реальных работ из `public/uploads`), сервер без каких-либо env.
- Попутно: у VIP-клиентов в демо было «VIP VIP» в карточке (status "vip" + флаг isVip) — в демо
  теперь только флаг.
- Внимание: на главной странице — фото доктора `public/images/doctor.jpg` и адрес/Instagram из
  настроек по умолчанию; они уже были в репозитории. Проверьте, что их можно публиковать.
- Проверено: lint (0 ошибок), typecheck, `npm run test` 34 passed, `npm run test:e2e` 15 passed.

### F.3 Проверка всей истории git на секреты и личные данные — готово
Проверено 37 коммитов (`git log --all -p`, ~52 тыс. строк) + имена файлов, когда-либо добавленных
в историю. История НЕ переписывалась.
- Токены/ключи: шаблоны Telegram-токена (`123456:ABC…`), `BEGIN … PRIVATE KEY`, Google API
  (`AIza…`), `sk-…`, `ghp_…`, Slack, e-mail сервисного аккаунта Google, ID чата Telegram
  (`-100…`), ID календаря Google, присвоения `ADMIN_PASSWORD=`/`TELEGRAM_*=`/`GOOGLE_*=`/
  `SMS_API_KEY=` с непустым значением — **не найдено**. Единственное значение —
  `ADMIN_PASSWORD=demo-edgar` в `.env.example` (публичный демо-пароль, так задумано).
  Пароли в коде — только тестовые (`e2e-admin-password`, `real-secret` в unit-тесте).
- `.env`, `.env.local`, `storage/`, загрузки, `.bak` — в историю **никогда не попадали**.
- Сверка с реальными (тестовыми) данными из снимков `storage/*.bak` и
  `storage/snapshots/before-demo-*`: все имена, телефоны (с учётом пробелов/дефисов), e-mail,
  ID чата Telegram, ID событий Google. **Найдено одно совпадение:**
  - телефон одного клиента из старых данных (номер здесь не приводится) — в `NIGHT_LOG.md` (запись о
    проверке C.2), коммит `5f0545e` и последующие версии файла. Имени рядом нет. В текущей версии
    номер замаскирован, но **в истории он остаётся**. Если номер реальный и это важно — перед
    публикацией нужно переписать историю (например, `git filter-repo --replace-text`) или
    публиковать репозиторий с новой историей; сам я историю не трогал по правилам.
- Прочее, что станет публичным (не секреты, но решите сами):
  - автор коммитов: `aren22593 <aren22593@gmail.com>` во всех 37 коммитах (e-mail будет виден на
    GitHub; можно включить «Keep my email private» только для будущих коммитов);
  - `public/images/doctor.jpg` — фото доктора (есть с первого коммита `df537c3`); EXIF без GPS,
    только отметки Photoshop от 2022-07-22;
  - адрес «Երևան, Սայաթ-Նովա 33» и Instagram `@dr.edgar__` — публичные контакты клиники в
    настройках по умолчанию;
  - в тестах и демо — только выдуманные номера (`+37477000001…030`, `+37491123456`,
    `+37499111222`, `+37455…`, `+37477000111`) и `example.com`.
- `AUDIT_REPORT.md` и `NIGHT_LOG.md` описывают найденные и закрытые уязвимости — секретов в них нет.

### F.4 Проверка «как у жюри» — готово
`git clone` репозитория (коммит `65e65ce`) во временную папку, без `.env.local`, без `storage/`,
строго по README:
- `npm ci` — ок (36 с); `npm run demo:setup` — 30 клиентов, 123 записи, 11 фото (снимка нет —
  данных ещё не было); `npm run build` — ок; `npm start` → http://localhost:3000: лендинг 200,
  `/api/admin/login` → `demoMode: true`, вход с `demo-edgar` успешен, клиенты и фото клиента
  отдаются.
- `npm run lint` (0 ошибок), `npm run typecheck`, `npm run test` (34 passed),
  `npx playwright install chromium`, `npm run test:e2e` — **15 passed** (параллельно с работающим
  `npm start` на 3000; e2e использует свой порт 3210).
- Исправлять в README ничего не пришлось. Проверено только на Windows (PowerShell/Git Bash);
  команды для macOS/Linux те же, e2e-сервер использует символические ссылки, которые на POSIX
  создаются обычным `symlink`.
- Временные папки удалены (сначала сняты junction-ссылки на `.next`/`node_modules` проекта,
  затем удалены сами папки).

### E.1 Единая обработка 401, ESLint без предупреждений — готово
- `src/lib/admin/adminFetch.ts`: `adminFetch` — обёртка над `fetch` для `/api/admin/*`; на 401
  один раз уводит на `/admin/login` (`location.replace` с абсолютным URL) и не завершает промис,
  поэтому страница не показывает ошибку/пустые данные во время перехода. `redirectToLogin()` —
  для выхода.
- Все 16 файлов админки переведены на `adminFetch`; удалены 32 ручные проверки `status === 401`
  (в 3 местах их не было вовсе: фото клиента, процедуры, редактор клиента — теперь тоже
  обрабатываются). Вход после логина — `router.replace`, выход — `redirectToLogin()`.
  Поведение для пользователя то же: без сессии → страница входа.
- ESLint: 32 предупреждения → 0; из проверки исключены локальные `.codex-backups/` и `storage/`
  (git-ignored). `npm run lint` теперь `eslint . --max-warnings=0`.
- Тесты: unit `adminFetch.test.ts` (2), e2e «истёкшая сессия на любой странице админки → вход».
- Проверено: lint 0/0, typecheck, `npm run test` 36 passed, `npm run test:e2e` 16 passed.

### E.2 Мёртвый код и дубли из AUDIT_REPORT §6 — готово
Удалено / объединено (поведение не менялось):
- `src/lib/sms/sendSms.ts` — файл без импортёров, удалён.
- `confirmationSms`, `cancellationSms` (и их хелпер) из `bookings/messages.ts`; `formatSlotLabel`;
  `isValidPhoneNumber`, `isValidArmenianPhone`; псевдонимы `normalizeArmenianPhone` →
  `normalizePhoneNumber`, `ARMENIAN_PHONE_ERROR` → `PHONE_ERROR` (одно имя вместо двух).
- `clientsRepository.getClients`, `deleteAllClients` (обёртки) — API вызывает `deleteAllClientsSafely`.
- `AdminShell` был пустой обёрткой над `AdminLayout`: содержимое `AdminLayout` перенесено в
  `AdminShell` (11 страниц импортируют его как раньше), `AdminLayout.tsx` удалён.
- Мёртвое поле `Settings.smsProvider` (тип, значение по умолчанию, схема, перевод). Старое значение
  в `app-data.json` безвредно остаётся. Из `.env.example` убраны `SMS_GSM_BAUD_RATE` и
  `NEXT_PUBLIC_SITE_URL` (0 использований).
- Дубли: проверка сигнатур/типов изображений → `src/lib/images/imageTypes.ts` (было 2 байт-в-байт
  копии); `warnSideEffect`/`sideEffectWarning` из 6 файлов → `sideEffectWarner(scope)` в
  `bookings/sideEffects.ts` (те же сообщения в логе); блок SMS-настроек ответа `/api/admin/sms` →
  `smsSettingsView()`.
Уже было исправлено раньше: `xlsx` заменён на `exceljs` (`1b6ef22`); `.gitignore` покрывает
`public/uploads/`, `imports/*`, `*.tsbuildinfo`, `.codex-*`.
Оставлено сознательно:
- `resendQueueItem` — используется API (`action: resend`); кнопки в UI нет, добавлять — это новая функция.
- `Booking.rescheduleOptions` — теперь читается (выбор слота в Telegram, `suggestReschedule.ts`).
- `Settings.telegramChatId` — поле в настройках ни на что не влияет (чат берётся из
  `TELEGRAM_CHAT_ID`), но его удаление меняет интерфейс настроек → оставлено; кандидат на удаление.
- Локальные `.codex-*.log` и `.codex-backups/` не в git, не трогал.
Проверено: lint 0/0, typecheck, `npm run test` 36, `npm run test:e2e` 16 passed.

### E.3 Unit-тесты Vitest — готово
`npm run test` (Vitest, `vitest.config.mts`, файлы `src/**/*.test.ts`): **88 тестов** в 10 файлах.
Новые в E.3:
- `time/clinicTime.test.ts` — граница суток Ереван/UTC, UTC↔время клиники, RFC3339 +04:00,
  `toUtcIso` для старых значений без зоны, `CLINIC_TIMEZONE` и откат при неверной зоне,
  строгий разбор HH:MM, `addDays` через месяц/год/29 февраля, `subtractInterval`.
- `phone/armenianPhone.test.ts` — местные форматы (0XX, 8 цифр, 374…, 00374…, скобки/дефисы),
  международные номера сохраняют код страны, отказ для мусора.
- `availability/getAvailability.test.ts` — шаг 30 мин, перерыв, конец дня, сумма услуг,
  выходной, неизвестная услуга, активные/отменённые записи, блокировки, занятость Google,
  минимальное время до записи и горизонт, перенос записи не блокирует сам себя (и своё событие
  Google); `assertSlotAvailableInData`: SLOT_TAKEN (409) и SLOT_UNAVAILABLE; окно записи.
- `sms/templates.test.ts` — подстановка переменных, пропуск отсутствующих без двойных пробелов,
  все шаблоны по умолчанию используют только известные переменные; текст переноса; «шлюз
  безопасности»: log-only провайдеры всех 4 каналов.
- `clients/clientSearch.test.ts` — транслитерация hy/ru/lat, регистр, поиск по имени в другом
  алфавите, префиксы, все слова должны совпасть, телефоны в местном/международном виде, лимит,
  `findClientByPhone` (без дублей).
Ошибок в коде тесты не нашли. Проверено: lint 0/0, typecheck, test 88, build + e2e 16 passed.

### E.4 Security headers, rate-limit, общий текст ошибок, скрытие причин блокировок — готово
- `next.config.mjs`: на всех ответах `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (камера, микрофон,
  геолокация, оплата выключены), `Cross-Origin-Opener-Policy: same-origin`, HSTS, CSP
  `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`;
  `poweredByHeader: false`. `/admin/*` и `/api/*` — `X-Robots-Tag: noindex`, `/api/*` —
  `Cache-Control: no-store`. Решение: CSP для скриптов/стилей не вводил — Next.js встраивает
  inline-скрипты, nonce-политика требует middleware и может сломать страницы.
- `src/lib/security/rateLimit.ts`: скользящее окно в памяти процесса (приложение работает одним
  процессом над файловым хранилищем), не более 10 000 ключей. `/api/booking` — 10 заявок за
  10 минут с одного IP, `/api/availability` — 60 запросов в минуту; ответ 429 с `Retry-After` и
  кодом `too_many_requests`. Лендинг показывает понятный текст (hy/ru/en). Ключ клиента — тот же
  `getClientKey`, что у ограничения входа в админку.
- `errorResponse`: неизвестные ошибки (не из списка известных сообщений) пишутся в лог сервера,
  клиенту — общий текст «Request failed» (500). Известные коды/тексты не изменились.
- `getPublicSiteData`: блокировки отдаются без `reason` (только id, дата, время).
- Тесты: unit `rateLimit.test.ts` (4: окно, освобождение, известные/неизвестные ошибки);
  e2e `security.spec.ts` (4: заголовки, нет причины блокировки, общий текст, 429 на 61-м
  запросе). В e2e-данные добавлена блокировка за горизонтом записи (слоты не меняет).
- README/README.hy: разделы «Тесты» и «Безопасность» обновлены. Интерфейс не изменился (кроме
  нового сообщения при 429), поэтому скриншоты в `docs/screenshots` не переснимал.
Проверено: lint 0/0, typecheck, `npm run test` 92 passed, build, `npm run test:e2e` 20 passed.

---

## Итоговый отчёт (F и E)

### Сделано
- **F.1** Демо-данные: `npm run demo:setup` (повторяемый, со снимком storage перед заменой) —
  30 выдуманных клиентов (армянские и 5–6 русских имён, латиница/кириллица), телефоны
  `+37477000001…030`, все каналы, история за 3 месяца и записи на 2 недели вперёд со всеми
  статусами, сегменты (постоянные, VIP, спящие, потерянные, новые, чёрный список), заметки и
  процедуры на армянском, нейтральные сгенерированные фото без лиц, очередь и журнал сообщений.
  Общий расчёт сегментов и рейтинга активности, пометка «активный» в клиентах и на дашборде,
  тесты на сегменты, проценты, рейтинг, дашборд и итоги календаря.
- **F.2** README.md (English) и README.hy.md (армянский), скриншоты демо-данных в
  `docs/screenshots`, раздел об AI, запуск на Windows/macOS/Linux, демо-вход, `.env.example`;
  без `.env.local` работает демо-режим.
- **F.3** Проверка всей истории git на секреты и личные данные — результат выше в разделе F.3,
  история не переписывалась.
- **F.4** Чистый `git clone` строго по README: `npm ci`, `demo:setup`, build, start, unit и e2e —
  всё прошло, правки README не понадобились.
- **E.1** Единый `adminFetch` для 401 во всей админке; ESLint — 0 предупреждений (`--max-warnings=0`).
- **E.2** Удалены мёртвый код и дубли из AUDIT_REPORT §6 (что оставлено и почему — выше).
- **E.3** Vitest: время/часовые пояса, телефоны, `getAvailability`, шаблоны сообщений, поиск с
  транслитерацией. `npm run test`.
- **E.4** Security headers, rate-limit на `/api/booking` и `/api/availability`, общий текст
  неизвестных ошибок, причины блокировок не публикуются.

### Коммиты
`09ee848` F.1 · `8ec9c49` F.2 · `65e65ce` F.3 · `856febf` F.4 · `889e824` E.1 · `92d5a3e` E.2 ·
`740c259` E.3 · `12d7751` E.4 (+ этот отчёт). Push не выполнялся, история не переписывалась.

### Проверено (последний прогон, после E.4)
`npm run lint` — 0 ошибок, 0 предупреждений; `npm run typecheck` — ок; `npm run test` —
92 passed (11 файлов); `npm run build` — ок; `npm run test:e2e` — 20 passed.
Реальные Google Calendar / Telegram / SMS не использовались, `.env.local` и `../edgar-backup-*`
не трогались.

### Что проверить руками
1. Открыть сайт и админку с демо-данными (`npm run demo:setup`, вход `demo-edgar`): дашборд,
   клиенты (рейтинг, «активный», сегменты), календарь День/Неделя/Месяц — выглядит ли
   правдоподобно; грамотность армянских заметок глазами носителя языка.
2. README.hy.md — прочитать армянский текст носителем языка (жюри армянское).
3. Скриншоты в `docs/screenshots` — нет ли на них ничего лишнего.
4. После публикации за HTTPS-прокси: заголовки (HSTS и др.) приходят; если прокси подставляет
   `X-Forwarded-For`, rate-limit считает реальных клиентов (без прокси все попадут в ключ
   `unknown` — тогда лимит общий на всех, это стоит учесть при развёртывании).
5. Поведение лимитов в жизни: 10 заявок за 10 минут и 60 запросов свободных слотов в минуту с
   одного IP — при необходимости поменять в `src/lib/security/rateLimit.ts`.
6. Неизвестные ошибки в админке теперь показываются общим текстом — детали смотреть в логе сервера.
7. `macOS/Linux`: запуск и e2e проверены только на Windows; команды те же.
