/**
 * Email Configuration
 * SMTP settings for Amazon SES
 */

export const EMAIL_CONFIG = {
  smtp: {
    host: process.env.SMTP_HOST || 'email-smtp.eu-west-1.amazonaws.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  },
  from: {
    name: 'Globehunters',
    email: process.env.SMTP_FROM_EMAIL || 'bookings@globehunters.com',
  },
  replyTo: 'documents@globehunters.com',
  supportPhone: '1800 849 102',
  supportEmail: 'documents@globehunters.com',
};
