import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const requiredOutputPaths = [
  "index.html",
  "ijewel-viewer/index.html",
  "assets/brand/costco-wholesale-logo-wide.png",
  "assets/brand/fynd-glamar-loader.png",
  "assets/icons/configurator-gear.png",
  "assets/images/pdp/costco-diamond-band-white-01.png",
];

export function makePagesHtmlPortable(html) {
  return html
    .replace(/(?<![:/])\/assets\//g, "./assets/")
    .replaceAll('"assets/', '"./assets/')
    .replaceAll("'assets/", "'./assets/")
    .replaceAll("`assets/", "`./assets/");
}

async function render(worker, pathname) {
  const response = await worker.fetch(
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

  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}`);
  }

  return response.text();
}

export async function buildGitHubPages(outDir = "/private/tmp/costco-pages-build") {
  const root = process.cwd();
  const out = path.resolve(outDir);

  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(path.join(root, "dist/client"), out, { recursive: true });

  const workerUrl = new URL(
    `./dist/server/index.js?static=${Date.now()}`,
    pathToFileURL(`${root}/`),
  );
  const { default: worker } = await import(workerUrl.href);

  const indexHtml = makePagesHtmlPortable(await render(worker, "/"));
  await writeFile(path.join(out, "index.html"), indexHtml);
  await writeFile(path.join(out, "404.html"), indexHtml);

  const viewerHtml = await render(worker, "/ijewel-viewer");
  await mkdir(path.join(out, "ijewel-viewer"), { recursive: true });
  await writeFile(path.join(out, "ijewel-viewer/index.html"), viewerHtml);
  await writeFile(path.join(out, ".nojekyll"), "");

  for (const requiredPath of requiredOutputPaths) {
    const absolutePath = path.join(out, requiredPath);

    if (!existsSync(absolutePath)) {
      throw new Error(`Missing ${absolutePath}`);
    }
  }

  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildGitHubPages(process.argv[2])
    .then((out) => console.log(out))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
