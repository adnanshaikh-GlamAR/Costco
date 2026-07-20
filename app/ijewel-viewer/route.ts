const IJewelProfileUrl = "https://ijewel.design/profile/social_1/9724b59";
const fallbackModelUrl =
  "https://cdn1.ijewel.design/84a8d76b66357b5c8cd5216294fb56fb87a9a9f1/6a5d19bd-98b3/Costco-3D-Ring.glb";
const miniViewerVersion = "0.6.8";
const webgiBundleUrl =
  "https://releases.ijewel3d.com/libs/webgi-v0/bundle-0.22.0.js";
const miniViewerBundleUrl = `https://releases.ijewel3d.com/libs/mini-viewer/${miniViewerVersion}/bundle.nowebgi.iife.js`;

type IJewelNextData = {
  props?: {
    pageProps?: {
      project?: {
        name?: string;
        description?: string;
        project_data?: {
          modelUrl?: string;
          version?: string;
          [key: string]: unknown;
        };
      };
      profile?: {
        username?: string;
        full_name?: string;
        avatar_url?: string;
      };
    };
  };
};

function getProfileViewerPayload(html: string) {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/,
  );

  if (!match) {
    return buildViewerPayload();
  }

  try {
    const data = JSON.parse(match[1]) as IJewelNextData;
    const pageProps = data.props?.pageProps;

    return buildViewerPayload(
      pageProps?.project?.project_data,
      pageProps?.project,
      pageProps?.profile,
    );
  } catch {
    return buildViewerPayload();
  }
}

function buildViewerPayload(
  projectData: Record<string, unknown> = {},
  project: { name?: string; description?: string } = {},
  profile: { username?: string; full_name?: string; avatar_url?: string } = {},
) {
  const version =
    typeof projectData.version === "string" ? projectData.version : "v9";
  const majorVersion = Number.parseInt(version.replace(/^v/, ""), 10);
  const basePath =
    Number.isFinite(majorVersion) && majorVersion > 3
      ? "https://packs.ijewel3d.com/files/"
      : `https://assets.ijewel.design/${version}/`;

  return {
    projectData: {
      ...projectData,
      modelUrl:
        typeof projectData.modelUrl === "string"
          ? projectData.modelUrl
          : fallbackModelUrl,
      version,
      basePath:
        typeof projectData.basePath === "string" ? projectData.basePath : basePath,
      logo: "",
      brandingSettings: {
        enabled: false,
        showLoadingScreenLogo: false,
      },
      currentPose: projectData.currentPose ?? null,
      name: project.name ?? "Costco-3D Ring",
      description: project.description ?? "GlamAR",
      profileName: profile.full_name ?? "Social",
      profileDescription: profile.username ? `@${profile.username}` : "@social_1",
      profileImage: profile.avatar_url,
      profileUrl: `https://ijewel.design/profile/${profile.username ?? "social_1"}`,
    },
    viewerOptions: {
      showUiButtons: true,
      showCard: false,
      showShareButton: false,
      showZoomButtons: true,
      showConfigurator: true,
      hideQuality: false,
      hideCameraViews: false,
      hideGltfAnimations: false,
      hideRotateCamera: false,
      hideFullScreen: false,
      hideFitScene: false,
      hideTryOn: true,
      disableInteractionPrompt: false,
      runRotateCamera: false,
      showPosterInLoadingScreen: true,
      showSwitchNode: true,
      transparentBg: false,
      useIjewelLogo: false,
      showProfile: false,
      premiumMaterialLib:
        version !== "v1"
          ? `https://assets.ijewel.design/${version}/materialLibPro.json`
          : undefined,
      isModal: false,
      configuratorBottomOffsetPx: 0,
      brandingSettings: null,
    },
  };
}

function scriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function renderViewerDocument(payload: ReturnType<typeof buildViewerPayload>) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fynd GlamAR 3D Ring Viewer</title>
    <style>
      html,
      body,
      #viewer-root,
      #webgi-canvas-container {
        width: 100%;
        height: 100%;
        margin: 0;
      }

      body {
        background: #f6f8fb;
        overflow: hidden;
        font-family: Arial, Helvetica, sans-serif;
      }

      #viewer-root {
        position: relative;
      }

      #webgi-canvas-container {
        outline: none;
      }

      .glamar-loader {
        align-items: center;
        background:
          radial-gradient(circle at 50% 42%, rgba(0, 102, 177, 0.1), transparent 34%),
          linear-gradient(180deg, rgba(246, 248, 251, 0.96), rgba(255, 255, 255, 0.88));
        color: #0b2341;
        display: flex;
        inset: 0;
        flex-direction: column;
        gap: 10px;
        justify-content: center;
        pointer-events: none;
        position: absolute;
        transition: opacity 220ms ease, visibility 220ms ease;
        z-index: 10;
      }

      .glamar-loader.is-hidden {
        opacity: 0;
        visibility: hidden;
      }

      .glamar-loader__logo {
        display: block;
        height: auto;
        max-width: 72%;
        width: 220px;
      }

      .glamar-loader__text {
        color: #0b2341;
        font-size: 14px;
        font-weight: 700;
      }

      .glamar-loader__bar {
        background: rgba(0, 102, 177, 0.12);
        border-radius: 999px;
        height: 3px;
        margin-top: 2px;
        overflow: hidden;
        width: 126px;
      }

      .glamar-loader__bar::before {
        animation: glamar-progress 1.2s ease-in-out infinite;
        background: linear-gradient(90deg, #0066b3, #e31837);
        border-radius: inherit;
        content: "";
        display: block;
        height: 100%;
        width: 42%;
      }

      #webgi-wrapper > div.absolute.z-10:nth-of-type(2) > div.absolute.h-unit-3xl:nth-of-type(2) > button.z-0.group,
      .costco-configurator-button {
        align-items: center !important;
        display: flex !important;
        justify-content: center !important;
        position: relative !important;
      }

      #webgi-wrapper > div.absolute.z-10:nth-of-type(2) > div.absolute.h-unit-3xl:nth-of-type(2) > button.z-0.group > :not(.costco-configurator-logo):not(.custom-configurator-native-icon),
      .costco-configurator-button > :not(.costco-configurator-logo):not(.custom-configurator-native-icon) {
        opacity: 0 !important;
        visibility: hidden !important;
      }

      #webgi-wrapper > div.absolute.z-10:nth-of-type(2) > div.absolute.h-unit-3xl:nth-of-type(2) > button.z-0.group::before,
      .costco-configurator-button::before {
        background: rgba(255, 255, 255, 0.94);
        border-radius: 999px;
        content: "";
        inset: 7px;
        pointer-events: none;
        position: absolute;
        z-index: 18;
      }

      #webgi-wrapper > div.absolute.z-10:nth-of-type(2) > div.absolute.h-unit-3xl:nth-of-type(2) > button.z-0.group::after,
      .costco-configurator-button::after {
        background: url("../assets/icons/configurator-gear.png") center / contain no-repeat;
        content: "";
        inset: 9px;
        pointer-events: none;
        position: absolute;
        z-index: 20;
      }

      .costco-configurator-logo {
        align-items: center;
        display: flex;
        inset: 0;
        justify-content: center;
        pointer-events: none;
        position: absolute;
        z-index: 2;
      }

      .costco-configurator-logo img {
        display: block;
        height: auto;
        max-height: 34px;
        max-width: 34px;
        object-fit: contain;
        position: relative;
        width: 76%;
        z-index: 21;
      }

      #webgi-wrapper > div.absolute.z-10:nth-of-type(2) > div.absolute.h-unit-3xl:nth-of-type(2) > button.z-0.group > img.h-4.h-full,
      .custom-configurator-native-icon {
        display: block !important;
        height: 32px !important;
        max-height: 32px !important;
        max-width: 32px !important;
        object-fit: contain !important;
        opacity: 1 !important;
        position: relative !important;
        visibility: visible !important;
        width: 32px !important;
        z-index: 22 !important;
      }

      @keyframes glamar-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes glamar-progress {
        0% {
          transform: translateX(-110%);
        }

        100% {
          transform: translateX(250%);
        }
      }
    </style>
  </head>
  <body>
    <div id="viewer-root">
      <div id="webgi-canvas-container" tabindex="0"></div>
      <div class="glamar-loader" id="viewer-status" role="status" aria-live="polite">
        <img class="glamar-loader__logo" src="../assets/brand/fynd-glamar-loader.png" alt="Fynd GlamAR" />
        <span class="glamar-loader__text">Loading 3D experience</span>
        <span class="glamar-loader__bar" aria-hidden="true"></span>
      </div>
    </div>
    <script>
      const projectData = ${scriptJson(payload.projectData)};
      const viewerOptions = ${scriptJson(payload.viewerOptions)};
      const statusEl = document.getElementById("viewer-status");
      const configuratorIconUrl = "../assets/icons/configurator-gear.png";
      const configuratorButtonSelectors = [
        "#webgi-wrapper > div.absolute.z-10:nth-of-type(2) > div.absolute.h-unit-3xl:nth-of-type(2) > button.z-0.group",
        "#webgi-wrapper button.z-0.group[aria-label*='config' i]",
        "#webgi-wrapper button.z-0.group[title*='config' i]",
      ];
      const configuratorImageSelectors = [
        "#webgi-wrapper > div.absolute.z-10:nth-of-type(2) > div.absolute.h-unit-3xl:nth-of-type(2) > button.z-0.group > img.h-4.h-full",
        "#webgi-wrapper button.z-0.group > img.h-4.h-full",
        "#webgi-wrapper button > img.h-4.h-full",
      ];
      let didAutoOpenConfigurator = false;
      const syncedMetalOptionImages = new WeakSet();

      function loadScript(src) {
        return new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = src;
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error("Unable to load " + src));
          document.head.appendChild(script);
        });
      }

      function findConfiguratorButton() {
        for (const selector of configuratorButtonSelectors) {
          let button = null;

          try {
            button = document.querySelector(selector);
          } catch {
            button = null;
          }

          if (button) {
            return button;
          }
        }

        const wrapper = document.getElementById("webgi-wrapper");

        if (!wrapper) {
          return null;
        }

        return Array.from(wrapper.querySelectorAll("button")).find((button) => {
          const rect = button.getBoundingClientRect();
          const isVisible = rect.width >= 28 && rect.height >= 28;
          const isNearBottom = rect.bottom > window.innerHeight - 150;
          const isNearCenter = Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2) < 170;

          return isVisible && isNearBottom && isNearCenter;
        }) ?? null;
      }

      function findConfiguratorImage(button) {
        for (const selector of configuratorImageSelectors) {
          let image = null;

          try {
            image = document.querySelector(selector);
          } catch {
            image = null;
          }

          if (image) {
            return image;
          }
        }

        return button?.querySelector("img.h-4.h-full, img") ?? null;
      }

      function buildConfiguratorLogo() {
        const logoWrap = document.createElement("span");
        const logo = document.createElement("img");

        logoWrap.className = "costco-configurator-logo";
        logoWrap.setAttribute("aria-hidden", "true");
        logo.src = configuratorIconUrl;
        logo.alt = "";

        logoWrap.appendChild(logo);

        return logoWrap;
      }

      function postMetalSelection(metal) {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "costco:metal-change", metal }, "*");
        }
      }

      function getMetalFromSearchableText(searchableText) {
        const normalizedText = searchableText.toLowerCase();

        if (normalizedText.includes("silver") || normalizedText.includes("white")) {
          return "white";
        }

        if (
          normalizedText.includes("yellowgold") ||
          normalizedText.includes("yellow_gold") ||
          normalizedText.includes("yellow gold")
        ) {
          return "yellow";
        }

        return null;
      }

      function getSearchableTextForElement(element) {
        const button = element.closest?.("button");
        const image =
          element.matches?.("img") ? element : element.closest?.("img") || button?.querySelector("img");

        return [
          image?.getAttribute("src"),
          image?.currentSrc,
          image?.getAttribute("alt"),
          image?.getAttribute("data-costco-metal-option"),
          button?.getAttribute("aria-label"),
          button?.getAttribute("title"),
          button?.getAttribute("data-costco-metal-option"),
          button?.textContent,
          element.getAttribute?.("aria-label"),
          element.getAttribute?.("title"),
          element.getAttribute?.("data-costco-metal-option"),
          element.textContent,
        ]
          .filter(Boolean)
          .join(" ");
      }

      function inferMetalFromConfiguratorTarget(target) {
        const element = target instanceof Element ? target : target?.parentElement;

        if (!element) {
          return null;
        }

        return getMetalFromSearchableText(getSearchableTextForElement(element));
      }

      function inferMetalFromConfiguratorEvent(event) {
        const eventPath =
          typeof event.composedPath === "function" ? event.composedPath() : [event.target];

        for (const element of eventPath) {
          const metal = inferMetalFromConfiguratorTarget(element);

          if (metal) {
            return metal;
          }
        }

        return null;
      }

      function findImagesDeep(root = document) {
        const images = Array.from(root.querySelectorAll("img"));

        root.querySelectorAll("*").forEach((element) => {
          if (element.shadowRoot) {
            images.push(...findImagesDeep(element.shadowRoot));
          }
        });

        return images;
      }

      function bindMetalOptionImages() {
        findImagesDeep().forEach((image) => {
          const metal = getMetalFromSearchableText(
            [
              image.getAttribute("src"),
              image.currentSrc,
              image.getAttribute("alt"),
              image.getAttribute("title"),
            ]
              .filter(Boolean)
              .join(" "),
          );

          if (!metal || syncedMetalOptionImages.has(image)) {
            return;
          }

          syncedMetalOptionImages.add(image);
          image.setAttribute("data-costco-metal-option", metal);
          image.addEventListener(
            "pointerup",
            () => window.setTimeout(() => postMetalSelection(metal), 120),
            true,
          );
          image.addEventListener(
            "click",
            () => window.setTimeout(() => postMetalSelection(metal), 120),
            true,
          );
        });
      }

      ["pointerup", "click"].forEach((eventName) => {
        document.addEventListener(
          eventName,
          (event) => {
            const metal = inferMetalFromConfiguratorEvent(event);

            if (metal) {
              window.setTimeout(() => postMetalSelection(metal), 80);
            }
          },
          true,
        );
      });

      function isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        return (
          rect.width > 20 &&
          rect.height > 20 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity || 1) > 0.05
        );
      }

      function isConfiguratorPanelOpen(button) {
        if (
          button.getAttribute("aria-expanded") === "true" ||
          button.getAttribute("data-state") === "open" ||
          button.getAttribute("aria-pressed") === "true"
        ) {
          return true;
        }

        const wrapper = document.getElementById("webgi-wrapper");

        if (!wrapper) {
          return false;
        }

        return Array.from(
          wrapper.querySelectorAll("[role='dialog'], [data-state='open'], [class*='popover'], [class*='absolute']"),
        ).some((element) => {
          const text = (element.textContent || "").replace(/\\s+/g, " ").trim().toLowerCase();

          return text.includes("metal") && text.includes("gem") && isElementVisible(element);
        });
      }

      function updateConfiguratorButtonLogo() {
        const button = findConfiguratorButton();

        if (!button) {
          return null;
        }

        button.classList.add("costco-configurator-button");
        button.setAttribute("data-costco-configurator", "true");

        if (!button.getAttribute("aria-label")) {
          button.setAttribute("aria-label", "Open 3D configurator");
        }

        const nativeIcon = findConfiguratorImage(button);

        if (nativeIcon) {
          nativeIcon.src = configuratorIconUrl;
          nativeIcon.alt = "";
          nativeIcon.classList.add("custom-configurator-native-icon");
          nativeIcon.removeAttribute("srcset");
          nativeIcon.setAttribute("aria-hidden", "true");
          button.querySelectorAll(".costco-configurator-logo").forEach((node) => node.remove());
          return button;
        }

        if (
          button.children.length !== 1 ||
          !button.firstElementChild?.classList.contains("costco-configurator-logo")
        ) {
          button.replaceChildren(buildConfiguratorLogo());
        }

        return button;
      }

      function openConfiguratorByDefault() {
        if (didAutoOpenConfigurator) {
          return;
        }

        const button = updateConfiguratorButtonLogo();

        if (
          !button ||
          button.disabled ||
          button.getAttribute("aria-disabled") === "true"
        ) {
          return;
        }

        if (isConfiguratorPanelOpen(button)) {
          didAutoOpenConfigurator = true;
          return;
        }

        didAutoOpenConfigurator = true;
        button.click();
        window.setTimeout(updateConfiguratorButtonLogo, 120);
      }

      function syncConfiguratorUi() {
        updateConfiguratorButtonLogo();
        bindMetalOptionImages();
        openConfiguratorByDefault();
      }

      const configuratorLogoObserver = new MutationObserver(syncConfiguratorUi);

      configuratorLogoObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      window.addEventListener("webgi-viewer-ready", () => {
        statusEl.classList.add("is-hidden");
        syncConfiguratorUi();
        console.log("Fynd GlamAR viewer ready");
      });

      async function startViewer() {
        try {
          await loadScript(${JSON.stringify(webgiBundleUrl)});
          await loadScript(${JSON.stringify(miniViewerBundleUrl)});

          const Viewer = window.ijewelViewer && window.ijewelViewer.Viewer;

          if (!Viewer) {
            throw new Error("iJewel viewer runtime was not found.");
          }

          window.costcoIjewelViewer = new Viewer(
            document.getElementById("webgi-canvas-container"),
            projectData,
            viewerOptions,
          );

          syncConfiguratorUi();
          window.setTimeout(() => statusEl.classList.add("is-hidden"), 2500);
          window.setTimeout(syncConfiguratorUi, 250);
          window.setTimeout(syncConfiguratorUi, 1000);
          window.setTimeout(syncConfiguratorUi, 2500);
          const configuratorLogoInterval = window.setInterval(syncConfiguratorUi, 300);
          window.setTimeout(() => window.clearInterval(configuratorLogoInterval), 8000);
        } catch (error) {
          console.error(error);
          statusEl.innerHTML = '<img class="glamar-loader__logo" src="../assets/brand/fynd-glamar-loader.png" alt="Fynd GlamAR"><span class="glamar-loader__text">3D viewer unavailable</span>';
        }
      }

      startViewer();
    </script>
  </body>
</html>`;
}

export async function GET() {
  const profileResponse = await fetch(IJewelProfileUrl, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
    },
  });

  const profileHtml = profileResponse.ok ? await profileResponse.text() : "";
  const payload = getProfileViewerPayload(profileHtml);

  return new Response(renderViewerDocument(payload), {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    },
  });
}
