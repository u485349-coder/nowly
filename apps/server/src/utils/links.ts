import { env } from "../config/env.js";

const normalizePath = (path: string) => {
  const nextPath = path.startsWith("/") ? path : `/${path}`;
  return nextPath;
};

const cleanBaseUrl = env.CLIENT_ORIGIN.replace(/\/$/, "");

export const createMobileDeepLink = (path: string) =>
  `${env.MOBILE_DEEP_LINK_SCHEME}://${normalizePath(path).replace(/^\//, "")}`;

export const createBrowserAppLink = (path: string) => `${cleanBaseUrl}/app${normalizePath(path)}`;

export const createSmartOpenLinkForTargets = (appPath: string, browserPath = appPath) => {
  const url = new URL(`${cleanBaseUrl}/open.html`);
  url.searchParams.set("app", createMobileDeepLink(appPath));
  url.searchParams.set("browser", createBrowserAppLink(browserPath));

  if (env.IOS_STORE_URL) {
    url.searchParams.set("ios", env.IOS_STORE_URL);
  }

  if (env.ANDROID_STORE_URL) {
    url.searchParams.set("android", env.ANDROID_STORE_URL);
  }

  return url.toString();
};

export const createSmartOpenLink = (path: string) => createSmartOpenLinkForTargets(path);
