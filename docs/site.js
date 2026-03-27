(function () {
  const body = document.body;
  const browserAppUrl =
    body?.dataset.browserAppUrl || "https://nowly-webapp.vercel.app/";
  const mobileAppUrl = body?.dataset.mobileAppUrl || "nowly://onboarding";
  const iosStoreUrl =
    body?.dataset.iosStoreUrl || "https://apps.apple.com/us/search?term=Nowly";
  const androidStoreUrl =
    body?.dataset.androidStoreUrl ||
    "https://play.google.com/store/apps/details?id=com.nowly.app";
  const normalizedBrowserAppUrl = browserAppUrl.replace(/\/+$/, "");
  const appUrlForPath = (path) => `${normalizedBrowserAppUrl}${path}`;
  const openNowlyUrl = appUrlForPath("/");

  document.querySelectorAll("[data-nowly-open]").forEach((element) => {
    element.setAttribute("href", openNowlyUrl);
    element.textContent = "Open Nowly";
  });

  document.querySelectorAll("[data-nowly-browser]").forEach((element) => {
    element.setAttribute("href", openNowlyUrl);
    element.textContent = "Open Nowly in your browser";
  });

  document.querySelectorAll("[data-nowly-mobile]").forEach((element) => {
    const isAndroid = /Android/i.test(window.navigator.userAgent);
    const isIos = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
    const downloadUrl = isAndroid ? androidStoreUrl : isIos ? iosStoreUrl : mobileAppUrl;
    element.setAttribute("href", downloadUrl || mobileAppUrl);
  });
})();
