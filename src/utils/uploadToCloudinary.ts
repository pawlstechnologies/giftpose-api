import cloudinary from "../config/cloudinary";


export const uploadToCloudinary = async (filePath: string) => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'items_images',
  });

  return result.secure_url; // ✅ PUBLIC URL
};

