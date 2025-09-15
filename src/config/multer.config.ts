import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request } from 'express';
import { cloudinary } from './cloudinary.config';
import {
  REPORT_SCAM_CLOUDINARY_FOLDER_NAME,
  USER_CLOUDINARY_FOLDER_NAME,
} from 'src/constants';

const buildCloudinaryStorage = (folder: string) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      public_id: (req: Request, file: Express.Multer.File) =>
        `${req['user']?.fullname ?? 'user'}_${Date.now()}_${file.originalname.split('.')[0]}`,
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 500, height: 500, crop: 'limit', quality: 'auto' },
      ],
    } as CloudinaryStorage['params'],
  });

export const multerOptions = (
  type: 'profile' | 'report-scam',
): MulterOptions => {
  const folder =
    type === 'profile'
      ? USER_CLOUDINARY_FOLDER_NAME
      : REPORT_SCAM_CLOUDINARY_FOLDER_NAME;

  return { storage: buildCloudinaryStorage(folder) };
};
