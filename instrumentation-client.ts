import { installSupabaseSandbox } from "@/lib/demo/supabaseSandbox";
import posthog from "posthog-js";

installSupabaseSandbox();

if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    capture_exceptions: true,
    debug: false,
    disable_session_recording: process.env.NODE_ENV === "development",
    disable_external_dependency_loading: process.env.NODE_ENV === "development",
  });
}
