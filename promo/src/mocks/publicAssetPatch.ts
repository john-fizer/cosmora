/**
 * The reused app components request static assets the Next.js way —
 * root-relative paths like "/textures/..." or "/glyphs/..." (served from
 * the app's public/ folder at the root under real Next.js). Remotion's own
 * bundler always serves its configured public dir under a "/public/..."
 * prefix (hardcoded in @remotion/bundler, no config escape hatch), so those
 * same root-relative requests 404 here. This rewrites them at the two load
 * paths these components actually use: fetch() and <img>/Image().src
 * (three.js's TextureLoader sets Image.src under the hood).
 */
const PUBLIC_PREFIXES = ["/textures/", "/glyphs/", "/images/", "/videos/", "/geo/"];

function rewrite(url: string): string {
  if (PUBLIC_PREFIXES.some((p) => url.startsWith(p))) return `/public${url}`;
  return url;
}

export function installPublicAssetPatch() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && PUBLIC_PREFIXES.some((p) => input.startsWith(p))) {
      return originalFetch(rewrite(input), init);
    }
    return originalFetch(input, init);
  };

  const patchSrc = (proto: { src: string }) => {
    const descriptor = Object.getOwnPropertyDescriptor(proto, "src")!;
    Object.defineProperty(proto, "src", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() {
        return descriptor.get!.call(this);
      },
      set(value: string) {
        descriptor.set!.call(this, typeof value === "string" ? rewrite(value) : value);
      },
    });
  };

  patchSrc(HTMLImageElement.prototype);
  // video/audio (e.g. GlassHero's background video) share this on HTMLMediaElement.
  patchSrc(HTMLMediaElement.prototype);

  // React sets some attributes (e.g. <video poster="...">, and src on some
  // paths) via setAttribute rather than the JS property setter, which
  // bypasses the patches above entirely.
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name: string, value: string) {
    if ((name === "src" || name === "poster") && typeof value === "string") {
      return originalSetAttribute.call(this, name, rewrite(value));
    }
    return originalSetAttribute.call(this, name, value);
  };
}
