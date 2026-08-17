# SOCIAL_PUBLISHING.md

How to get the four credentials `scripts/social-publish.mjs` needs, and what goes wrong.

Verified against Meta's own documentation on **2026-08-17** by three independent researchers, each
then checked by an adversary. Two of the three first answers came back **partly wrong** and one
**seriously wrong** — the permission strings in particular. What is unverified is marked as such at
the bottom rather than smoothed over.

---

## Which flavour are you on? Answer this first.

An app's Instagram use case is set up with **Instagram Login** or **Facebook Login**, and nothing
below is the same between them. You cannot tell by looking at the account; you tell by looking at
the permission names on the use-case screen.

|                            | Instagram Login                                                  | Facebook Login                                 |
| -------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| Permission names           | `instagram_business_basic`, `instagram_business_content_publish` | `instagram_basic`, `instagram_content_publish` |
| Host                       | `graph.instagram.com`                                            | `graph.facebook.com`                           |
| Instagram token            | an Instagram User token                                          | **the Page token** — there is no separate one  |
| `IG_LOGIN` in `.env.local` | leave unset (this is the default)                                | `IG_LOGIN=facebook`                            |

Both require the Instagram professional account to be **linked to a Facebook Page**. The newer
Instagram Login route does not avoid that; it only changes what you log in with.

Under Facebook Login, `IG_ACCESS_TOKEN` and `FB_PAGE_ACCESS_TOKEN` hold **the same string**. Do not
go looking for a second token — there isn't one.

---

## Before any of it works

1. **The Instagram account must be Business or Creator.** A personal account returns `null` for the
   account id no matter what else is right, and that is the most common cause of a null.
2. **The Instagram account needs the Instagram Tester role on the app** — App roles → Roles →
   Instagram Tester. Then **accept the invitation from inside Instagram**: Settings → Apps and
   websites → Tester invites. Until it is accepted the role stays pending and the error is
   identical to having no role at all. This is where nearly everyone stalls.
3. **You need a Page role that can create content** — Page settings → Page access → Content or Full
   control. A role on the _app_ is not a role on the _asset_.
4. **If the business enforces 2FA**, be 2FA-authenticated in that browser session, or the Page token
   is silently missing from the response rather than refused.
5. **`ads_management` or `ads_read`** is required if your Page role came via Business Manager, which
   it does when a business portfolio is connected. Meta: _"If the token is from a User whose Page
   role was granted via the Business Manager, one of the following permissions is also required:
   `ads_management`, `ads_read`"_. It is needed to **read** the linked account, not only to publish.

---

## Getting the values

1. Open the [Graph API Explorer](https://developers.facebook.com/tools/explorer/). Select your app;
   set the version to **v26.0**; leave the token type on **User Token**.
2. Tick the permissions for your flavour, plus `pages_show_list`, `pages_read_engagement`,
   `pages_manage_posts` and `ads_management`. A permission missing from that list is missing from
   the app — go add it to the use case first.
3. **Generate Access Token**, and on the asset screens **explicitly tick your Page and your
   Instagram account**. Accepting the default without looking is how you get a token scoped to
   nothing useful.
4. Check the scopes actually landed. Submit `me/permissions` — everything must say `"granted"`.
5. **Exchange the token for a long-lived one, in a terminal, not the browser.** The Explorer's token
   lasts about an hour, and a Page token minted from a short-lived user token inherits that
   lifetime. App ID and secret are in App settings → Basic.

   ```bash
   curl -i -X GET "https://graph.facebook.com/v26.0/oauth/access_token?grant_type=fb_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&fb_exchange_token=<SHORT_LIVED_TOKEN>"
   ```

   Meta: _"Make this call from your server, not a client. Your app secret is included in this API
   call, so you should never make the request client-side."_ A browser tab is a client. Your own
   terminal is the pragmatic equivalent of a server.

6. Paste the long-lived token back into the Explorer's token field, then submit:

   ```
   me/accounts?fields=id,name,access_token,instagram_business_account{id,username}
   ```

   Naming `access_token` in `fields` is **mandatory**. It is a default field, and Graph drops
   defaults the moment you supply `fields` — omit it and you get a tidy-looking response with no
   token in it and no error.

7. Confirm the Page token really is dateless: `debug_token?input_token=<PAGE_TOKEN>` must show
   `"expires_at": 0`. A timestamp about an hour out means you skipped step 5.

8. Write `.env.local` — gitignored, and `npm run secrets:scan` fails the build if it is ever
   committed. Store the **numeric** Instagram id, never the username.

   ```
   IG_USER_ID=<instagram_business_account.id>
   IG_ACCESS_TOKEN=<your Instagram token, or the Page token under Facebook Login>
   FB_PAGE_ID=<data[0].id>
   FB_PAGE_ACCESS_TOKEN=<the Page access token>
   ```

---

## What goes wrong, and what it looks like

- **`instagram_business_account` is `null`.** In this order: the account is personal rather than
  professional; `ads_management`/`ads_read` was not requested; or the account was linked through
  Page settings and populates `connected_instagram_account` instead. Ask for both fields before
  concluding anything.
- **The response has `id` and `name` but no `access_token`.** You omitted it from `fields`, or you
  hold only a Live Contributor role, or the session is not 2FA-authenticated. All three look like
  success.
- **Everything works, then dies an hour later.** You stored the Explorer's token instead of
  exchanging it. An expired token **cannot** be exchanged — Meta: _"You can not use an expired token
  to request a long-lived token."_ Start again from a fresh login.
- **Page photo posts fail on permissions** even though Instagram works. Different set entirely:
  `pages_manage_posts`, which itself depends on `pages_read_engagement` and `pages_show_list`, plus a
  Page token from someone with the `CREATE_CONTENT` task.
- **Publishing fails with everything apparently correct.** Page Publishing Authorization. Meta: _"An
  Instagram professional account connected to a Page that requires Page Publishing Authorization
  (PPA) cannot be published to until PPA has been completed"_ — and there is **no API way to detect
  it**. Complete PPA in Page settings before you need it.
- **The token stops working with no expiry set.** "No expiration date" means no timestamp, not
  immortal. A logout, a password change or a revoked authorisation invalidates it. The script names
  this case when Meta returns an `OAuthException`.
- **A daily limit.** The guide's headline says 100 posts per rolling 24 hours; the same page's
  Limitations section and the `content_publishing_limit` reference both say **50**. Build to 50.

---

## Not verified — read this before trusting the section above

- **The one-request call in step 6 is assembled, not quoted.** No Meta page prints it verbatim. It is
  built from three separately documented facts. The doc-literal alternative is two calls:
  `me/accounts`, then `<PAGE_ID>?fields=instagram_business_account`.
- **"Defaults vanish when you supply `fields`"** is standard Graph behaviour and an operational rule,
  not a sentence quoted from Meta.
- **App Review is contradictory in Meta's own documentation.** The Instagram Platform Overview says
  _"If your app only serves your Instagram professional account or an account you manage, Standard
  Access is all your app needs."_ The app-creation page says _"Instagram requires successful
  completion of the App Review process before your app can access live data."_ These cannot be
  reconciled from primary sources. The weight of evidence favours our case — own accounts,
  development mode, roles on both app and asset — but if publishing refuses for no visible reason,
  this is the likeliest explanation.
