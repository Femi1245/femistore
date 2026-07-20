import { router, type Href } from "expo-router";

/** Map web-style notification hrefs to Expo Router paths. */
export function navigateFromNotificationHref(href: string): void {
  if (href.startsWith("/live/")) {
    router.push(href as `/live/${string}`);
    return;
  }
  if (href.startsWith("/post/")) {
    router.push(href as Href);
    return;
  }
  if (href.startsWith("/chat")) {
    const q = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
    const convId = new URLSearchParams(q).get("c");
    if (convId) {
      router.push({ pathname: "/(tabs)/chat", params: { c: convId } });
    } else {
      router.push("/(tabs)/chat");
    }
    return;
  }
  if (href === "/feed") {
    router.push("/(tabs)/feed");
    return;
  }
  if (href.startsWith("/profile/")) {
    router.push(href as `/profile/${string}`);
    return;
  }
  router.push("/(tabs)/feed");
}
