"use client";

import { useEffect, useRef, useState } from "react";

const productSpecs = [
  { value: "0.50", label: "CTW", icon: "carat" },
  { value: "VS2", label: "Clarity", icon: "clarity" },
  { value: "I", label: "Color", icon: "color" },
  { value: "Excellent", label: "Cut", icon: "cut" },
];

type MetalKey = "yellow" | "white";
type MediaKey = `image-${number}` | "video" | "360";
type TryOnStatus = "idle" | "loading" | "ready" | "error";
type GlamAREvent = string | { eventName?: unknown; name?: unknown; type?: unknown };
type GlamAREventHandler = (event: GlamAREvent) => void;
type GlamARApi = {
  addEventListener: (eventName: string, handler: GlamAREventHandler) => void;
  applyBySku: (skuId: string, callback?: (...args: unknown[]) => void) => void;
  close?: () => void;
  init: (containerId: string, accessKey: string, payload: { platform: "web"; [key: string]: unknown }) => void;
  isLoaded?: () => boolean;
  open: (mode?: string, imageUrl?: string) => void;
  removeEventListener?: (eventName: string, handler: GlamAREventHandler) => void;
};

declare global {
  interface Window {
    GlamAR?: GlamARApi;
    __costcoGlamarInitialized?: boolean;
    __costcoGlamarScriptPromise?: Promise<GlamARApi>;
  }
}

const GLAMAR_ACCESS_KEY = "a9b90ac7-218e-4ee9-b0ba-acb6487f803b";
const GLAMAR_SDK_SRC = "https://cdn.glamar.io/sdk/wrapper";
const GLAMAR_TRYON_CONTAINER_ID = "glamar-tryon-sdk-container";
const GLAMAR_TRYON_SKU = "00101001000111";

const metalOptions = [
  { key: "yellow" as const, name: "14kt Yellow Gold", className: "yellow" },
  { key: "white" as const, name: "14kt White Gold", className: "white" },
];

const yellowGoldImages = [
  {
    label: "Diamond band upright view",
    src: "assets/images/pdp/costco-diamond-band-hero.png",
  },
  {
    label: "Diamond band front view",
    src: "assets/images/pdp/costco-diamond-band-front.png",
  },
  {
    label: "Diamond band on hand",
    src: "assets/images/pdp/costco-diamond-band-hand.png",
  },
  {
    label: "Diamond band close-up front view",
    src: "assets/images/pdp/costco-diamond-band-closeup.png",
  },
  {
    label: "Diamond band side view",
    src: "assets/images/pdp/costco-diamond-band-side.jpeg",
  },
  {
    label: "Diamond band measurements",
    src: "assets/images/pdp/costco-diamond-band-measurements.jpeg",
  },
];

const whiteGoldImages = [
  {
    label: "White gold diamond band front view",
    src: "assets/images/pdp/costco-diamond-band-white-01.png",
  },
  {
    label: "White gold diamond band upright view",
    src: "assets/images/pdp/costco-diamond-band-white-02.png",
  },
  {
    label: "White gold diamond band side view",
    src: "assets/images/pdp/costco-diamond-band-white-03.png",
  },
  {
    label: "White gold diamond band measurements",
    src: "assets/images/pdp/costco-diamond-band-white-04.png",
  },
  {
    label: "White gold diamond band on hand",
    src: "assets/images/pdp/costco-diamond-band-white-05.png",
  },
];

const productImagesByMetal: Record<MetalKey, typeof yellowGoldImages> = {
  yellow: yellowGoldImages,
  white: whiteGoldImages,
};

function getMediaForMetal(metal: MetalKey, currentMedia: MediaKey) {
  if (!currentMedia.startsWith("image-")) {
    return currentMedia;
  }

  const currentIndex = Number(currentMedia.replace("image-", ""));

  return currentIndex < productImagesByMetal[metal].length ? currentMedia : "image-0";
}

function getGlamarEventName(event: GlamAREvent) {
  if (typeof event === "string") {
    return event;
  }

  if (!event || typeof event !== "object") {
    return "";
  }

  for (const key of ["type", "eventName", "name"] as const) {
    const value = event[key];

    if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

function waitForGlamarEvent(glamar: GlamARApi, expectedEvent: string, timeoutMs = 5000) {
  return new Promise<boolean>((resolve) => {
    if (expectedEvent === "loaded" && glamar.isLoaded?.()) {
      resolve(true);
      return;
    }

    let isDone = false;
    const finish = (didReceiveEvent: boolean) => {
      if (isDone) {
        return;
      }

      isDone = true;
      window.clearTimeout(timeoutId);
      glamar.removeEventListener?.("*", handler);
      resolve(didReceiveEvent);
    };
    const handler: GlamAREventHandler = (event) => {
      if (getGlamarEventName(event) === expectedEvent) {
        finish(true);
      }
    };
    const timeoutId = window.setTimeout(() => finish(false), timeoutMs);

    glamar.addEventListener("*", handler);
  });
}

function loadGlamarSdk() {
  if (window.GlamAR) {
    return Promise.resolve(window.GlamAR);
  }

  if (window.__costcoGlamarScriptPromise) {
    return window.__costcoGlamarScriptPromise;
  }

  window.__costcoGlamarScriptPromise = new Promise<GlamARApi>((resolve, reject) => {
    const resolveWithSdk = () => {
      if (window.GlamAR) {
        resolve(window.GlamAR);
        return;
      }

      reject(new Error("GlamAR SDK loaded without exposing window.GlamAR."));
    };

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GLAMAR_SDK_SRC}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", resolveWithSdk, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load the GlamAR SDK.")), {
        once: true,
      });

      if (window.GlamAR) {
        resolveWithSdk();
      }

      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = GLAMAR_SDK_SRC;
    script.addEventListener("load", resolveWithSdk, { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load the GlamAR SDK.")), { once: true });
    document.head.append(script);
  });

  return window.__costcoGlamarScriptPromise;
}

async function ensureGlamarInitialized() {
  const glamar = await loadGlamarSdk();
  const container = document.getElementById(GLAMAR_TRYON_CONTAINER_ID);

  if (!container) {
    throw new Error("GlamAR try-on container is missing.");
  }

  if (!window.__costcoGlamarInitialized) {
    const loadedEvent = waitForGlamarEvent(glamar, "loaded", 9000);

    glamar.init(GLAMAR_TRYON_CONTAINER_ID, GLAMAR_ACCESS_KEY, {
      platform: "web",
    });
    window.__costcoGlamarInitialized = true;
    await loadedEvent;
    return glamar;
  }

  if (!glamar.isLoaded?.()) {
    await waitForGlamarEvent(glamar, "loaded", 1200);
  }

  return glamar;
}

async function applyGlamarTryOnSku(glamar: GlamARApi) {
  const skuAppliedEvent = waitForGlamarEvent(glamar, "sku-applied", 3500);
  let resolveSkuCallback = () => {};
  const skuCallback = new Promise<void>((resolve) => {
    resolveSkuCallback = resolve;
  });
  const fallbackDelay = new Promise<void>((resolve) => {
    window.setTimeout(resolve, 2500);
  });

  glamar.applyBySku(GLAMAR_TRYON_SKU, resolveSkuCallback);
  await Promise.race([skuAppliedEvent, skuCallback, fallbackDelay]);
}

const productVideo = {
  label: "Diamond band product video",
  src: "assets/images/pdp/costco-diamond-band-video.mp4",
};

const relatedProducts = [
  {
    name: "Round Brilliant 1.00 CTW Diamond Ring",
    price: "$2,499.99",
    image: "assets/images/pdp/costco-diamond-band-front.png",
  },
  {
    name: "Twist Diamond 14kt Gold Band",
    price: "$899.99",
    image: "assets/images/pdp/costco-diamond-band-hand.png",
  },
  {
    name: "Classic Pave Diamond Gold Band",
    price: "$1,199.99",
    image: "assets/images/pdp/costco-diamond-band-side.jpeg",
  },
  {
    name: "Emerald Cut Diamond 14kt Ring",
    price: "$1,899.99",
    image: "assets/images/pdp/costco-diamond-band-closeup.png",
  },
];

const customerReviews = [
  {
    author: "Sarah J.",
    title: "Beautiful and timeless",
    rating: "★★★★★",
    ratingLabel: "5 star review",
    text: "The diamond sparkle is bright in daily light, and the gold band feels elegant without sitting too high.",
  },
  {
    author: "Megan R.",
    title: "Great everyday band",
    rating: "★★★★★",
    ratingLabel: "5 star review",
    text: "The ring is comfortable enough for daily wear and stacks neatly with my wedding band.",
  },
  {
    author: "Priya S.",
    title: "Excellent value",
    rating: "★★★★★",
    ratingLabel: "5 star review",
    text: "The finish looks polished and the stones feel secure. It has the Costco value I was hoping for.",
  },
  {
    author: "Diane L.",
    title: "Arrived ready to gift",
    rating: "★★★★☆",
    ratingLabel: "4 star review",
    text: "Shipping was quick, the packaging felt protected, and the certification details were easy to review.",
  },
];

const benefits = [
  {
    icon: "shipping",
    title: "Shipping Included",
    text: "No extra handling fees at checkout.",
  },
  {
    icon: "care",
    title: "Lifetime Care",
    text: "Polishing, inspection, and sizing support.",
  },
  {
    icon: "diamond",
    title: "Certified Diamond",
    text: "GIA documents included in the box.",
  },
  {
    icon: "value",
    title: "Costco Value",
    text: "Member pricing on fine jewellery.",
  },
];

const detailSpecifications = [
  { label: "Birthstone Month", value: "April Birthstone" },
  { label: "Delivery Type", value: "Warehouse Pick-up" },
  { label: "Diamond Clarity", value: "VS2 (Very Slightly Included)" },
  { label: "Diamond Color", value: "Near Colorless (I)" },
  { label: "Number of Stones", value: "12" },
  { label: "Online Only", value: "Online Only" },
  { label: "Stone Shape", value: "Round" },
  { label: "Stone Type", value: "Diamond" },
  { label: "Total Diamond Carat Weight", value: "0.5" },
];

function HeaderIcon({ type }: { type: "search" | "account" | "bag" }) {
  if (type === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="10.75" cy="10.75" r="6.35" />
        <path d="m15.35 15.35 4.15 4.15" />
      </svg>
    );
  }

  if (type === "account") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="7.2" r="3.2" />
        <path d="M5.4 19.8c1-3.7 3.2-5.55 6.6-5.55s5.6 1.85 6.6 5.55" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6.55 8.25h10.9l-.65 11.25H7.2L6.55 8.25Z" />
      <path d="M9 8.25V7a3 3 0 0 1 6 0v1.25" />
    </svg>
  );
}

function BenefitIcon({ type }: { type: string }) {
  if (type === "shipping") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M10 22h29v22H10z" />
        <path d="M39 29h8l7 8v7H39z" />
        <circle cx="21" cy="47" r="4" />
        <circle cx="47" cy="47" r="4" />
      </svg>
    );
  }

  if (type === "care") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M32 9 49 16v15c0 11-7 19-17 24-10-5-17-13-17-24V16z" />
        <path d="m24 32 6 6 11-13" />
      </svg>
    );
  }

  if (type === "diamond") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M17 17h30l9 12-24 27L8 29z" />
        <path d="M8 29h48M20 17l12 39M44 17 32 56M24 29l8-12 8 12" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="13" />
      <path d="m24 33 6 6 12-15" />
    </svg>
  );
}

function SpecIcon({ type }: { type: string }) {
  if (type === "carat") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M9 7h14l4 7-11 12L5 14z" />
        <path d="M5 14h22M12 7l4 19M20 7l-4 19M12 14l4-7 4 7" />
      </svg>
    );
  }

  if (type === "clarity") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r="8" />
        <path d="M16 3v5M16 24v5M3 16h5M24 16h5M7.2 7.2l3.5 3.5M21.3 21.3l3.5 3.5M24.8 7.2l-3.5 3.5M10.7 21.3l-3.5 3.5" />
      </svg>
    );
  }

  if (type === "color") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M16 4c4.5 5 8 9.2 8 14a8 8 0 0 1-16 0c0-4.8 3.5-9 8-14Z" />
        <path d="M12.5 19.5c1.4 2 3.8 2.8 6.2 1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M16 3 20 12l9 4-9 4-4 9-4-9-9-4 9-4z" />
      <path d="M16 10v12M10 16h12" />
    </svg>
  );
}

export default function Home() {
  const [selectedMetal, setSelectedMetal] = useState<MetalKey>("yellow");
  const [selectedMedia, setSelectedMedia] = useState<MediaKey>("image-0");
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [tryOnMessage, setTryOnMessage] = useState("Preparing 3D try-on");
  const [tryOnStatus, setTryOnStatus] = useState<TryOnStatus>("idle");
  const viewerFrameRef = useRef<HTMLIFrameElement>(null);
  const productImages = productImagesByMetal[selectedMetal];
  const selectedMetalLabel = metalOptions.find((metal) => metal.key === selectedMetal)?.name;

  function handleMetalChange(metal: MetalKey) {
    setSelectedMetal(metal);
    setSelectedMedia((currentMedia) => getMediaForMetal(metal, currentMedia));
  }

  useEffect(() => {
    function handleViewerMessage(event: MessageEvent) {
      const viewerWindow = viewerFrameRef.current?.contentWindow;
      const isViewerMessage =
        event.origin === window.location.origin || (!!viewerWindow && event.source === viewerWindow);

      if (!isViewerMessage || !event.data) {
        return;
      }

      const data = event.data as { metal?: unknown; type?: unknown };

      if (data.type !== "costco:metal-change") {
        return;
      }

      if (data.metal !== "yellow" && data.metal !== "white") {
        return;
      }

      setSelectedMetal(data.metal);
      setSelectedMedia((currentMedia) => getMediaForMetal(data.metal, currentMedia));
    }

    window.addEventListener("message", handleViewerMessage);

    return () => window.removeEventListener("message", handleViewerMessage);
  }, []);

  useEffect(() => {
    if (!isTryOnOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleTryOnClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTryOnOpen]);

  async function handleTryOnClick() {
    if (tryOnStatus === "loading") {
      return;
    }

    setIsTryOnOpen(true);
    setTryOnStatus("loading");
    setTryOnMessage("Loading 3D try-on");

    try {
      const glamar = await ensureGlamarInitialized();

      setTryOnMessage("Applying diamond ring");
      await applyGlamarTryOnSku(glamar);
      setTryOnMessage("Opening camera");
      glamar.open();
      setTryOnStatus("ready");
      setTryOnMessage("3D try-on ready");
    } catch (error) {
      console.error("GlamAR try-on failed", error);
      setTryOnStatus("error");
      setTryOnMessage("3D try-on could not load. Please try again.");
    }
  }

  function handleTryOnClose() {
    window.GlamAR?.close?.();
    setIsTryOnOpen(false);
    setTryOnStatus("idle");
    setTryOnMessage("Preparing 3D try-on");
  }

  return (
    <main className="site-shell">
      <div className="topbar">
        <a href="#">Costco Wholesale</a>
        <a href="#">Membership</a>
        <a href="#">Orders & Returns</a>
        <a href="#">Customer Service</a>
      </div>

      <nav className="main-nav" aria-label="Main navigation">
        <a className="logo-link" href="#" aria-label="Costco Wholesale home">
          <img src="assets/brand/costco-wholesale-logo-wide.png" alt="Costco Wholesale" />
        </a>
        <div className="nav-links">
          <a href="#">New In</a>
          <a href="#">Jewelry</a>
          <a href="#">Collections</a>
          <a href="#">Diamonds</a>
          <a href="#">Gifts</a>
          <a href="#">About Us</a>
        </div>
        <div className="nav-actions" aria-label="Account actions">
          <button type="button" aria-label="Search" title="Search">
            <HeaderIcon type="search" />
          </button>
          <button type="button" aria-label="Account" title="Account">
            <HeaderIcon type="account" />
          </button>
          <button type="button" aria-label="Cart" title="Cart">
            <HeaderIcon type="bag" />
          </button>
        </div>
      </nav>

      <section className="pdp">
        <div className="breadcrumbs" aria-label="Breadcrumb">
          <a href="#">Home</a>
          <span>&gt;</span>
          <a href="#">Jewelry</a>
          <span>&gt;</span>
          <a href="#">Rings</a>
          <span>&gt;</span>
          <span>Diamond Ring</span>
        </div>

        <div className="product-grid">
          <section className="viewer-column" aria-label="Product media">
            <aside className="thumb-rail" aria-label="Product media thumbnails">
              {productImages.map((image, index) => (
                <button
                  className={`thumb${selectedMedia === `image-${index}` ? " is-selected" : ""}`}
                  type="button"
                  key={image.src}
                  aria-label={image.label}
                  aria-pressed={selectedMedia === `image-${index}`}
                  data-media-key={`image-${index}`}
                  onClick={() => setSelectedMedia(`image-${index}`)}
                >
                  <img src={image.src} alt="" />
                </button>
              ))}
              <button
                className={`thumb video-thumb${selectedMedia === "video" ? " is-selected" : ""}`}
                type="button"
                aria-label={productVideo.label}
                aria-pressed={selectedMedia === "video"}
                data-media-key="video"
                onClick={() => setSelectedMedia("video")}
              >
                <video src={productVideo.src} muted playsInline preload="metadata" aria-hidden="true" />
                <span className="play-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M9 6.8v10.4L17 12z" />
                  </svg>
                </span>
              </button>
              <button
                className={`thumb text-thumb view-360-thumb${selectedMedia === "360" ? " is-selected" : ""}`}
                type="button"
                aria-label="360 view"
                aria-pressed={selectedMedia === "360"}
                data-media-key="360"
                onClick={() => setSelectedMedia("360")}
              >
                <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                  <path d="M15.2 15.4A14.2 14.2 0 0 1 38.1 21" />
                  <path d="M37.8 13.8v7.4h-7.4" />
                  <path d="M32.8 32.6A14.2 14.2 0 0 1 9.9 27" />
                  <path d="M10.2 34.2v-7.4h7.4" />
                </svg>
                <span>360</span>
              </button>
            </aside>

            <div className="model-viewer-shell">
              {productImages.map((image, index) => (
                <div
                  className={`media-panel media-panel-image-${index}${
                    selectedMedia === `image-${index}` ? " is-active" : ""
                  }`}
                  key={`media-panel-${image.src}`}
                >
                  <img className="media-display-image" src={image.src} alt={image.label} />
                </div>
              ))}
              <div className={`media-panel media-panel-video${selectedMedia === "video" ? " is-active" : ""}`}>
                <video
                  className="media-display-video"
                  src={productVideo.src}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={productVideo.label}
                />
              </div>
              <div className={`media-panel media-panel-360${selectedMedia === "360" ? " is-active" : ""}`}>
                <iframe
                  className="ijewel-viewer-frame"
                  src="ijewel-viewer/"
                  title="iJewel 3D ring viewer"
                  allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
                  referrerPolicy="strict-origin-when-cross-origin"
                  ref={viewerFrameRef}
                />
              </div>
            </div>
          </section>

          <aside className="purchase-panel">
            <div className="eyebrow-row">
              <span className="member-badge">Bestseller</span>
              <span>Item 1842907</span>
            </div>

            <h1>Round Brilliant 0.50 CTW Diamond 14kt Gold Ring</h1>

            <div className="rating-row" aria-label="Rated 4.8 out of 5">
              <span className="stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <a href="#">4.8 (128 Reviews)</a>
            </div>

            <p className="price">
              <span className="price-currency">$</span>
              649.99
            </p>
            <p className="price-note">Shipping & Handling Included</p>

            <div className="spec-grid">
              {productSpecs.map((spec) => (
                <div key={spec.label}>
                  <SpecIcon type={spec.icon} />
                  <strong>{spec.value}</strong>
                  <span>{spec.label}</span>
                </div>
              ))}
            </div>

            <section className="option-group" aria-label="Metal options">
              <div className="option-heading">
                <span>Metal</span>
                <strong>{selectedMetalLabel}</strong>
              </div>
              <div className="swatch-row">
                {metalOptions.map((metal) => (
                  <button
                    key={metal.name}
                    className={`metal-swatch ${metal.className}${
                      selectedMetal === metal.key ? " is-selected" : ""
                    }`}
                    type="button"
                    aria-label={metal.name}
                    aria-pressed={selectedMetal === metal.key}
                    data-metal-option={metal.key}
                    onClick={() => handleMetalChange(metal.key)}
                    title={metal.name}
                  />
                ))}
              </div>
            </section>

            <section className="purchase-fields" aria-label="Purchase options">
              <label htmlFor="quantity">Quantity</label>
              <input id="quantity" type="number" min="1" defaultValue="1" />
            </section>

            <button
              className="cart-button"
              type="button"
              aria-expanded={isTryOnOpen}
              aria-haspopup="dialog"
              onClick={handleTryOnClick}
            >
              3D TRY-ON
            </button>
            <button className="list-button" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 20.25S4.75 16 4.75 9.7A3.95 3.95 0 0 1 12 7.5a3.95 3.95 0 0 1 7.25 2.2C19.25 16 12 20.25 12 20.25Z" />
              </svg>
              <span>Add to List</span>
            </button>

            <div className="delivery-card">
              <strong>Arrives in 3-5 business days</strong>
              <span>Includes signature delivery, insured packaging, and easy warehouse returns.</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="assurance-band" aria-label="Costco jewelry benefits">
        {benefits.map((benefit) => (
          <div key={benefit.title} className="benefit-card">
            <BenefitIcon type={benefit.icon} />
            <div>
              <strong>{benefit.title}</strong>
              <p>{benefit.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="details-section">
        <input
          className="details-tab-radio"
          type="radio"
          name="details-tab"
          id="details-tab-product"
          defaultChecked
        />
        <input
          className="details-tab-radio"
          type="radio"
          name="details-tab"
          id="details-tab-specifications"
        />
        <input
          className="details-tab-radio"
          type="radio"
          name="details-tab"
          id="details-tab-shipping"
        />
        <nav className="tabs" aria-label="Product details tabs">
          <label htmlFor="details-tab-product">Product Details</label>
          <label htmlFor="details-tab-specifications">Specifications</label>
          <label htmlFor="details-tab-shipping">Shipping &amp; Returns</label>
        </nav>

        <div className="details-panels">
          <div className="details-panel product-details-panel">
            <div className="details-copy">
              <p>
                A timeless round brilliant diamond sits in a polished 14kt gold
                band with a low-profile setting designed for everyday wear. The
                center stone is selected for balanced fire, clarity, and value.
              </p>
              <p>
                Each ring is inspected before shipping and delivered with
                certification documents, protective packaging, and Costco member
                service.
              </p>
              <div className="features-block">
                <h3>Features:</h3>
                <dl>
                  <div>
                    <dt>Metal:</dt>
                    <dd>14kt White Gold ( Rhodium Plated ) or 14kt Yellow Gold</dd>
                  </div>
                  <div>
                    <dt>Diamond Shape:</dt>
                    <dd>Round Brilliant</dd>
                  </div>
                  <div>
                    <dt>Total Diamond Weight:</dt>
                    <dd>0.50 ctw</dd>
                  </div>
                  <div>
                    <dt>Total Number of Diamonds:</dt>
                    <dd>12</dd>
                  </div>
                  <div>
                    <dt>Diamond Clarity:</dt>
                    <dd>Very Slightly Included ( VS2 )</dd>
                  </div>
                  <div>
                    <dt>Diamond Color:</dt>
                    <dd>Near Colorless ( I )</dd>
                  </div>
                  <div>
                    <dt>Ring Size:</dt>
                    <dd>5, 6, 7 &amp; 8 - Sizeable within 1 size ( Costco does not provide this service )</dd>
                  </div>
                </dl>
                <p>All diamonds offered by Costco are natural and untreated.</p>
              </div>
            </div>

            <aside className="certificate-card">
              <span>GIA</span>
              <strong>Certified Diamond</strong>
              <p>0.50 CTW round brilliant, VS2 clarity, I color.</p>
              <a href="#">View Certificate</a>
            </aside>
          </div>

          <div className="details-panel specifications-panel">
            <div className="details-copy">
              <div className="specifications-block">
                <h3>Specifications</h3>
                <dl>
                  {detailSpecifications.map((spec) => (
                    <div key={spec.label}>
                      <dt>{spec.label}</dt>
                      <dd>{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>

          <div className="details-panel shipping-panel">
            <div className="details-copy">
              <div className="shipping-block">
                <h3>Shipping &amp; Returns</h3>
                <p>
                  Air shipping via UPS insured is included in the quoted price.
                  Signature is required. The estimated delivery time will be
                  approximately 2-3 business days from the time of order.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="reviews-section">
        <div className="section-title-row">
          <h2>Customer Reviews</h2>
          <a href="#">Write a Review</a>
        </div>
        <div className="reviews-grid">
          {customerReviews.map((review) => (
            <article className="review-card" key={review.title}>
              <div className="stars" aria-label={review.ratingLabel}>
                {review.rating}
              </div>
              <strong>{review.title}</strong>
              <p>{review.text}</p>
              <span>{review.author} - Verified Buyer</span>
            </article>
          ))}
        </div>
      </section>

      <section className="related-section">
        <div className="section-title-row">
          <h2>You May Also Like</h2>
          <div className="arrow-actions" aria-label="Carousel controls">
            <button type="button" aria-label="Previous">
              <span className="chevron previous" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Next">
              <span className="chevron next" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="related-grid">
          {relatedProducts.map((product) => (
            <article className="product-card" key={product.name}>
              <img src={product.image} alt="" />
              <strong>{product.name}</strong>
              <span>{product.price}</span>
            </article>
          ))}
        </div>
      </section>

      <div
        className={`glamar-tryon-modal${isTryOnOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal={isTryOnOpen}
        aria-hidden={!isTryOnOpen}
        aria-labelledby="glamar-tryon-title"
      >
        <div className="glamar-tryon-card">
          <div className="glamar-tryon-header">
            <div>
              <span>Fynd GlamAR</span>
              <h2 id="glamar-tryon-title">3D Try-On</h2>
            </div>
            <button
              type="button"
              className="glamar-tryon-close"
              aria-label="Close 3D try-on"
              onClick={handleTryOnClose}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />
              </svg>
            </button>
          </div>
          <div className="glamar-tryon-body">
            <div id={GLAMAR_TRYON_CONTAINER_ID} className="glamar-tryon-frame" />
            {tryOnStatus !== "ready" ? (
              <div className={`glamar-tryon-status ${tryOnStatus}`} role="status">
                <span aria-hidden="true" />
                <p>{tryOnMessage}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <footer className="footer">
        <div>
          <img src="assets/brand/costco-wholesale-logo-wide.png" alt="Costco Wholesale" />
          <p>Fine jewellery value with Costco member service.</p>
        </div>
        <nav aria-label="Footer links">
          <a href="#">Customer Service</a>
          <a href="#">Returns</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Accessibility</a>
        </nav>
      </footer>
    </main>
  );
}
