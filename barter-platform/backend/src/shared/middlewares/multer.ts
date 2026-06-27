import multer from "multer";
import path from "path";
import fs from "fs";

/**
 * createUploader
 * 
 * This is a reusable helper function (factory) that configures and returns an instance
 * of Multer upload middleware. It is designed to save files to the local disk and
 * enforce validations like file type (images only) and maximum file size.
 * 
 * How to use it in Express routes:
 *   const avatarUploader = createUploader('avatars', 'avatar');
 *   router.put('/avatar', avatarUploader.single('avatar'), controllerFunction);
 * 
 * @param folderName Subdirectory under src/static where files will be stored (e.g., 'avatars', 'portfolio', 'campaigns')
 * @param filePrefix Text prefix used to generate unique filenames (e.g., 'avatar', 'portfolio', 'campaign')
 * @param maxFileSize Maximum allowed file size in bytes. Defaults to 5MB (5 * 1024 * 1024 bytes)
 * @returns A configured Multer middleware object
 */
export const createUploader = (
  folderName: "avatars" | "portfolio" | "campaigns",
  filePrefix: string,
  maxFileSize: number = 5 * 1024 * 1024, // 5MB in bytes
  allowedTypes: ("image" | "video")[] = ["image"]
) => {
  // 1. DETERMINE UPLOAD PATH
  // __dirname is the absolute path to this middleware folder.
  // We navigate two levels up (../../) to get to 'src', and enter the 'static' directory.
  // Finally, we enter the specific folder (e.g., 'avatars').
  const uploadDir = path.join(__dirname, "../../static", folderName);

  // 2. CREATE FOLDER IF IT DOES NOT EXIST
  // fs.existsSync checks if the path exists on the disk.
  // If it doesn't exist, fs.mkdirSync creates it recursively (creating parent folders if needed).
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 3. STORAGE CONFIGURATION
  // Multer's diskStorage tells Multer exactly where to save files and what to name them.
  const storage = multer.diskStorage({
    // 'destination' specifies the folder where files should be written.
    destination: (req, file, cb) => {
      cb(null, uploadDir); // Passing null for error (first parameter) and the path
    },
    // 'filename' defines how the uploaded file should be named on disk.
    filename: (req, file, cb) => {
      // path.extname extracts the extension from the original file (e.g. '.jpg', '.png')
      const ext = path.extname(file.originalname).toLowerCase();
      // Date.now() returns the number of milliseconds since 1970, which serves as a unique suffix.
      const uniqueSuffix = Date.now();
      // Generate a unique filename: prefix-timestamp.extension (e.g. avatar-1712345678901.jpg)
      cb(null, `${filePrefix}-${uniqueSuffix}${ext}`);
    },
  });

  // 4. FILE TYPE FILTER
  // This filter function decides whether to accept or reject an incoming file.
  const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check if the file matches any of the allowed MIME types
    const isImageAllowed = allowedTypes.includes("image") && file.mimetype.startsWith("image/");
    const isVideoAllowed = allowedTypes.includes("video") && file.mimetype.startsWith("video/");

    if (isImageAllowed || isVideoAllowed) {
      cb(null, true); // true means accept the file
    } else {
      // false means reject the file. We pass an error message to let the client know why.
      const allowedString = allowedTypes.join(" or ");
      cb(new Error(`Only ${allowedString} files are allowed!`) as any, false);
    }
  };

  // 5. CONFIGURE AND RETURN MULTER MIDDLEWARE
  // We feed our storage settings, file filter, and size limits into Multer.
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize, // Limit the maximum file size (in bytes)
    },
  });
};

