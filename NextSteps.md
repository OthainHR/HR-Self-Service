# Next Steps — Mobile Wrapper & Geofencing Roll‑out

*A concise checklist from “code merged” → “app in TestFlight & Play Store.”*

---

## 1  Local smoke‑test (one time)

1. Install JS deps: `npm ci --prefix frontend`  (this repo keeps the React SPA in the **frontend/** folder).
2. Build & sync Capacitor:

   ```bash
   cd frontend
   npm run build         # creates production bundle in /frontend/build
   npx cap sync          # regenerates mobile/ios & mobile/android
   ```
3. **iOS**  – open `mobile/ios/App.xcworkspace` in Xcode → Run on a device/simulator → allow **Always** location → make sure **Enable Auto Drop‑off** toggles to **Enabled**.
4. **Android**  – `npx cap run android`  → accept location + (Android 13+) notifications.

---

## 2  Provision store credentials

### iOS

* Apple Developer account (US \$99 / yr)
* App ID `com.othain.ess`  **with Background Modes → Location updates**
* Distribution Certificate (.p12) + Provisioning Profile
* App Store Connect → create the new app → generate API Key for TestFlight uploads

### Android

* Google Play Developer account (US \$25 one‑time)
* Create signing keystore:

  ```bash
  keytool -genkeypair -v -keystore othain.jks -alias ess \
         -keyalg RSA -keysize 2048 -validity 10000
  ```
* Base‑64 encode for GitHub Secrets: `base64 < othain.jks > othain.jks.b64`
* Keep the original `.jks` in a secure vault — Play Console may ask for it again.

---

## 3  Add GitHub Secrets for CI

| Secret                             | Value                                        |
| ---------------------------------- | -------------------------------------------- |
| **RENDER\_DEPLOY\_HOOK**           | Render Deploy‑Hook URL                       |
| **APPLE\_ID**                      | App Store Connect e‑mail                     |
| **APP\_STORE\_API\_KEY**           | Contents of the `.p8` key (no header/footer) |
| **APP\_STORE\_API\_ISSUER**        | Issuer ID from App Store Connect             |
| **ANDROID\_KEYSTORE**              | Base‑64 string from `othain.jks.b64`         |
| **ANDROID\_ALIAS**                 | `ess`                                        |
| **ANDROID\_KEYSTORE\_PASSWORD**    | Keystore password                            |
| **ANDROID\_KEY\_PASSWORD**         | Key password (can be same)                   |
| **BG\_GEO\_LICENSE\_KEY**          | Transistorsoft licence key                   |
| **GOOGLE\_SERVICE\_ACCOUNT\_JSON** | *(optional)* JSON key to auto‑upload bundles |
| **PLAY\_PACKAGE\_NAME**            | *(optional)* `com.othain.ess`                |

Add any Supabase keys the app needs.

---

## 4  Tag a build → CI pipeline

1. Update the `version` in `package.json` if desired.
2. Tag & push:

   ```bash
   git tag mobile-v0.1.0
   git push --tags
   ```
3. **GitHub Actions** (mobile‑tag.yml) will:

   * Re‑build the React bundle
   * Regenerate native projects
   * Apply iOS/Android permission patches
   * Produce an **.ipa** → TestFlight
   * Produce a signed **.aab** (ready for Google Play Internal)

---

## 5  Internal / TestFlight testing

* **iOS**: invite testers in App Store Connect → TestFlight.
* **Android**: upload the first build manually to Internal testing; later uploads can be automated once `GOOGLE_SERVICE_ACCOUNT_JSON` is in place.

---

## 6  Production submission

1. **iOS**: App Store Connect → *Submit for Review* (needs screenshots, description, privacy answers).
2. **Android**: promote Internal track build to Production.

Typical review times: Apple 1–3 days, Google a few hours.

---

## 7  Ongoing workflow & housekeeping

* Normal pushes continue to deploy web + API via `.github/workflows/web-render.yml` (which builds from **frontend/**).
* For a new mobile build, bump version and create a fresh tag (e.g. `mobile-v1.2.0`).
* Keep permission‑patch text and `BG_GEO_LICENSE_KEY` up to date with OS policy changes.
* Store the Android keystore securely; losing it means you can never update the app.

---

Need help? Ping `@mobile-dev` on Slack or open an issue in GitHub.
