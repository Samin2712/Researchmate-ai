# Google sign-in, Gmail API email, and account verification

The changes are local only. No push, deployment, or Render environment changes were made.

## Backend environment

Keep your existing `GOOGLE_CLIENT_ID` for website sign-in. Add these to `backend/.env`:

```dotenv
GOOGLE_CLIENT_ID=your-existing-sign-in-client.apps.googleusercontent.com
GMAIL_CLIENT_ID=your-mail-oauth-client.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-mail-client-secret
GMAIL_REFRESH_TOKEN=your-mail-refresh-token
EMAIL_FROM=ResearchMate AI <researchmateai123@gmail.com>
FRONTEND_URL=http://localhost:5173
EMAIL_VERIFICATION_EXPIRE_MINUTES=60
PASSWORD_RESET_EXPIRE_MINUTES=30
```

The mailbox authorized to send mail must be `researchmateai123@gmail.com` when using the example sender. No Gmail password or App Password is used. All mail goes directly to Google's Gmail API over HTTPS, including on free Render. No purchased domain or third-party mail service is needed. `BREVO_API_KEY` and `RESEND_API_KEY` are no longer used and can be removed.

No new frontend environment variables are needed. Restart the backend after changing credentials. When deploying later, use the actual HTTPS frontend origin for `FRONTEND_URL`. These are backend secrets; never put them in `VITE_` variables, commit them, or share screenshots of them.

## Google sign-in

The existing sign-in client still needs your frontend origins under Authorized JavaScript origins (`http://localhost:5173` and, if used, `http://127.0.0.1:5173`). Its audience must be External for personal Gmail users. Google sign-in requests only basic identity information. It never requests access to users' Gmail mailboxes.

## Authorize the outgoing Gmail mailbox

1. In Google Cloud, create a separate project for outgoing mail (recommended) and enable **Gmail API**. This keeps the mail sender's sensitive OAuth scope separate from public website sign-in.
2. Configure Google Auth Platform branding and an **External** audience. While testing, add `researchmateai123@gmail.com` as a test user.
3. Create an OAuth client of type **Web application**. Add this exact **Authorized redirect URI** for Google's OAuth Playground:

   ```text
   https://developers.google.com/oauthplayground
   ```

4. Copy that client's ID and secret into `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`. These belong together; do not substitute the separate sign-in client ID.
5. Open [Google OAuth Playground](https://developers.google.com/oauthplayground/). In its gear/settings panel, select **Use your own OAuth credentials** and enter the mail client's ID and secret. Use offline access and force consent if these options are shown.
6. In Step 1, authorize exactly this scope:

   ```text
   https://www.googleapis.com/auth/gmail.send
   ```

7. Sign in as `researchmateai123@gmail.com` and grant sending permission. This setup is performed only by the website owner, never by website users.
8. In Step 2, exchange the authorization code for tokens. Copy the **refresh token** into `GMAIL_REFRESH_TOKEN` (not the short-lived access token). A Python random-string command cannot generate this credential.
9. For ongoing use, configure the mail OAuth app appropriately for production, then authorize again to obtain a new refresh token. An External app in Testing using `gmail.send` normally issues refresh tokens that expire after seven days. Google may show an unverified-app warning or require verification depending on the app's use and audience; publishing alone does not guarantee approval. Follow Google's OAuth policies. Using your own credentials in Playground is important; do not use Playground's default shared OAuth client.
10. Restart the backend, register a new password account at a different inbox, and complete the verification link. Then test Forgot password. Check spam and the sender Gmail's Sent folder as well.

## Account behavior

- New email/password registrations create a pending account. The API must receive a Gmail message ID before returning registration success. If Gmail rejects sending, registration rolls back and the UI shows an unavailable message.
- Pending accounts cannot log in through either password endpoint or use authenticated APIs. The registration page directs the user to check their inbox.
- Email verification links contain a random secret, stored only as a SHA-256 hash, expire after 60 minutes by default, and work once. Verification requires an explicit button click, so opening a link preview does not automatically consume it.
- The verification page supports resending. A successful resend replaces the old token; failed sending rolls back the change. Resends are limited to 3/email/hour and 20/IP/hour; verification attempts to 30/IP/hour; registrations to 20/IP/hour.
- Existing accounts retain access, with no forced verification migration. New Google accounts rely on Google's verified email and do not receive a second verification email. Existing password accounts are never silently linked to Google by matching email.
- Forgot password applies only to active, verified password accounts. Unknown, pending, and Google accounts receive the same generic response to avoid exposing membership. Gmail failures are logged with safe categories, without tokens, credentials, or email contents.
- Reset links expire after 30 minutes by default, work once, and invalidate previous sessions and reset links on use. Profile password changes require the current password. Google users manage passwords in Google account security.
- Invalid address syntax is rejected. Gmail accepting an email is not proof it arrived, that the recipient exists, or that it avoided spam. Some bounces arrive later. Clicking the verification link proves control of the receiving inbox; the application never labels a pending request as inbox-delivered.
- Gmail's personal-account sending limits and anti-abuse restrictions apply. This is appropriate for modest hobby usage, not an unlimited transactional email service. Credentials can be revoked or expire and must then be reauthorized.

## Database and tests

The existing startup bootstrap creates `email_verifications` without altering user rows. Alembic migration `0010_email_verification` is included for managed migrations. Earlier auth tables remain in migration `0009_account_security`.

Automated tests mock Google OAuth/Gmail HTTP responses and use isolated databases. They do not send real mail. Live delivery requires the owner's OAuth authorization above.

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest
cd ../frontend
npm run typecheck
npm run lint
npm run build
npx playwright test account-security.spec.ts email-verification.spec.ts profile.spec.ts --project=chromium --project=mobile
```

References: [Gmail message sending](https://developers.google.com/workspace/gmail/api/guides/sending), [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [offline OAuth](https://developers.google.com/identity/protocols/oauth2/web-server#offline), [refresh-token expiry](https://developers.google.com/identity/protocols/oauth2#expiration), [Gmail sending limits](https://support.google.com/mail/answer/22839), [Render free service restrictions](https://render.com/docs/free).
