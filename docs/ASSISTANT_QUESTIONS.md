# IBO assistant — question catalog

Grounded answers use data already in CustomerCircle (`customers`, `activities`, `reminders`). No Amway order/renewal APIs in v1.

## Design tiers

| Tier | How | When |
|------|-----|------|
| **A — Local patterns** | Regex + `runQuery(spec)` | Default; fast, no quota |
| **B — Catalog synonyms** | Map utterances → `QuerySpec` | Same engine, wider phrasing |
| **C — Grok classifier** | Edge function returns `QuerySpec` only | Odd phrasing; still grounded execution |

Unmatched assistant questions are logged to `feedback` as `[assistant-unanswered]` for product iteration.

---

## ~20 core questions

| # | Example phrasing | Query kind | Status |
|---|------------------|------------|--------|
| 1 | Who have I reached out to this past week? | `reached_in_range` | Shipped |
| 2 | What customers have I talked with this month? | `reached_in_range` | Shipped (synonym fix) |
| 3 | When was the last time I contacted Jane? | `last_contact` | Shipped |
| 4 | What did I last talk to Sarah about? | `last_activity_detail` | Shipped |
| 5 | How many calls did I log this month? | `activity_count` | Shipped |
| 6 | Who needs attention? | command `attention` | Shipped (not assistant) |
| 7 | Who haven't I contacted in 30 days? | `not_contacted_in` | Shipped |
| 8 | How many customers do I have? | `customer_count` | Shipped |
| 9 | What reminders are due today? | `reminders_due` | Shipped |
| 10 | When is my reminder for Mike? | `reminder_for` | Shipped |
| 11 | Who did I sample this month? | `reached_in_range` + Sample types | Shipped |
| 12 | Who purchased something this month? | `reached_in_range` + Purchase | Shipped |
| 13 | How did I meet Tom? | `customer_info` (how_met) | Shipped |
| 14 | What's Jane's preferred way to contact? | `customer_info` (preferred) | Shipped |
| 15 | Who have I never contacted? | `never_contacted` | Shipped |
| 16 | How many people did I reach out to this week? | `reach_count` | Shipped |
| 17 | List everyone I emailed last month | `reached_in_range` + Email filter | Partial (month + type in text) |
| 18 | Who should I follow up with today? | `reminders_due` + attention overlap | v2 |
| 19 | What products should I suggest for Jane? | command `suggest` | Placeholder |
| 20 | Summarize my week | `week_summary` | v2 (aggregate + optional Grok tone) |

### v2 (needs more data or logic)

- Customers with upcoming birthdays (needs field)
- Downline order / renewal status (Amway APIs, not in app)
- Compare this month vs last month outreach
- "Who referred whom" (needs referral graph)

---

## Outreach vs all activity

Default **outreach**: Call, Text, Email, Meeting, Follow-up.  
Phrases **"any activity"**, **"purchased"**, **"sampled"** narrow or widen types in `activityTypesForQuery()`.

---

## Making it feel intelligent

1. **Answer first** — lead with names and dates, not "try these examples."
2. **Tappable names** — reuse `whoLink` everywhere.
3. **Honest limits** — "I don't track Amway orders yet; I can see logged Purchase activities."
4. **Learn from gaps** — `logUnansweredAssistant()` writes to `feedback` for triage.
5. **Phase C** — Grok maps unknown wording to existing `QuerySpec` kinds only (no free-form facts).
