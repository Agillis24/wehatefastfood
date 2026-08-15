# DEPLOY.md

Repository: <https://github.com/Agillis24/wehatefastfood> (private)
Canonical host: `https://www.wehatefastfood.com`

**The site ships closed.** `robots.txt` disallows everything, every page carries `noindex, nofollow`, and the sitemap is empty, until both conditions in `apps/web/src/lib/launch.ts` are met. Deploying does not publish. That separation is deliberate.

---

## 1. Vercel project

Import the repository, then set:

| Setting          | Value                            |
| ---------------- | -------------------------------- |
| Framework preset | Next.js                          |
| Root directory   | _(leave at the repository root)_ |
| Build command    | `npm run build`                  |
| Output directory | `apps/web/.next`                 |
| Install command  | `npm ci`                         |
| Node version     | 22                               |

`vercel.json` already carries the build command, output directory and the `X-Robots-Tag` header on the translate endpoint, so most of this is picked up automatically.

The build runs `tokens → i18n manifest → content validation → packages → search index → next build`, in that order, because each step produces something the next one needs. A content error fails the deploy rather than shipping a page with a broken figure.

---

## 2. Environment variables

Set per environment. Anything with a value here that is not `NEXT_PUBLIC_` is a **server secret** and must never gain that prefix — `npm run check` fails if one does.

| Variable                       | Production                       | Preview           | Notes                                                                                                 |
| ------------------------------ | -------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_ORIGIN`      | `https://www.wehatefastfood.com` | _the preview URL_ | Preview must differ, or preview pages emit production canonical URLs and compete with the real ones.  |
| `NEXT_PUBLIC_ALLOW_INDEXING`   | **unset** for now                | unset             | Set to `1` only when §5 is satisfied.                                                                 |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | unset                            | unset             | Cookieless analytics, when we add it.                                                                 |
| `ANTHROPIC_API_KEY`            | optional                         | optional          | Server only. Without it `/api/translate` returns an honest 503 rather than a silent English fallback. |
| `UPSTASH_REDIS_REST_URL`       | optional                         | optional          | Without it the tier-2 cache falls back to an in-memory LRU.                                           |
| `UPSTASH_REDIS_REST_TOKEN`     | optional                         | optional          |                                                                                                       |

Nothing is required. The site builds and runs with none of these set — that was a design constraint, not an accident.

---

## 3. Domain — registered at Český hosting (muj.cesky-hosting.cz)

Canonical is `www`. Both hosts must resolve, but only one may be canonical, or every page competes with a duplicate of itself in search.

### Before touching anything: check for email

**If any mailbox or forwarder uses `@wehatefastfood.com`, do not move the nameservers to Vercel.** Delegating nameservers moves _all_ DNS, and the MX records that deliver your mail live there too. Mail stops the moment the delegation propagates, and it fails silently — senders get bounces you never see.

Two safe paths:

|                 | Keep Český hosting nameservers | Delegate to Vercel                               |
| --------------- | ------------------------------ | ------------------------------------------------ |
| What you change | just two records               | the whole zone                                   |
| Email           | untouched                      | you must recreate MX, SPF, DKIM, DMARC at Vercel |
| Recommended     | **yes**                        | only if the domain has no mail                   |

**Take the first one.** Change two records and leave everything else alone.

### The two records

In the Český hosting admin (`muj.cesky-hosting.cz`), open the DNS record editor for `wehatefastfood.com` and set:

| Name           | Type    | Value                                                      |
| -------------- | ------- | ---------------------------------------------------------- |
| `www`          | `CNAME` | the hostname Vercel shows, normally `cname.vercel-dns.com` |
| `@` (the apex) | `A`     | the IPv4 address Vercel shows                              |

Use **exactly** what the Vercel dashboard displays when you add the domain. Do not copy an address out of a blog post or out of this file — Vercel changes them, and a stale A record is a site that resolves to somebody else's server.

The apex must be an `A` record, not a `CNAME`. DNS does not allow a CNAME at the zone apex alongside the SOA and NS records that have to be there.

If a conflicting `A` or `CNAME` already exists for `@` or `www`, pointing at Český hosting's own web servers, **replace** it. Two records for the same name is not a fallback, it is a coin toss.

### In Vercel

1. Add `www.wehatefastfood.com` as the **primary** domain.
2. Add `wehatefastfood.com` and set it to **redirect to `www`**, permanent.

### Then wait, and check

Propagation is usually minutes and occasionally hours. Český hosting's default TTL is typically 3600 s, so if you had records there before, allow an hour.

```bash
curl -sI https://wehatefastfood.com | head -3
```

Expect `301` or `308` with `location: https://www.wehatefastfood.com/`.

```bash
curl -sI https://www.wehatefastfood.com | head -3
```

Expect `200`.

`REDIRECT_HOSTS` in `apps/web/src/lib/site.ts` records this decision in code, so it is not only a dashboard setting nobody can find later.

---

## 4. After the first deploy, verify

```bash
curl -s https://www.wehatefastfood.com/robots.txt
```

Expect `Disallow: /`. If it says anything else while there is no content, stop and check `NEXT_PUBLIC_ALLOW_INDEXING`.

Then confirm by hand: `/en` renders, `/cs` renders in Czech, the language picker moves between them, and `/api/translate` returns `503` (unconfigured) or `404` (bad hash) rather than `500`.

---

## 5. The checklist before opening to search engines

`NEXT_PUBLIC_ALLOW_INDEXING=1` is the last step, not an early one. Do not set it until **all** of these are true:

- [ ] **`content/reference/fsa-thresholds.json` and `reference-intakes.json` are `status: "verified"`**, checked by a human against the DHSC/FSA guidance and Annex XIII of Regulation (EU) 1169/2011. These decide whether a food shows red or amber.
- [ ] At least one **real chain** is published and `content/_seed/` is deleted.
- [ ] **Fonts are self-hosted** and subset. Until then the site renders in fallbacks and does not look like itself.
- [ ] The Czech has been **read by a human** and `messages/cs/_provenance.json` says so.
- [ ] `npm run check` and `npm run test:e2e` pass on the deployed commit.
- [ ] `/legal`, `/privacy`, `/methodology` and `/about` exist and say something true.

Even with the variable set, the code refuses to open the site while there are zero published chains. That second condition is not a formality — it is there because the end of a long build is exactly when "it feels finished" and "it is finished" are easiest to confuse.

---

## 6. Rolling back

Vercel keeps every deployment. Promote a previous one from the dashboard; no rebuild needed.

To close the site again immediately: unset `NEXT_PUBLIC_ALLOW_INDEXING` and redeploy. `robots.txt`, the per-page meta and the sitemap all follow from it.
