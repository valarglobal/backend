import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request } from 'express';
import { cloudinary } from './cloudinary.config';
import {
  REPORT_SCAM_CLOUDINARY_FOLDER_NAME,
  USER_CLOUDINARY_FOLDER_NAME,
} from 'src/constants';

// Configure Cloudinary storage
const cloudinaryStorage = (folder: string) =>
  new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      public_id: (req: Request, file: Express.Multer.File) => {
        return `${req['user'].fullname}_${Date.now()}_${file.originalname.split('.')[0]}`;
      },
      folder: folder, // Folder in Cloudinary
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // Allowed file formats
      transformation: [
        { width: 500, height: 500, crop: 'limit', quality: 'auto' },
      ], // Optional transformations
    } as CloudinaryStorage['params'],
  });

// export const multerOptions: MulterOptions = {
//   storage: cloudinaryStorage,
// };

export const multerOptions = (
  type: 'profile' | 'report-scam',
): MulterOptions => {
  let folder: string;
  if (type === 'profile') {
    folder = USER_CLOUDINARY_FOLDER_NAME;
  } else if (type === 'report-scam') {
    folder = REPORT_SCAM_CLOUDINARY_FOLDER_NAME;
  }

  return {
    storage: cloudinaryStorage(folder),
  };
};
