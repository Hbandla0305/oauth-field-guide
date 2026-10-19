// "Create the app for me": for providers that support pre-filled app creation, the agent builds
// the configuration and a link that opens the provider's console with it filled in. The user
// reviews and presses Create; we never see their credentials.
//   GitHub: https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-using-url-parameters
//   Slack:  https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests (manifest_json)

export type Profile = { productName: string; website: string; redirectUrl: string; whatItDoes: string };

export const EMPTY_PROFILE: Profile = { productName: "", website: "", redirectUrl: "", whatItDoes: "" };

export const SETUP_PROVIDERS = ["slack", "github"] as const;

export function supportsSetup(slug: string): slug is (typeof SETUP_PROVIDERS)[number] {
  return (SETUP_PROVIDERS as readonly string[]).includes(slug);
}

const name = (p: Profile) => p.productName.trim() || "My agent";
const site = (p: Profile) => p.website.trim() || "https://example.com";
const redirect = (p: Profile) => p.redirectUrl.trim() || `${site(p).replace(/\/$/, "")}/oauth/callback`;

// Editable starting configuration (shown to the user before anything opens).
export function defaultConfig(slug: (typeof SETUP_PROVIDERS)[number], p: Profile): string {
  if (slug === "slack") {
    return JSON.stringify(
      {
        display_information: { name: name(p).slice(0, 35), description: (p.whatItDoes || "An AI agent that connects to your Slack workspace.").slice(0, 139) },
        features: { bot_user: { display_name: name(p).slice(0, 80), always_online: true } },
        oauth_config: {
          redirect_urls: [redirect(p)],
          // Basic bot scopes: no extra Marketplace scrutiny. Add history scopes only if you read messages
          // (see the Slack guide: unlisted apps are throttled on conversations.history).
          scopes: { bot: ["app_mentions:read", "chat:write", "channels:read", "users:read"] },
        },
        settings: { org_deploy_enabled: false, socket_mode_enabled: false, token_rotation_enabled: true },
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      name: name(p).slice(0, 34),
      description: p.whatItDoes || "An AI agent that works with your repositories.",
      url: site(p),
      "callback_urls[]": [redirect(p)],
      request_oauth_on_install: true,
      public: true,
      webhook_active: false,
      // Fine-grained permissions: start read-only and add only what your agent needs.
      contents: "read",
      issues: "read",
      pull_requests: "read",
    },
    null,
    2,
  );
}

export function setupUrl(slug: (typeof SETUP_PROVIDERS)[number], configJson: string): { url: string } | { error: string } {
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(configJson);
  } catch {
    return { error: "That configuration isn't valid JSON. Fix it, or reset to the default." };
  }
  if (slug === "slack") {
    return { url: `https://api.slack.com/apps?new_app=1&manifest_json=${encodeURIComponent(JSON.stringify(config))}` };
  }
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(config)) {
    if (Array.isArray(v)) v.forEach((x) => params.append(k, String(x)));
    else if (v !== null && v !== undefined && v !== "") params.append(k, String(v));
  }
  return { url: `https://github.com/settings/apps/new?${params.toString()}` };
}
