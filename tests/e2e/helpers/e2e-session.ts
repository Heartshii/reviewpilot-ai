import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import {
  E2E_SESSION_COOKIE,
  encodeE2ESession,
} from "@/lib/e2e-session";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://127.0.0.1:3000";

type BootstrapResult = {
  ok: boolean;
  clerkId: string;
  email: string;
  slug?: string | null;
  mode: "withoutWorkspace" | "withWorkspace";
};

export async function bootstrapE2ESession(args: {
  request: APIRequestContext;
  context: BrowserContext;
  page: Page;
  mode: "withoutWorkspace" | "withWorkspace";
  businessName?: string;
  businessType?: string;
}) {
  await args.request.post("/api/e2e/clear");

  const response = await args.request.post("/api/e2e/bootstrap", {
    data: {
      mode: args.mode,
      businessName: args.businessName,
      businessType: args.businessType,
    },
  });

  if (!response.ok()) {
    throw new Error(`E2E bootstrap failed with status ${response.status()}`);
  }

  const data = (await response.json()) as BootstrapResult;
  await args.context.addCookies([
    {
      name: E2E_SESSION_COOKIE,
      value: encodeE2ESession({
        clerkId: data.clerkId,
        email: data.email,
      }),
      url: baseURL,
      sameSite: "Lax",
    },
  ]);
  await args.page.goto("/", { waitUntil: "domcontentloaded" });
  await args.page.evaluate(
    ([name, value]) => {
      document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
    },
    [
      E2E_SESSION_COOKIE,
      encodeE2ESession({
        clerkId: data.clerkId,
        email: data.email,
      }),
    ]
  );

  return data;
}
