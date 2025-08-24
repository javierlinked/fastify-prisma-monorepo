import { Readable } from 'stream';
import { S3Config, S3Service, S3UploadResult } from './s3Service';

export interface UploadOptions {
  s3Config: S3Config;
  allowedMimeTypes: string[];
  allowedFileExtensions?: string[];
}

export interface UploadResult {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  s3Key?: string;
  s3Url?: string;
  s3ETag?: string;
}

export class FileUploadService {
  private options: UploadOptions;
  private s3Service: S3Service;

  constructor(options: UploadOptions) {
    this.options = options;
    this.s3Service = new S3Service(options.s3Config);

    this.options.allowedFileExtensions = this.options.allowedFileExtensions || [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
    ];
  }

  async uploadFile(data: any, filename: string): Promise<UploadResult> {
    const fileBuffer = await this.streamToBuffer(data.file);

    await this.validateFile(data, fileBuffer);

    const sanitizedFilename = this.sanitizeFilename(filename);

    const timestamp = Date.now();
    const extension = this.getFileExtension(data.filename);
    const uniqueFilename = `${timestamp}-${sanitizedFilename}${extension}`;

    const s3Key = `files/${uniqueFilename}`;

    try {
      const s3Result: S3UploadResult = await this.s3Service.uploadFile(
        s3Key,
        fileBuffer,
        data.mimetype,
        {
          originalName: data.filename,
          uploadedBy: sanitizedFilename,
          uploadedAt: new Date().toISOString(),
        }
      );

      return {
        filename: uniqueFilename,
        originalName: data.filename,
        path: s3Result.url,
        size: fileBuffer.length,
        mimeType: data.mimetype,
        s3Key: s3Result.key,
        s3Url: s3Result.url,
        s3ETag: s3Result.etag,
      };
    } catch (error: any) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Enhanced file validation with security checks
   */
  private async validateFile(data: any, fileBuffer: Buffer): Promise<void> {
    if (fileBuffer.length === 0) {
      throw new Error('File is empty');
    }

    if (!this.options.allowedMimeTypes.includes(data.mimetype)) {
      throw new Error(`File type ${data.mimetype} is not allowed`);
    }

    const extension = this.getFileExtension(data.filename).toLowerCase();
    if (
      this.options.allowedFileExtensions &&
      !this.options.allowedFileExtensions.includes(extension)
    ) {
      throw new Error(`File extension ${extension} is not allowed`);
    }

    if (!this.isValidFilename(data.filename)) {
      throw new Error('Invalid filename');
    }
  }

  /**
   * Check if filename is valid
   */
  private isValidFilename(filename: string): boolean {
    return filename.length > 0 && filename.length <= 255 && !filename.includes('/');
  }

  /**
   * Sanitize filename to prevent security issues
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^\w\-_.]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  generateFileUrl(filename: string, baseUrl?: string): string {
    if (filename.startsWith('http')) {
      return filename;
    }
    const s3Key = filename.includes('/') ? filename : `files/${filename}`;
    return this.s3Service.generatePublicUrl(s3Key);
  }

  /**
   * Delete a file from S3
   * @param fileUrl - The S3 URL or filename to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const s3Key = this.s3Service.extractKeyFromUrl(fileUrl);
      if (!s3Key) {
        await this.s3Service.deleteFile(fileUrl);
      } else {
        await this.s3Service.deleteFile(s3Key);
      }
    } catch (error: any) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}
