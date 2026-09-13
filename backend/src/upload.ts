import multer from "multer";

// Logos are stored as base64 data URIs directly in the database (School.logoUrl)
// rather than on local disk — Render's filesystem is ephemeral between deploys,
// so nothing written to disk here would survive a redeploy or a second instance.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      cb(new Error("Only JPG, PNG, or WEBP images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export function fileToDataUri(file: Express.Multer.File): string {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}
