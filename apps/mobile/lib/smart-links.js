const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_BASE_URL?.replace(/\/$/, "") ?? null;
const DEFAULT_WEB_BASE_URL = "https://nowly-webapp.vercel.app";
const IOS_STORE_URL = process.env.EXPO_PUBLIC_IOS_STORE_URL?.replace(/\/$/, "") ??
    "https://apps.apple.com/us/search?term=Nowly";
const ANDROID_STORE_URL = process.env.EXPO_PUBLIC_ANDROID_STORE_URL?.replace(/\/$/, "") ??
    "https://play.google.com/store/apps/details?id=com.nowly.app";
const normalizePath = (path) => (path.startsWith("/") ? path : `/${path}`);
const runtimeWebBaseUrl = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : null;
const resolvedWebBaseUrl = WEB_BASE_URL ?? runtimeWebBaseUrl ?? DEFAULT_WEB_BASE_URL;
export const createMobileDeepLink = (path) => `nowly://${normalizePath(path).replace(/^\//, "")}`;
export const createBrowserAppUrl = (path) => resolvedWebBaseUrl ? `${resolvedWebBaseUrl}/app${normalizePath(path)}` : null;
export const createSmartOpenUrlForTargets = (appPath, browserPath = appPath) => {
    const appLink = createMobileDeepLink(appPath);
    if (!resolvedWebBaseUrl) {
        return appLink;
    }
    const openUrl = new URL(`${resolvedWebBaseUrl}/open.html`);
    openUrl.searchParams.set("app", appLink);
    const browserUrl = createBrowserAppUrl(browserPath);
    if (browserUrl) {
        openUrl.searchParams.set("browser", browserUrl);
    }
    openUrl.searchParams.set("ios", IOS_STORE_URL);
    openUrl.searchParams.set("android", ANDROID_STORE_URL);
    return openUrl.toString();
};
export const createSmartOpenUrl = (path) => createSmartOpenUrlForTargets(path);
export const getStoreUrls = () => ({
    ios: IOS_STORE_URL,
    android: ANDROID_STORE_URL,
});
