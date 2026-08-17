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

## 3. Domain — Český hosting (muj.cesky-hosting.cz)

### The zone as it stands, checked 2026-08-15

```
NS    ns1.thinline.cz, ns2.thinline.cz, ns3.cesky-hosting.eu
A     wehatefastfood.com        91.239.200.81
AAAA  wehatefastfood.com        2001:67c:e94:0:1:5bef:c851:1
A     www.wehatefastfood.com    91.239.200.81
AAAA  www.wehatefastfood.com    2001:67c:e94:0:1:5bef:c851:1
MX    wehatefastfood.com        ...mx2.emailprofi.seznam.cz  (10)
MX    wehatefastfood.com        ...mx1.emailprofi.seznam.cz  (20)
TXT   (none)
DNSSEC inactive
```

**There is mail on this domain** — Seznam Email Profi. That settles the nameserver question: **keep Český hosting as the nameservers and change individual records.** Delegating the zone to Vercel would take the MX records with it, and mail would stop silently.

### The trap: the AAAA records

The apex and `www` each have an **AAAA** record pointing at Český hosting. Vercel publishes an IPv4 address for an apex and does not give you an AAAA to replace it with.

If you change only the A records and leave the AAAA records alone, then **every visitor whose network prefers IPv6 — which is most mobile networks — still reaches Český hosting's parking page.** Everyone else reaches the site. It looks like it works, right up until someone tells you it does not, and it is miserable to diagnose because it depends on the visitor's connection rather than on anything you can see from here.

Delete them. Both.

### Exact changes

| Record                             | Now                            | Do                                      |
| ---------------------------------- | ------------------------------ | --------------------------------------- |
| `wehatefastfood.com` **A**         | `91.239.200.81`                | **change** to the IPv4 Vercel shows you |
| `wehatefastfood.com` **AAAA**      | `2001:67c:e94:0:1:5bef:c851:1` | **delete**                              |
| `www.wehatefastfood.com` **A**     | `91.239.200.81`                | **delete**                              |
| `www.wehatefastfood.com` **AAAA**  | `2001:67c:e94:0:1:5bef:c851:1` | **delete**                              |
| `www.wehatefastfood.com` **CNAME** | —                              | **add** → `cname.vercel-dns.com`        |
| **MX** × 2                         | Seznam Email Profi             | **do not touch**                        |
| **DNSSEC**                         | inactive                       | leave inactive for now                  |

Take the apex IPv4 from the Vercel dashboard when you add the domain, not from this file — Vercel changes it, and a stale A record points the domain at somebody else's server.

Český hosting's own UI states the rule that forces the order on `www`: a subdomain with a CNAME cannot have any other record. **Delete the A and AAAA first, then add the CNAME.**

DNSSEC stays off. Turning it on takes days to propagate fully and would be one more moving part during a cutover; it can be enabled later once the records are stable.

### Order of operations

1. **Vercel first.** Add `www.wehatefastfood.com` as the primary domain, and `wehatefastfood.com` set to redirect to it permanently. Vercel shows the records it wants and waits.
2. **Then Český hosting.** Make the five changes above.
3. Wait. Allow an hour for the old records to age out of resolver caches.

### Then check

```bash
curl -sI https://wehatefastfood.com | head -3
```

Expect `301` or `308` to `https://www.wehatefastfood.com/`.

```bash
curl -sI https://www.wehatefastfood.com | head -3
```

Expect `200`.

And confirm the IPv6 trap is closed — this must return no address:

```bash
nslookup -type=AAAA www.wehatefastfood.com 8.8.8.8
```

`REDIRECT_HOSTS` in `apps/web/src/lib/site.ts` records the www decision in code, so it is not only a dashboard setting nobody can find later.

### Unrelated, but visible from here: no SPF record

The zone publishes no TXT records, so the domain has no SPF policy while sending mail through Seznam. That makes outbound mail more likely to be filtered. Nothing to do with the website and it can wait, but worth a TXT record from Seznam Email Profi's own instructions at some point.

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
