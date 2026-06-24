import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function VoicePage() {
  redirect("/live?tab=voice");
}
