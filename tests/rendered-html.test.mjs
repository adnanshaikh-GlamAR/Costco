import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const pdpImagePaths = [
  "assets/images/pdp/costco-diamond-band-hero.png",
  "assets/images/pdp/costco-diamond-band-front.png",
  "assets/images/pdp/costco-diamond-band-hand.png",
  "assets/images/pdp/costco-diamond-band-closeup.png",
  "assets/images/pdp/costco-diamond-band-side.jpeg",
  "assets/images/pdp/costco-diamond-band-measurements.jpeg",
];
const whiteGoldImagePaths = [
  "assets/images/pdp/costco-diamond-band-white-01.png",
  "assets/images/pdp/costco-diamond-band-white-02.png",
  "assets/images/pdp/costco-diamond-band-white-03.png",
  "assets/images/pdp/costco-diamond-band-white-04.png",
  "assets/images/pdp/costco-diamond-band-white-05.png",
];
const pdpVideoPath = "assets/images/pdp/costco-diamond-band-video.mp4";
const configuratorIconPath = "assets/icons/configurator-gear.png";
const loaderLogoPath = "assets/brand/fynd-glamar-loader.png";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Costco PDP with the iJewel viewer iframe", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Costco Jewelry PDP<\/title>/i);
  assert.match(html, /Costco Wholesale/);
  assert.match(html, /Round Brilliant 0\.50 CTW Diamond 14kt Gold Ring/);
  assert.match(html, /id="details-tab-product"/);
  assert.match(html, /for="details-tab-specifications"/);
  assert.match(html, /details-panel product-details-panel/);
  assert.match(html, /details-panel specifications-panel/);
  assert.match(html, /details-panel shipping-panel/);
  assert.match(html, /data-media-key="image-0"/);
  assert.match(html, /data-media-key="video"/);
  assert.match(html, /data-media-key="360"/);
  assert.match(html, /data-metal-option="white"/);
  assert.match(html, /media-panel media-panel-image-0 is-active/);
  assert.match(html, /media-panel media-panel-video/);
  assert.match(html, /media-panel media-panel-360/);
  assert.match(html, />3D TRY-ON</);
  assert.match(html, />ADD TO CART</);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.ok(
    html.indexOf("Shipping &amp; Handling Included") <
      html.indexOf(">3D TRY-ON<"),
  );
  assert.ok(
    html.indexOf(">ADD TO CART<") <
      html.indexOf('class="spec-grid"'),
  );
  assert.ok(
    html.indexOf('class="spec-grid"') <
      html.indexOf('aria-label="Metal options"'),
  );
  assert.ok(
    html.indexOf('aria-label="Metal options"') <
      html.indexOf('aria-label="Purchase options"'),
  );
  assert.match(html, /glamar-tryon-sdk-container/);
  assert.doesNotMatch(html, />Add to List</);
  assert.doesNotMatch(html, /glamar-tryon-status/);
  assert.doesNotMatch(html, /Loading 3D try-on/);
  assert.doesNotMatch(html, /glamar-tryon-header/);
  assert.doesNotMatch(html, /glamar-tryon-title/);
  assert.doesNotMatch(html, /Fynd GlamAR/);
  assert.doesNotMatch(html, /media-panel media-panel-360 is-active/);
  for (const imagePath of pdpImagePaths) {
    assert.match(html, new RegExp(imagePath.replace(/\./g, "\\.")));
  }
  assert.match(html, new RegExp(pdpVideoPath.replace(/\./g, "\\.")));
  assert.ok(
    html.indexOf("assets/images/pdp/costco-diamond-band-measurements.jpeg") <
      html.indexOf(pdpVideoPath),
  );
  assert.ok(
    html.indexOf(pdpVideoPath) <
      html.indexOf('aria-label="360 view"'),
  );
  assert.match(html, /video-thumb/);
  assert.match(html, /view-360-thumb/);
  assert.doesNotMatch(html, /Gem Color/);
  assert.doesNotMatch(html, /gem-swatch/);
  assert.match(html, /Birthstone Month/);
  assert.match(html, /April Birthstone/);
  assert.match(html, /Warehouse Pick-up/);
  assert.match(html, /Air shipping via UPS insured is included in the quoted price/);
  assert.match(html, /approximately 2-3 business days from the time of order/);
  assert.match(html, /Great everyday band/);
  assert.match(html, /Excellent value/);
  assert.match(html, /Arrived ready to gift/);
  assert.match(html, /src="ijewel-viewer\/"/);
  assert.match(html, /title="iJewel 3D ring viewer"/);
  assert.doesNotMatch(html, /custom interactive 3D model viewer/i);
  assert.doesNotMatch(html, /Warranty/);
  assert.doesNotMatch(html, /panel-rule/);

  await Promise.all(
    [...pdpImagePaths, ...whiteGoldImagePaths, pdpVideoPath, configuratorIconPath, loaderLogoPath].map((mediaPath) =>
      access(new URL(`../public/${mediaPath}`, import.meta.url)),
    ),
  );
});

test("uses iJewel runtime assets instead of the removed custom model viewer", async () => {
  const [viewerRoute, page, layout, globals, packageJson] = await Promise.all([
    readFile(new URL("../app/ijewel-viewer/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(viewerRoute, /https:\/\/ijewel\.design\/profile\/social_1\/9724b59/);
  assert.match(viewerRoute, /window\.ijewelViewer/);
  assert.match(viewerRoute, /Fynd GlamAR/);
  assert.match(viewerRoute, /glamar-loader__logo/);
  assert.match(viewerRoute, /fynd-glamar-loader\.png/);
  assert.match(viewerRoute, /showLoadingScreenLogo:\s*false/);
  assert.match(viewerRoute, /showConfigurator:\s*true/);
  assert.doesNotMatch(viewerRoute, /viewer-360-indicator/);
  assert.match(viewerRoute, /costco-configurator-logo/);
  assert.match(viewerRoute, /configurator-gear\.png/);
  assert.match(viewerRoute, /img\.h-4\.h-full/);
  assert.match(viewerRoute, /custom-configurator-native-icon/);
  assert.doesNotMatch(viewerRoute, /costco-wholesale-logo-wide\.png/);
  assert.match(viewerRoute, /data-costco-configurator/);
  assert.match(viewerRoute, /replaceChildren\(buildConfiguratorLogo\(\)\)/);
  assert.match(viewerRoute, /didAutoOpenConfigurator/);
  assert.match(viewerRoute, /openConfiguratorByDefault/);
  assert.match(viewerRoute, /button\.click\(\)/);
  assert.match(viewerRoute, /syncConfiguratorUi/);
  assert.match(viewerRoute, /postMetalSelection/);
  assert.match(viewerRoute, /postMessage\(\{ type: "costco:metal-change", metal \}, "\*"\)/);
  assert.match(viewerRoute, /bindMetalOptionImages/);
  assert.match(viewerRoute, /data-costco-metal-option/);
  assert.match(viewerRoute, /pointerup/);
  assert.match(viewerRoute, /composedPath/);
  assert.match(viewerRoute, /shadowRoot/);
  assert.match(viewerRoute, /configuratorObserverRoot/);
  assert.match(viewerRoute, /costco:metal-change/);
  assert.match(viewerRoute, /silver/);
  assert.match(viewerRoute, /yellowgold/);
  assert.match(viewerRoute, /bundle\.nowebgi\.iife\.js/);
  assert.match(viewerRoute, /bundle-0\.22\.0\.js/);
  assert.doesNotMatch(viewerRoute, /Loading iJewel 3D viewer/);
  assert.doesNotMatch(viewerRoute, /glamar-loader__mark/);
  assert.match(page, /src="ijewel-viewer\/"/);
  assert.match(page, /https:\/\/cdn\.glamar\.io\/sdk\/wrapper/);
  assert.match(page, /GLAMAR_TRYON_CONTAINER_ID = "glamar-tryon-sdk-container"/);
  assert.match(page, /GLAMAR_TRYON_SKU = "00101001000111"/);
  assert.match(page, /platform: "web"/);
  assert.match(page, /category: "jewellery"/);
  assert.match(page, /openLiveOnInit: true/);
  assert.match(page, /glamar\.init\(GLAMAR_TRYON_CONTAINER_ID, GLAMAR_ACCESS_KEY/);
  assert.match(page, /glamar\.applyBySku\(GLAMAR_TRYON_SKU/);
  assert.match(page, /glamar\.open\(\)/);
  assert.match(page, /SDK_QUIT_CONFIRM_LABEL = "yes, close"/);
  assert.match(page, /bindGlamarCloseSync/);
  assert.match(page, /addEventListener\("closed", glamarCloseHandler\)/);
  assert.match(page, /isGlamarEvent\(event, "closed"\)/);
  assert.match(page, /handleSdkQuitConfirmClick/);
  assert.match(page, /window\.GlamAR\?\.close\?\.\(\)/);
  assert.doesNotMatch(page, /glamar\.open\("modelViewer"/);
  assert.doesNotMatch(page, /modelViewer/);
  assert.match(page, /name="details-tab"/);
  assert.match(page, /useState<MetalKey>\("yellow"\)/);
  assert.match(page, /useState<MediaKey>\("image-0"\)/);
  assert.match(page, /viewerFrameRef/);
  assert.match(page, /handleViewerMessage/);
  assert.match(page, /costco:metal-change/);
  assert.match(page, /event\.source === viewerWindow/);
  assert.match(page, /getMediaForMetal\(data\.metal, currentMedia\)/);
  assert.match(page, /const whiteGoldImages = \[/);
  for (const imagePath of whiteGoldImagePaths) {
    assert.match(page, new RegExp(imagePath.replace(/\./g, "\\.")));
  }
  assert.match(page, /Emerald Cut Diamond 14kt Ring[\s\S]*?costco-diamond-band-closeup\.png/);
  assert.match(globals, /#details-tab-specifications:checked ~ \.details-panels \.specifications-panel/);
  assert.match(globals, /\.thumb\.is-selected/);
  assert.match(globals, /\.media-panel\.is-active/);
  assert.match(globals, /\.details-panel\s*{\s*display: none;/);
  assert.match(globals, /\.media-panel\s*{\s*display: none;/);
  assert.match(globals, /\.product-card img\s*{[\s\S]*?object-fit: cover;/);
  assert.doesNotMatch(globals, /\.product-card img\s*{[\s\S]*?padding: 8px;/);
  assert.match(layout, /embedded iJewel 3D ring viewer/);
  assert.doesNotMatch(packageJson, /"three"/);

  await assert.rejects(access(new URL("../app/ModelViewer.tsx", import.meta.url)));
  await assert.rejects(
    access(new URL("public/assets/models/costco-3d-ring.glb", projectRoot)),
  );
});

test("prepares GitHub Pages HTML with valid relative module imports", async () => {
  const { makePagesHtmlPortable } = await import("../scripts/build-gh-pages.mjs");
  const html = [
    '<link rel="stylesheet" href="/assets/index.css">',
    '<script>import("assets/index.js")</script>',
    "<script>import('assets/page.js')</script>",
    "<script>import(`assets/chunk.js`)</script>",
    '<img src="assets/brand/logo.png" alt="">',
    '<script>const cdn = "https://assets.ijewel.design/v9/materialLibPro.json"</script>',
  ].join("");
  const portableHtml = makePagesHtmlPortable(html);

  assert.match(portableHtml, /href="\.\/assets\/index\.css"/);
  assert.match(portableHtml, /import\("\.\/assets\/index\.js"\)/);
  assert.match(portableHtml, /import\('\.\/assets\/page\.js'\)/);
  assert.match(portableHtml, /import\(`\.\/assets\/chunk\.js`\)/);
  assert.match(portableHtml, /src="\.\/assets\/brand\/logo\.png"/);
  assert.match(portableHtml, /https:\/\/assets\.ijewel\.design\/v9\/materialLibPro\.json/);
  assert.doesNotMatch(portableHtml, /import\(["'`]assets\//);
});

test("configures Vercel to serve the generated static page output", async () => {
  const vercelConfig = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  );

  assert.equal(vercelConfig.buildCommand, "npm run build:pages -- dist/pages");
  assert.equal(vercelConfig.outputDirectory, "dist/pages");
});
