import { formatGiftPrice } from "./gifts";
import { getAppOrigin } from "./email";

function layout(title: string, bodyHtml: string): string {
  const origin = getAppOrigin();
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;color:#2c2416;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fffdf8;border:1px solid #d4c4a8;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px;text-align:center;">
          <div style="font-size:22px;font-weight:bold;color:#8b4513;">Zumelia</div>
        </td></tr>
        <tr><td style="padding:8px 32px 28px;line-height:1.6;font-size:16px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #e8dcc8;font-size:12px;color:#7a6f5f;text-align:center;">
          <a href="${origin}" style="color:#8b4513;">Open Zumelia</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function birthdayWishEmail(displayName: string): {
  subject: string;
  html: string;
  text: string;
} {
  const name = displayName.trim() || "there";
  const subject = `Happy birthday, ${name}! 🎂`;
  const html = layout(
    subject,
    `<p style="font-size:20px;font-weight:bold;margin:0 0 16px;">Happy birthday, ${name}! 🎂</p>
     <p style="margin:0 0 12px;">The whole Zumelia community is wishing you a wonderful day. May your year ahead be full of connection, joy, and great conversations.</p>
     <p style="margin:0;">Hop on Zumelia and celebrate with your friends today.</p>`,
  );
  const text = `Happy birthday, ${name}!\n\nThe whole Zumelia community is wishing you a wonderful day. Open Zumelia to celebrate with your friends.\n\n${getAppOrigin()}`;
  return { subject, html, text };
}

export function purchaseConfirmationEmail(input: {
  buyerName: string;
  itemName: string;
  itemEmoji: string;
  amountCents: number;
  orderId: string;
  recipientName?: string;
}): { subject: string; html: string; text: string } {
  const name = input.buyerName.trim() || "there";
  const price = formatGiftPrice(input.amountCents);
  const recipientLine = input.recipientName
    ? ` for <strong>${input.recipientName}</strong>`
    : "";
  const subject = `Your Zumelia purchase is confirmed — ${input.itemEmoji} ${input.itemName}`;
  const html = layout(
    subject,
    `<p style="font-size:18px;font-weight:bold;margin:0 0 16px;">Thanks for your purchase, ${name}!</p>
     <p style="margin:0 0 12px;">We received your payment of <strong>${price}</strong> for ${input.itemEmoji} <strong>${input.itemName}</strong>${recipientLine}.</p>
     <p style="margin:0 0 8px;font-size:14px;color:#7a6f5f;">Order reference: ${input.orderId}</p>
     <p style="margin:0;">Your gift has been delivered on Zumelia. If you have questions, reply to this email or visit your profile.</p>`,
  );
  const text = `Thanks for your purchase, ${name}!\n\nWe received ${price} for ${input.itemEmoji} ${input.itemName}${input.recipientName ? ` for ${input.recipientName}` : ""}.\nOrder reference: ${input.orderId}\n\n${getAppOrigin()}`;
  return { subject, html, text };
}
