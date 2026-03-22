(function () {
  const body = document.body;
  const browserAppUrl =
    body?.dataset.browserAppUrl || "https://nowly-webapp.vercel.app/app";
  const mobileAppUrl = body?.dataset.mobileAppUrl || "nowly://onboarding";
  const iosStoreUrl =
    body?.dataset.iosStoreUrl || "https://apps.apple.com/us/search?term=Nowly";
  const androidStoreUrl =
    body?.dataset.androidStoreUrl ||
    "https://play.google.com/store/apps/details?id=com.nowly.app";

  const readPersistedAppState = () => {
    try {
      const raw = window.localStorage.getItem("nowly-app-store");
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && "state" in parsed) {
        return parsed.state || null;
      }

      return parsed;
    } catch (error) {
      return null;
    }
  };

  const hasBrowserSession = () => {
    try {
      if (window.localStorage.getItem("nowly.browser.session") === "1") {
        return true;
      }

      const appState = readPersistedAppState();
      return Boolean(appState && typeof appState === "object" && appState.token);
    } catch (error) {
      return false;
    }
  };

  const applyNowlyLinks = () => {
    const loggedIn = hasBrowserSession();

    document.querySelectorAll("[data-nowly-open]").forEach((element) => {
      element.setAttribute("href", browserAppUrl);
      element.textContent = loggedIn ? "Open Nowly" : "Log in";
    });

    document.querySelectorAll("[data-nowly-browser]").forEach((element) => {
      element.setAttribute("href", browserAppUrl);
      element.textContent = loggedIn
        ? "Open Nowly in your browser"
        : "Log in to Nowly in your browser";
    });

    document.querySelectorAll("[data-nowly-mobile]").forEach((element) => {
      const isAndroid = /Android/i.test(window.navigator.userAgent);
      const isIos = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
      const downloadUrl = isAndroid ? androidStoreUrl : isIos ? iosStoreUrl : browserAppUrl;
      element.setAttribute("href", downloadUrl || mobileAppUrl);
    });
  };

  applyNowlyLinks();

  window.addEventListener("pageshow", applyNowlyLinks);
  window.addEventListener("storage", applyNowlyLinks);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      applyNowlyLinks();
    }
  });
})();
