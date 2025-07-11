# IMPORTANT: Email Template Update Required

## Issue
Your current email template uses `{{ .ConfirmationURL }}` which doesn't work properly with our custom confirmation flow.

## Required Change
In your Supabase Authentication Email Templates, you need to update the confirmation link from:

```html
<a href="{{ .ConfirmationURL }}" class="button">Confirm My Email</a>
```

To:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" class="button">Confirm My Email</a>
```

## Why This Change is Needed
- `{{ .ConfirmationURL }}` uses Supabase's default confirmation flow
- `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` uses our custom confirmation page that redirects directly to the dashboard

## How to Update
1. Go to your Supabase Dashboard
2. Navigate to Authentication > Email Templates
3. Select the "Confirm signup" template
4. Replace the confirmation link as shown above
5. Save the template

## Complete Updated Template
Here's your complete template with the fix:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Confirm Your Email</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f8f9fa;
        color: #343a40;
        margin: 0;
        padding: 20px;
      }
      .container {
        background-color: #ffffff;
        border-radius: 8px;
        max-width: 600px;
        margin: 0 auto;
        padding: 30px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }
      h2 {
        color: #2c3e50;
      }
      .button {
        display: inline-block;
        margin-top: 20px;
        padding: 12px 24px;
        font-size: 16px;
        background-color: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 6px;
      }
      .features {
        margin-top: 30px;
        padding-left: 20px;
      }
      .features li {
        margin-bottom: 10px;
      }
      .footer {
        margin-top: 40px;
        font-size: 12px;
        color: #6c757d;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Confirm Your Email Address</h2>
      <p>Hi there,</p>
      <p>Thank you for signing up for <strong>EmotionsApp</strong>.</p>
      <p>To complete your registration, please confirm your email address by clicking the button below:</p>
      <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" class="button">Confirm My Email</a>

      <div class="features">
        <p>Once confirmed, you'll be able to:</p>
        <ul>
          <li>Track your mood and emotions</li>
          <li>Connect with certified mood mentors</li>
          <li>Join supportive community groups</li>
          <li>Access mental health resources</li>
          <li>Keep a private journal</li>
        </ul>
      </div>

      <p>If you did not create this account, you can safely ignore this email.</p>

      <div class="footer">
        &copy; 2025 EmotionsApp. All rights reserved.<br />
        You're receiving this email because you signed up for EmotionsApp.
      </div>
    </div>
  </body>
</html>
```

After making this change, the confirmation flow will work as follows:
1. User signs up → Sees "Check Your Email" page
2. User clicks email confirmation link → Goes to confirmation page
3. Email verified → Automatically redirected to their dashboard (no sign-in required) 