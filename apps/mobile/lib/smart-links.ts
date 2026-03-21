const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_BASE_URL?.replace(/\/$/, "") ?? null;
const IOS_STORE_URL =
  process.env.EXPO_PUBLIC_IOS_STORE_URL?.replace(/\/$/, "") ??
  "https://apps.apple.com/us/search?term=Nowly";
const ANDROID_STORE_URL =
  process.env.EXPO_PUBLIC_ANDROID_STORE_URL?.replace(/\/$/, "") ??
  "https://play.google.com/store/apps/details?id=com.nowly.app";

const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

export const createMobileDeepLink = (path: string) => `nowly://${normalizePath(path).replace(/^\//, "")}`;

export const createBrowserAppUrl = (path: string) =>
  WEB_BASE_URL ? `${WEB_BASE_URL}/app${normalizePath(path)}` : null;

export const createSmartOpenUrlForTargets = (appPath: string, browserPath = appPath) => {
  const appLink = createMobileDeepLink(appPath);

  if (!WEB_BASE_URL) {
    return appLink;
  }

  const openUrl = new URL(`${WEB_BASE_URL}/open.html`);
  openUrl.searchParams.set("app", appLink);

  const browserUrl = createBrowserAppUrl(browserPath);
  if (browserUrl) {
    openUrl.searchParams.set("browser", browserUrl);
  }

  openUrl.searchParams.set("ios", IOS_STORE_URL);
  openUrl.searchParams.set("android", ANDROID_STORE_URL);

  return openUrl.toString();
};

export const createSmartOpenUrl = (path: string) => createSmartOpenUrlForTargets(path);

export const getStoreUrls = () => ({
  ios: IOS_STORE_URL,
  android: ANDROID_STORE_URL,
});
