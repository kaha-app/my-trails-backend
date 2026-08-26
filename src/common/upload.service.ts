import { Injectable, BadRequestException } from '@nestjs/common';
import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private uploadDir = 'uploads';

  constructor() {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    
    // Pre-create common folders
    const commonFolders = ['avatars', 'gpx', 'hike-photos', 'trail-covers', 'trail-gallery', 'images'];
    for (const folder of commonFolders) {
      const folderPath = path.join(this.uploadDir, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`Created folder: ${folderPath}`);
      }
    }
  }

  private ensureFolderExists(folderPath: string): void {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`Created folder: ${folderPath}`);
    }
  }

  uploadFile(file: Express.Multer.File, folder: string = 'general'): string {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (10MB max for all files)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // Validate file type (images)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, GIF, and WebP images are allowed');
    }

    // Create folder path
    const folderPath = path.join(this.uploadDir, folder);
    this.ensureFolderExists(folderPath);

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${randomStr}${ext}`;
    const filepath = path.join(folderPath, filename);

    // Write file to disk
    fs.writeFileSync(filepath, file.buffer);

    console.log(`✅ File saved to: ${filepath}`);

    // Return relative URL path
    return `/uploads/${folder}/${filename}`;
  }

  uploadGpxFile(file: Express.Multer.File): string {
    if (!file) {
      throw new BadRequestException('No GPX file provided');
    }

    // Validate file size (10MB max for GPX)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.gpx') {
      throw new BadRequestException('Only .gpx files are allowed');
    }

    // Accept common GPX MIME types
    const allowedMimes = ['application/gpx+xml', 'application/xml', 'text/xml', 'application/octet-stream'];
    if (!allowedMimes.includes(file.mimetype)) {
      console.warn(`⚠️ Unusual MIME type for GPX: ${file.mimetype}, but file extension is .gpx - accepting anyway`);
    }

    // Create folder path
    const folderPath = path.join(this.uploadDir, 'gpx');
    this.ensureFolderExists(folderPath);

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${randomStr}${ext}`;
    const filepath = path.join(folderPath, filename);

    // Write file to disk
    fs.writeFileSync(filepath, file.buffer);

    console.log(`✅ GPX file saved to: ${filepath}`);

    // Return relative URL path
    return `/uploads/gpx/${filename}`;
  }

  uploadCoverPhoto(file: Express.Multer.File): string {
    if (!file) {
      throw new BadRequestException('No cover photo provided');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WEBP images are allowed');
    }

    // Create folder path
    const folderPath = path.join(this.uploadDir, 'trail-covers');
    this.ensureFolderExists(folderPath);

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${randomStr}${ext}`;
    const filepath = path.join(folderPath, filename);

    // Write file to disk
    fs.writeFileSync(filepath, file.buffer);

    console.log(`✅ Cover photo saved to: ${filepath}`);

    return `/uploads/trail-covers/${filename}`;
  }

  uploadHikePhoto(file: Express.Multer.File): string {
    if (!file) {
      throw new BadRequestException('No photo provided');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WEBP images are allowed');
    }

    // Create folder path
    const folderPath = path.join(this.uploadDir, 'hike-photos');
    this.ensureFolderExists(folderPath);

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${randomStr}${ext}`;
    const filepath = path.join(folderPath, filename);

    // Write file to disk
    fs.writeFileSync(filepath, file.buffer);

    console.log(`✅ Hike photo saved to: ${filepath}`);

    return `/uploads/hike-photos/${filename}`;
  }

  deleteFile(filepath: string): boolean {
    try {
      const fullPath = path.join(filepath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`🗑️ File deleted: ${fullPath}`);
        return true;
      }
      console.log(`⚠️ File not found: ${fullPath}`);
      return false;
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      return false;
    }
  }

  getFileStream(filepath: string) {
    const fullPath = path.join(filepath);
    if (!fs.existsSync(fullPath)) {
      throw new BadRequestException('File not found');
    }
    return fs.createReadStream(fullPath);
  }
}
