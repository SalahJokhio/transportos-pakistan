import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Simple media upload for incident/expense photos + short videos. Files land in
 * ./uploads and are served statically at /uploads/<file> (see main.ts). The
 * returned url goes into a TripReport's mediaUrls.
 */
@ApiTags('Uploads')
@Controller('uploads')
export class UploadController {
  @Post()
  @ApiOperation({ summary: 'Upload a photo/video, returns its URL' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = './uploads';
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname) || '.jpg'}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB — photos + short clips
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded (field name must be "file")');
    return { url: `/uploads/${file.filename}`, name: file.originalname, size: file.size };
  }
}
