# DEPLOY.md

Repository: <https://github.com/Agillis24/wehatefastfood>
Host: **GitHub Pages** (static export)
Canonical host: `https://www.wehatefastfood.com`

**The site ships closed.** `robots.txt` disallows everything, every page carries `noindex, nofollow`, and the sitemap is empty, until both conditions in `apps/web/src/lib/launch.ts` are met. Deploying does not publish.

---

## 1. Why GitHub Pages, and what it cost

The site is a **static export**: HTML, CSS and a little inline script. No server, no runtime, nothing to pay for.

That was possible because one feature was dropped: the **tier-2 on-demand translation endpoint**, which machine-translated the interface into ~200 unreviewed languages. Losing it is not really a loss — it was the riskiest thing in the brief, and eight reviewed languages are worth more than two hundred unreviewed ones. The hosting constraint and the editorial judgement pointed the same way.

Two smaller consequences, both handled:

- **No middleware**, so `/` cannot be redirected server-side. `apps/web/public/index.html` is a hand-written meta refresh with a script that honours the browser's language preference.
- **Compare cannot be rendered per request.** The selection moved into the URL **hash**, which never reaches the server, so one static page answers every selection from a build-time index. It is still shareable, which was always the point.

**The repository must be public** for GitHub Pages on a free account. Pages from a private repository requires a paid plan.

---

## 2. Enabling Pages

1. Repository → **Settings → Pages**.
2. **Source: GitHub Actions.** Not "Deploy from a branch" — `.github/workflows/pages.yml` builds and publishes.
3. Under **Custom domain**, enter `www.wehatefastfood.com`.
4. Tick **Enforce HTTPS** once the certificate has been issued (it appears after DNS resolves).

`apps/web/public/CNAME` carries the domain in the repository as well, so a manual redeploy cannot silently drop it.

The workflow runs `npm run check` before building. A deploy that skips the gates is a deploy that can publish a figure with a broken source.

---

## 3. DNS — Český hosting (muj.cesky-hosting.cz)

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

**There is mail on this domain** — Seznam Email Profi. Keep Český hosting as the nameservers and change individual records. Do not delegate the zone anywhere: that would take the MX records with it and mail would stop, silently.

### What to change

| Name       | Type      | Now             | Do                                               |
| ---------- | --------- | --------------- | ------------------------------------------------ |
| `@`        | **A**     | `91.239.200.81` | **replace with GitHub's four addresses** (below) |
| `@`        | **AAAA**  | `2001:67c:...`  | **replace with GitHub's four addresses**         |
| `www`      | **A**     | `91.239.200.81` | **delete**                                       |
| `www`      | **AAAA**  | `2001:67c:...`  | **delete**                                       |
| `www`      | **CNAME** | —               | **add** → `agillis24.github.io`                  |
| **MX** × 2 |           | Seznam          | **do not touch**                                 |
| **DNSSEC** |           | inactive        | leave inactive                                   |

GitHub's published Pages addresses, which you should confirm against GitHub's own documentation before entering:

```
A     185.199.108.153   185.199.109.153   185.199.110.153   185.199.111.153
AAAA  2606:50c0:8000::153  2606:50c0:8001::153
      2606:50c0:8002::153  2606:50c0:8003::153
```

**Do not leave the old AAAA records in place.** Unlike some hosts, GitHub Pages does answer over IPv6 — so here the AAAA records must be _replaced_, not merely deleted. If they are left pointing at Český hosting, every visitor whose network prefers IPv6, which is most mobile networks, keeps landing on the old parking page while everyone else sees the site. It looks like it works until someone tells you it does not.

Český hosting's own UI states the rule that fixes the order on `www`: a subdomain with a CNAME cannot have any other record. **Delete `www`'s A and AAAA first, then add the CNAME.**

The apex keeps A/AAAA records rather than a CNAME because DNS does not permit a CNAME at the zone apex. GitHub Pages then redirects the apex to `www` on its own, because `www` is the configured custom domain.

### Then check

```bash
curl -sI https://wehatefastfood.com | head -3
```

Expect `301` to `https://www.wehatefastfood.com/`.

```bash
curl -sI https://www.wehatefastfood.com | head -3
```

Expect `200`.

```bash
nslookup -type=AAAA www.wehatefastfood.com 8.8.8.8
```

Must resolve through the CNAME to GitHub, **not** to `2001:67c:...`.

---

## 4. After the first deploy

```bash
curl -s https://www.wehatefastfood.com/robots.txt
```

Expect `Disallow: /`. If it says anything else while there is no content, stop.

Then by hand: `/` lands on a locale, `/en/` and `/cs/` render, the language picker moves between them keeping the same page, and `/en/compare/#GB/...` assembles a comparison.

---

## 5. The checklist before opening to search engines

`NEXT_PUBLIC_ALLOW_INDEXING=1` in `.github/workflows/pages.yml` is the last step, not an early one. Do not set it until **all** of these are true:

- [ ] **`content/reference/fsa-thresholds.json` and `reference-intakes.json` are `status: "verified"`**, checked by a human against the DHSC/FSA guidance and Annex XIII of Regulation (EU) 1169/2011. These decide whether a food shows red or amber.
- [ ] At least one **real chain** is published and `content/_seed/` is deleted.
- [ ] **Fonts are self-hosted** and subset. Until then the site renders in fallbacks.
- [ ] The Czech has been **read by a human** and `messages/cs/_provenance.json` says so.
- [ ] `npm run check` and `npm run test:e2e` pass on the deployed commit.
- [ ] `/legal`, `/privacy`, `/methodology` and `/about` exist and say something true. They are currently linked from the footer and 404.

Even with the variable set, the code refuses to open the site while there are zero published chains.

---

## 6. Local preview and rollback

```bash
npm run build
npm run serve
```

`scripts/serve-static.mjs` serves `apps/web/out` the way Pages does — directory indexes, `404.html`, no rewrites — so what you see locally is what gets published.

To roll back: revert the commit and let the workflow redeploy. To close the site again: clear `NEXT_PUBLIC_ALLOW_INDEXING` and redeploy.

---

## 7. Unrelated, but visible from here: no SPF record

The zone publishes no TXT records, so the domain has no SPF policy while sending mail through Seznam. Outbound mail is more likely to be filtered. Nothing to do with the website, but worth a TXT record from Seznam Email Profi's instructions at some point.
