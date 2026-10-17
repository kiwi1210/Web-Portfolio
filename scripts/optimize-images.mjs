import { access, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const IMAGE_DIRECTORY = path.resolve("public/img");
const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 82;
const CONVERTIBLE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"]);
const REFERENCE_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs", ".ts", ".tsx", ".jsx"]);
const IGNORED_DIRECTORIES = new Set([".git", "dist", "node_modules"]);

async function walk(directory, shouldInclude, results = []) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        await walk(entryPath, shouldInclude, results);
      }
    } else if (entry.isFile() && shouldInclude(entryPath)) {
      results.push(entryPath);
    }
  }

  return results;
}

function destinationFor(sourcePath) {
  const parsed = path.parse(sourcePath);
  return path.join(parsed.dir, `${parsed.name}.jpg`);
}

function normalizedPath(filePath) {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

async function assertNoOutputCollisions(images) {
  const outputs = new Map();

  for (const source of images) {
    const destination = normalizedPath(destinationFor(source));
    const previousSource = outputs.get(destination);

    if (previousSource && normalizedPath(previousSource) !== normalizedPath(source)) {
      throw new Error(
        `Both ${path.relative(process.cwd(), previousSource)} and ${path.relative(process.cwd(), source)} would produce the same JPG. Rename one of them first.`,
      );
    }

    outputs.set(destination, source);
  }
}

async function optimizeImage(sourcePath) {
  const destinationPath = destinationFor(sourcePath);
  const temporaryPath = `${destinationPath}.${process.pid}.tmp`;

  try {
    const image = sharp(sourcePath, { failOn: "warning" }).rotate();
    const metadata = await image.metadata();
    const needsResize =
      (metadata.width ?? 0) > MAX_DIMENSION || (metadata.height ?? 0) > MAX_DIMENSION;

    await image
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(temporaryPath);

    // Remove the source only after Sharp has successfully written the replacement.
    if (normalizedPath(sourcePath) === normalizedPath(destinationPath)) {
      await rm(sourcePath);
    }
    await rename(temporaryPath, destinationPath);

    if (normalizedPath(sourcePath) !== normalizedPath(destinationPath)) {
      await rm(sourcePath);
    }

    return {
      sourcePath,
      destinationPath,
      resized: needsResize,
    };
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

function referenceVariants(filePath) {
  const relativePath = path.relative(IMAGE_DIRECTORY, filePath).replaceAll(path.sep, "/");
  return [
    `./img/${relativePath}`,
    `/img/${relativePath}`,
    `public/img/${relativePath}`,
  ];
}

async function updateReferences(conversions) {
  const projectFiles = await walk(
    process.cwd(),
    (filePath) => REFERENCE_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
  );
  const updatedFiles = [];

  for (const filePath of projectFiles) {
    let contents = await readFile(filePath, "utf8");
    const originalContents = contents;

    for (const conversion of conversions) {
      const oldReferences = referenceVariants(conversion.sourcePath);
      const newReferences = referenceVariants(conversion.destinationPath);
      oldReferences.forEach((oldReference, index) => {
        contents = contents.replaceAll(oldReference, newReferences[index]);
      });
    }

    if (contents !== originalContents) {
      await writeFile(filePath, contents, "utf8");
      updatedFiles.push(filePath);
    }
  }

  return updatedFiles;
}

async function main() {
  await access(IMAGE_DIRECTORY);
  const images = await walk(
    IMAGE_DIRECTORY,
    (filePath) => CONVERTIBLE_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
  );

  if (images.length === 0) {
    console.log("No convertible images found in public/img.");
    return;
  }

  await assertNoOutputCollisions(images);

  const conversions = [];
  const updatedFiles = new Set();
  for (const sourcePath of images) {
    const result = await optimizeImage(sourcePath);
    conversions.push(result);
    const filesUpdatedForImage = await updateReferences([result]);
    filesUpdatedForImage.forEach((filePath) => updatedFiles.add(filePath));
    const relativeSource = path.relative(process.cwd(), sourcePath);
    const resizeLabel = result.resized ? ` (resized to fit ${MAX_DIMENSION}px)` : "";
    console.log(`Converted ${relativeSource}${resizeLabel}`);
  }

  const resizedCount = conversions.filter(({ resized }) => resized).length;

  console.log(
    `Done: ${conversions.length} image(s) converted to JPG, ${resizedCount} resized, and ${updatedFiles.size} source file(s) updated.`,
  );
  console.log("Animated GIFs are intentionally left unchanged.");
}

main().catch((error) => {
  console.error(`Image optimization failed: ${error.message}`);
  process.exitCode = 1;
});
