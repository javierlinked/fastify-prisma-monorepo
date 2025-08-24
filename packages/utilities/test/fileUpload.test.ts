import { FileUploadService, UploadOptions } from '../src/fileUpload';
import { S3Config } from '../src/s3Service';

jest.mock('../src/s3Service', () => ({
  S3Service: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn().mockResolvedValue({
      key: 'files/12345678/test-image.jpg',
      url: 'https://test-bucket.s3.amazonaws.com/files/12345678/test-image.jpg',
      etag: 'test-etag',
      location: 'https://test-bucket.s3.amazonaws.com/files/12345678/test-image.jpg',
    }),
    generatePublicUrl: jest.fn((key: string) => `https://test-bucket.s3.amazonaws.com/${key}`),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    fileExists: jest.fn().mockResolvedValue(true),
    extractKeyFromUrl: jest.fn((url: string) => {
      const match = url.match(/amazonaws\.com\/(.+)$/);
      return match ? match[1] : null;
    }),
  })),
}));

describe('FileUploadService', () => {
  let uploadService: FileUploadService;
  let mockOptions: UploadOptions;
  let mockS3Config: S3Config;

  beforeEach(() => {
    mockS3Config = {
      region: 'eu-north-1',
      bucketName: 'test-bucket',
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
    };
    
    mockOptions = {
      s3Config: mockS3Config,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedFileExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    };
    uploadService = new FileUploadService(mockOptions);
  });

  describe('generateFileUrl', () => {
    it('should return URL as-is if it starts with http', () => {
      const fullUrl = 'https://test-bucket.s3.amazonaws.com/files/12345678/test-image.jpg';
      
      const result = uploadService.generateFileUrl(fullUrl);
      
      expect(result).toBe(fullUrl);
    });

    it('should generate S3 URL for filename', () => {
      const filename = 'test-image.jpg';
      const expectedUrl = 'https://test-bucket.s3.amazonaws.com/files/test-image.jpg';
      
      const result = uploadService.generateFileUrl(filename);
      
      expect(result).toBe(expectedUrl);
    });

    it('should handle S3 keys with paths', () => {
      const s3Key = 'files/12345678/test-image.jpg';
      const expectedUrl = 'https://test-bucket.s3.amazonaws.com/files/12345678/test-image.jpg';
      
      const result = uploadService.generateFileUrl(s3Key);
      
      expect(result).toBe(expectedUrl);
    });
  });

  describe('uploadFile', () => {
    const createMockStream = (data: Buffer) => {
      const stream = require('stream');
      const readable = new stream.Readable();
      readable.push(data);
      readable.push(null);
      return readable;
    };

    it('should reject files with disallowed MIME types', async () => {
      const smallBuffer = Buffer.alloc(1024); // 1KB
      const mockData = {
        file: createMockStream(smallBuffer),
        mimetype: 'application/pdf', // Not in allowed types
        filename: 'document.pdf',
      };

      await expect(uploadService.uploadFile(mockData, 'test')).rejects.toThrow(
        'File type application/pdf is not allowed'
      );
    });

    it('should reject empty files', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const mockData = {
        file: createMockStream(emptyBuffer),
        mimetype: 'image/jpeg',
        filename: 'empty.jpg',
      };

      await expect(uploadService.uploadFile(mockData, 'test')).rejects.toThrow(
        'File is empty'
      );
    });

    it('should reject files with disallowed extensions', async () => {
      const validBuffer = Buffer.alloc(1024);
      const mockData = {
        file: createMockStream(validBuffer),
        mimetype: 'image/jpeg',
        filename: 'test.exe', // Not in allowed extensions
      };

      await expect(uploadService.uploadFile(mockData, 'test')).rejects.toThrow(
        'File extension .exe is not allowed'
      );
    });

    it('should successfully upload valid file', async () => {
      const validBuffer = Buffer.alloc(1024);
      const mockData = {
        file: createMockStream(validBuffer),
        mimetype: 'image/jpeg',
        filename: 'test-image.jpg',
      };

      const result = await uploadService.uploadFile(mockData, 'test');

      expect(result).toMatchObject({
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        s3Key: expect.stringContaining('files/'),
        s3Url: expect.stringContaining('amazonaws.com'),
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file by URL', async () => {
      const fileUrl = 'https://test-bucket.s3.amazonaws.com/files/test.jpg';
      
      await expect(uploadService.deleteFile(fileUrl)).resolves.not.toThrow();
    });
  });
});
