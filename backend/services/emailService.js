const { Resend } = require('resend');

// Lazy client — instantiated at send-time so server boots without a real API key
const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set in environment variables');
  }
  return new Resend(process.env.RESEND_API_KEY);
};

/**
 * Sends a subscription renewal alert email to a user.
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.userName - Recipient's name
 * @param {string} params.subName - Subscription name (e.g. "Netflix")
 * @param {number} params.amount - Total bill amount
 * @param {number} params.yourShare - User's actual share after splitting
 * @param {string} params.currency - Currency code (e.g. "INR")
 * @param {string} params.billingCycle - e.g. "monthly"
 * @param {Date}   params.renewalDate - The upcoming renewal date
 * @param {number} params.daysLeft - Days remaining until renewal
 */
const sendRenewalAlertEmail = async ({
  toEmail,
  userName,
  subName,
  amount,
  yourShare,
  currency,
  billingCycle,
  renewalDate,
  daysLeft,
}) => {
  const formattedDate = new Date(renewalDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const urgencyColor = daysLeft <= 1 ? '#ef4444' : daysLeft <= 3 ? '#f97316' : '#6366f1';
  const urgencyLabel =
    daysLeft === 0
      ? '🚨 TODAY'
      : daysLeft === 1
      ? '⚠️ TOMORROW'
      : `📅 in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;

  const isShared = yourShare < amount;
  const splitNote = isShared
    ? `<p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">
        💸 Shared bill — your share is <strong style="color:#f1f5f9;">${currency} ${yourShare.toFixed(2)}</strong>
        out of the total <strong style="color:#f1f5f9;">${currency} ${amount.toFixed(2)}</strong>
       </p>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
              
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                    💳 FinRoute Alert
                  </h1>
                  <p style="margin:8px 0 0;color:#e0e7ff;font-size:14px;">Smart Subscription Manager</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 24px;color:#cbd5e1;font-size:15px;">
                    Hey <strong style="color:#f1f5f9;">${userName}</strong> 👋
                  </p>

                  <!-- Alert Card -->
                  <div style="background:#0f172a;border-radius:12px;padding:24px;border-left:4px solid ${urgencyColor};margin-bottom:24px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                      <div>
                        <h2 style="margin:0 0 4px;color:#f1f5f9;font-size:20px;font-weight:700;">${subName}</h2>
                        <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;text-transform:capitalize;">${billingCycle} subscription</p>
                      </div>
                      <span style="background:${urgencyColor}22;color:${urgencyColor};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;">
                        ${urgencyLabel}
                      </span>
                    </div>
                    
                    <p style="margin:0 0 8px;color:#f1f5f9;font-size:28px;font-weight:800;">
                      ${currency} ${amount.toFixed(2)}
                    </p>
                    ${splitNote}
                    <p style="margin:12px 0 0;color:#64748b;font-size:13px;">
                      📆 Renews on <strong style="color:#94a3b8;">${formattedDate}</strong>
                    </p>
                  </div>

                  <!-- CTA -->
                  <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6;">
                    If you want to cancel before this charge hits, now is the time. Log in to FinRoute to manage this subscription.
                  </p>

                  <div style="text-align:center;margin:24px 0;">
                    <a href="#" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">
                      Open FinRoute Dashboard →
                    </a>
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#0f172a;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;">
                  <p style="margin:0;color:#475569;font-size:12px;">
                    You're receiving this because you set up renewal alerts in FinRoute.<br>
                    © 2025 FinRoute — Smart Expense Optimization
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: 'FinRoute Alerts <alerts@finroute.app>',
    to: [toEmail],
    subject: `⚡ ${subName} renews ${urgencyLabel} — ${currency} ${yourShare.toFixed(2)}`,
    html,
  });

  if (error) {
    throw new Error(`Resend API error: ${JSON.stringify(error)}`);
  }

  return data;
};

module.exports = { sendRenewalAlertEmail };
