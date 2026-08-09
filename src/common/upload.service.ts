import { Injectable, BadRequestException } from '@nestjs/common';
import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private uploadDir = './uploads';

  constructor() {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  uploadFile(file: Express.Multer.File, folder: string = 'general'): string {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, GIF, and WebP images are allowed');
    }

    // Create folder if doesn't exist
    const folderPath = path.join(this.uploadDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${randomStr}-${file.originalname}`;
    const filepath = path.join(folderPath, filename);

    // Save file
    fs.writeFileSync(filepath, file.buffer);

    // Return relative URL path
    return `/uploads/${folder}/${filename}`;
  }

  deleteFile(filepath: string): boolean {
    try {
      const fullPath = path.join('.', filepath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  getFileStream(filepath: string) {
    const fullPath = path.join('.', filepath);
    if (!fs.existsSync(fullPath)) {
      throw new BadRequestException('File not found');
    }
    return fs.createReadStream(fullPath);
  }
}
