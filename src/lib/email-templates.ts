import { formatGiftPrice } from "./gifts";
import { getAppOrigin } from "./email";

function ctaButton(href: string, label: string): string {
  return `<p style="margin:24px 0 0;text-align:center;">
    <a href="${href}" style="display:inline-block;background:#8b4513;color:#fffdf8;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">${label}</a>
  </p>`;
}

function bulletList(items: string[]): string {
  return `<ul style="margin:12px 0;padding-left:20px;line-height:1.7;">
    ${items.map((item) => `<li>${item}</li>`).join("")}
  </ul>`;
}

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

export function welcomeEmail(
  displayName: string,
  accountKind: "personal" | "business" = "personal",
): { subject: string; html: string; text: string } {
  const name = displayName.trim() || "there";
  const origin = getAppOrigin();
  const subject = `Welcome to Zumelia, ${name} — your space is ready 🟠`;

  const personalTips = [
    "Say hi in <strong>Chat</strong> — message friends or discover new people",
    "Post your first update on the <strong>Feed</strong>",
    "Explore <strong>Live</strong>, games, and gifts when you're ready",
  ];
  const businessTips = [
    "Finish your <strong>business storefront</strong> and list a service gig",
    "Turn on your <strong>seller inbox</strong> for customer inquiries",
    "Go <strong>live</strong> to showcase your brand to your audience",
  ];
  const tips = accountKind === "business" ? businessTips : personalTips;

  const html = layout(
    subject,
    `<p style="font-size:20px;font-weight:bold;margin:0 0 16px;">Welcome to Zumelia, ${name}! 🟠</p>
     <p style="margin:0 0 12px;">You just joined a premium social home for real conversation, live moments, and business — built for connection, not endless scrolling.</p>
     <p style="margin:0 0 8px;font-weight:bold;">Here's how to get started:</p>
     ${bulletList(tips)}
     <p style="margin:16px 0 0;">We're glad you're here. Your people are waiting.</p>
     ${ctaButton(`${origin}/feed`, "Open your feed")}`,
  );

  const text = `Welcome to Zumelia, ${name}!\n\nYou just joined a premium social home for real conversation, live moments, and business.\n\nOpen your feed: ${origin}/feed\n\nWe're glad you're here.\n\n${origin}`;
  return { subject, html, text };
}

export type ReengagementStage = "3d" | "7d" | "14d";

export function reengagementEmail(
  displayName: string,
  stage: ReengagementStage,
): { subject: string; html: string; text: string } {
  const name = displayName.trim() || "there";
  const origin = getAppOrigin();

  const copy: Record<
    ReengagementStage,
    { subject: string; headline: string; body: string; cta: string; path: string }
  > = {
    "3d": {
      subject: `${name}, your circle is waiting on Zumelia`,
      headline: "We miss you already",
      body: "It's been a few days since you dropped by. Friends may have posted, messaged, or gone live — your feed is moving without you.",
      cta: "See what you missed",
      path: "/feed",
    },
    "7d": {
      subject: `Still thinking about Zumelia, ${name}?`,
      headline: "Your spot is still here",
      body: "A week away is a long time in a social world. Jump back in for fresh posts, DMs, and live moments from people you follow.",
      cta: "Jump back in",
      path: "/chat",
    },
    "14d": {
      subject: `${name}, come back to Zumelia — something's always happening`,
      headline: "Don't let the conversation pass you by",
      body: "Two weeks is plenty of time for new connections, gigs, and live streams to appear. Zumelia works best when you show up — even for five minutes.",
      cta: "Return to Zumelia",
      path: "/feed",
    },
  };

  const { subject, headline, body, cta, path } = copy[stage];
  const href = `${origin}${path}`;

  const html = layout(
    subject,
    `<p style="font-size:20px;font-weight:bold;margin:0 0 16px;">${headline}, ${name}</p>
     <p style="margin:0 0 12px;">${body}</p>
     <p style="margin:0;">Connection, crafted — that's what Zumelia is for. We'd love to see you again.</p>
     ${ctaButton(href, cta)}`,
  );

  const text = `${headline}, ${name}\n\n${body}\n\n${cta}: ${href}\n\n${origin}`;
  return { subject, html, text };
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
