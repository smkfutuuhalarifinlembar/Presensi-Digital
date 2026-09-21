import sharp from "sharp";

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "webp" | "png";
}

export const DEFAULT_RESIZE_OPTIONS: Required<ResizeOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 80,
  format: "jpeg",
};

export async function processImage(
  buffer: Buffer,
  options: ResizeOptions = {}
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  const opts = { ...DEFAULT_RESIZE_OPTIONS, ...options };

  let pipeline = sharp(buffer).rotate();

  pipeline = pipeline.resize({
    width: opts.maxWidth,
    height: opts.maxHeight,
    fit: "inside",
    withoutEnlargement: true,
  });

  switch (opts.format) {
    case "webp":
      pipeline = pipeline.webp({ quality: opts.quality });
      break;
    case "png":
      pipeline = pipeline.png({ quality: opts.quality, compressionLevel: 9 });
      break;
    default:
      pipeline = pipeline.jpeg({ quality: opts.quality, mozjpeg: true });
  }

  const processedBuffer = await pipeline.toBuffer();
  const mimeType = `image/${opts.format === "jpeg" ? "jpeg" : opts.format}`;
  const extension = opts.format === "jpeg" ? "jpg" : opts.format;

  return { buffer: processedBuffer, mimeType, extension };
}

export async function processImageIfNeeded(
  buffer: Buffer,
  mimeType: string,
  options: ResizeOptions = {}
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  if (!mimeType.startsWith("image/")) {
    const ext = mimeType.split("/")[1] || "bin";
    return { buffer, mimeType, extension: ext };
  }

  const metadata = await sharp(buffer).metadata();
  const needsResize =
    metadata.width && metadata.width > (options.maxWidth || DEFAULT_RESIZE_OPTIONS.maxWidth) ||
    metadata.height && metadata.height > (options.maxHeight || DEFAULT_RESIZE_OPTIONS.maxHeight);

  if (!needsResize && (options.quality || DEFAULT_RESIZE_OPTIONS.quality) >= 90) {
    const ext = mimeType.split("/")[1] || "jpg";
    return { buffer, mimeType, extension: ext === "jpeg" ? "jpg" : ext };
  }

  return processImage(buffer, options);
}