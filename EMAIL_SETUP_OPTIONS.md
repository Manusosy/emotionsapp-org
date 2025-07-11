# Email Setup Options for Supabase

## Current Issue
- Email confirmations are enabled but SMTP is not configured
- Users are created but confirmation emails aren't sent
- `confirmation_sent_at` is set but emails don't reach users

## Option 1: Disable Email Confirmations (Quick Fix for Development)
Already done - set `enable_confirmations = false` in `supabase/config.toml`
  

### A. Using SendGrid (Recommended)

1. **Sign up for SendGrid** (free tier: 100 emails/day)
2. **Get API Key** from SendGrid dashboard
3. **Update supabase/config.toml:**

```toml
[auth.email.smtp]
enabled = true
host = "smtp.sendgrid.net"
port = 587
user = "apikey"
pass = "env(SENDGRID_API_KEY)"
admin_email = "noreply@yourdomain.com"
sender_name = "EmotionsApp"
```

4. **Add environment variable:**
```bash
# In your .env file
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

### B. Using Gmail SMTP (Simple Setup)

```toml
[auth.email.smtp]
enabled = true
host = "smtp.gmail.com"
port = 587
user = "your-email@gmail.com"
pass = "env(GMAIL_APP_PASSWORD)"
admin_email = "your-email@gmail.com"
sender_name = "EmotionsApp"
```

**Note:** You'll need to create an App Password in Gmail settings.

### C. Using Resend (Modern Alternative)

```toml
[auth.email.smtp]
enabled = true
host = "smtp.resend.com"
port = 587
user = "resend"
pass = "env(RESEND_API_KEY)"
admin_email = "noreply@yourdomain.com"
sender_name = "EmotionsApp"
```

### D. Using Mailgun

```toml
[auth.email.smtp]
enabled = true
host = "smtp.mailgun.org"
port = 587
user = "postmaster@your-domain.mailgun.org"
pass = "env(MAILGUN_SMTP_PASSWORD)"
admin_email = "noreply@yourdomain.com"
sender_name = "EmotionsApp"
```

## Option 3: Use Supabase Hosted (Production Only)

For hosted Supabase projects, emails work automatically without SMTP configuration.

## Testing Email Setup

After configuring SMTP:

1. **Restart Supabase:**
```bash
supabase stop
supabase start
```

2. **Test signup** with a real email address
3. **Check logs:**
```bash
supabase logs -f auth
```

## Current Status
- ✅ Email confirmation flow implemented
- ✅ Pages and routing working
- ❌ SMTP not configured (emails not sending)
- ✅ Temporarily disabled for development

## Next Steps
1. **For Development:** Email confirmations are now disabled - users can sign up and sign in immediately
2. **For Production:** Configure SMTP using one of the options above
3. **Re-enable confirmations** once SMTP is working 