"""Self-contained transactional email layouts, including a plain-text alternative."""
from html import escape
from urllib.parse import urlsplit


def render_account_email(link: str, minutes: int, *, verification: bool) -> tuple[str, str]:
    action = 'Verify email address' if verification else 'Reset password'
    heading = 'Welcome to ResearchMate.' if verification else 'A fresh start for your password.'
    description = (
        'Confirm your email address to bring your papers, questions, and discoveries together in one workspace.'
        if verification else
        'We received a request to reset the password for your ResearchMate AI account. '
        'Choose a new password to get back to your research.'
    )
    security = (
        'If you did not create a ResearchMate AI account, you can safely ignore this email.'
        if verification else
        'If you did not request a password reset, you can ignore this email. '
        'Your password will stay the same.'
    )
    expiry = f'This link expires in {minutes} minutes and can be used once.'
    text = f'ResearchMate AI\n\n{heading}\n\n{description}\n\n{action}:\n{link}\n\n{expiry}\n\n{security}\n\nYour research. A little more connected.'
    safe_link = escape(link, quote=True)
    origin = escape(urlsplit(link).netloc)
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>{action} | ResearchMate AI</title>
  <style>
    @media screen and (max-width: 480px) {{
      .outer {{ padding: 20px 12px !important; }}
      .content {{ padding: 30px 24px !important; }}
      .brand {{ padding: 24px !important; }}
      .headline {{ font-size: 28px !important; line-height: 36px !important; }}
      .action {{ display: block !important; text-align: center !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f7fa;color:#193a51;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;color:#f3f7fa;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">{action} to continue with ResearchMate AI. {expiry}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f3f7fa;">
    <tr><td class="outer" align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:580px;border:1px solid #dce5eb;border-radius:14px;border-spacing:0;background-color:#ffffff;">
        <tr><td class="brand" bgcolor="#193a51" style="padding:28px 36px;background-color:#193a51;border-radius:13px 13px 0 0;">
          <p style="margin:0;color:#ffffff;font-size:23px;line-height:30px;font-weight:700;letter-spacing:-0.5px;">ResearchMate <span style="color:#a8ded4;font-size:15px;letter-spacing:0;">AI</span></p>
          <p style="margin:6px 0 0;color:#d4e5ec;font-size:13px;line-height:20px;">A thoughtful space for your research.</p>
        </td></tr>
        <tr><td class="content" style="padding:36px;">
          <h1 class="headline" style="margin:0 0 18px;color:#193a51;font-size:32px;line-height:40px;font-weight:700;letter-spacing:-0.7px;">{heading}</h1>
          <p style="margin:0 0 28px;color:#526b7b;font-size:16px;line-height:26px;">{description}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
            <tr><td bgcolor="#116e64" style="background-color:#116e64;border-radius:8px;text-align:center;">
              <a class="action" href="{safe_link}" style="display:inline-block;padding:16px 28px;border:1px solid #116e64;border-radius:8px;background-color:#116e64;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:700;text-align:center;text-decoration:none;mso-padding-alt:0;">{action}</a>
            </td></tr>
          </table>
          <p style="margin:0 0 28px;padding:14px 16px;background-color:#eef7f5;border-left:3px solid #116e64;color:#315d56;font-size:13px;line-height:21px;">{expiry}</p>
          <p style="margin:0 0 24px;color:#607480;font-size:13px;line-height:22px;">{security}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;table-layout:fixed;border-top:1px solid #e5edf1;">
            <tr><td style="padding-top:24px;">
              <p style="margin:0 0 10px;color:#607480;font-size:12px;line-height:20px;">Button not working? Copy and paste this link into your browser:</p>
              <p style="margin:0;word-break:break-all;word-wrap:break-word;font-size:12px;line-height:20px;"><a href="{safe_link}" style="color:#116e64;text-decoration:underline;word-break:break-all;">{safe_link}</a></p>
            </td></tr>
          </table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:580px;">
        <tr><td align="center" style="padding:24px 12px 0;">
          <p style="margin:0;color:#526b7b;font-size:12px;line-height:20px;">ResearchMate AI &nbsp;|&nbsp; {origin}</p>
          <p style="margin:4px 0 0;color:#607480;font-size:12px;line-height:20px;">Your research. A little more connected.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'''
    return text, html
