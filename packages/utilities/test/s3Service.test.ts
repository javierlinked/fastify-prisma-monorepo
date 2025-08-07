import { S3Service, S3Config } from '../src/s3Service';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/lib-storage');

const mockS3Client = {
  send: jest.fn(),
  config: {
    region: jest.fn().mockResolvedValue('eu-north-1'),
  },
};

const mockUpload = {
  done: jest.fn(),
};

describe('S3Service', () => {
  let s3Service: S3Service;
  let mockConfig: S3Config;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      region: 'eu-north-1',
      bucketName: 'test-bucket',
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      enableEncryption: true,
    };

    (S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(() => mockS3Client as any);
    (Upload as jest.MockedClass<typeof Upload>).mockImplementation(() => mockUpload as any);

    s3Service = new S3Service(mockConfig);
  });

  describe('constructor', () => {
    it('should create S3Service with correct configuration', () => {
      expect(S3Client).toHaveBeenCalledWith({
        region: 'eu-north-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      });
    });

    it('should throw error when credentials are not provided', () => {
      const configWithoutCreds = {
        region: 'eu-north-1',
        bucketName: 'test-bucket',
      } as any;

      expect(() => new S3Service(configWithoutCreds)).toThrow(
        'AWS credentials (accessKeyId and secretAccessKey) are required for S3 client'
      );
    });

    it('should throw error when region is not provided', () => {
      const configWithoutRegion = {
        bucketName: 'test-bucket',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      } as any;

      expect(() => new S3Service(configWithoutRegion)).toThrow(
        'AWS region is required for S3 client'
      );
    });

    it('should throw error when bucket name is not provided', () => {
      const configWithoutBucket = {
        region: 'eu-north-1',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      } as any;

      expect(() => new S3Service(configWithoutBucket)).toThrow(
        'S3 bucket name is required'
      );
    });
  });

  describe('uploadFile', () => {
    const mockBuffer = Buffer.from('test content');
    const contentType = 'text/plain';
    const key = 'test/file.txt';
    const metadata = { userId: '123' };

    beforeEach(() => {
      mockUpload.done.mockResolvedValue({
        ETag: 'test-etag',
        Location: 'https://test-bucket.s3.amazonaws.com/test/file.txt',
      });
    });

    it('should upload file successfully', async () => {
      const result = await s3Service.uploadFile(key, mockBuffer, contentType, metadata);

      expect(Upload).toHaveBeenCalledWith({
        client: mockS3Client,
        params: {
          Bucket: 'test-bucket',
          Key: key,
          Body: mockBuffer,
          ContentType: contentType,
          Metadata: metadata,
          CacheControl: 'max-age=31536000',
          ContentDisposition: 'inline',
          ServerSideEncryption: 'AES256',
        },
      });

      expect(result).toEqual({
        key,
        url: 'https://test-bucket.s3.amazonaws.com/test/file.txt',
        etag: 'test-etag',
        location: 'https://test-bucket.s3.amazonaws.com/test/file.txt',
      });
    });

    it('should upload file with stream', async () => {
      const stream = new Readable();
      stream.push('test content');
      stream.push(null);

      await s3Service.uploadFile(key, stream, contentType);

      expect(Upload).toHaveBeenCalledWith({
        client: mockS3Client,
        params: expect.objectContaining({
          Body: stream,
        }),
      });
    });

    it('should upload without encryption when disabled', async () => {
      const configNoEncryption = { ...mockConfig, enableEncryption: false };
      const serviceNoEncryption = new S3Service(configNoEncryption);

      await serviceNoEncryption.uploadFile(key, mockBuffer, contentType);

      const uploadCall = (Upload as jest.MockedClass<typeof Upload>).mock.calls[0][0];
      expect(uploadCall.params).not.toHaveProperty('ServerSideEncryption');
    });

    it('should handle upload errors', async () => {
      const error = new Error('Upload failed');
      mockUpload.done.mockRejectedValue(error);
      
      // Mock the region call to avoid async issues in error handling
      mockS3Client.config.region.mockResolvedValue('eu-north-1');

      // Suppress console.error for this test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      await expect(s3Service.uploadFile(key, mockBuffer, contentType)).rejects.toThrow(
        'Failed to upload file to S3: Error: Upload failed'
      );

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockS3Client.send.mockResolvedValue({});

      await s3Service.deleteFile('test/file.txt');

      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.any(DeleteObjectCommand)
      );
      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockS3Client.send.mockRejectedValue(error);

      await expect(s3Service.deleteFile('test/file.txt')).rejects.toThrow(
        'Failed to delete file from S3: Error: Delete failed'
      );
    });
  });

  describe('generatePublicUrl', () => {
    it('should generate URL for eu-north-1 region', () => {
      const url = s3Service.generatePublicUrl('test/file.txt');
      expect(url).toBe('https://test-bucket.s3.amazonaws.com/test/file.txt');
    });

    it('should generate URL for non-eu-north-1 region', () => {
      const configEuWest = { ...mockConfig, region: 'eu-west-1' };
      const serviceEuWest = new S3Service(configEuWest);

      const url = serviceEuWest.generatePublicUrl('test/file.txt');
      expect(url).toBe('https://test-bucket.s3.eu-west-1.amazonaws.com/test/file.txt');
    });
  });

  describe('extractKeyFromUrl', () => {
    it('should extract key from bucket.s3.amazonaws.com URL', () => {
      const url = 'https://test-bucket.s3.amazonaws.com/test/file.txt';
      const key = s3Service.extractKeyFromUrl(url);
      expect(key).toBe('test/file.txt');
    });

    it('should extract key from s3.amazonaws.com URL format', () => {
      const url = 'https://s3.amazonaws.com/test-bucket/test/file.txt';
      const key = s3Service.extractKeyFromUrl(url);
      expect(key).toBe('test/file.txt');
    });

    it('should return null for invalid URLs', () => {
      const url = 'https://example.com/file.txt';
      const key = s3Service.extractKeyFromUrl(url);
      expect(key).toBeNull();
    });

    it('should handle URLs with error gracefully', () => {
      const key = s3Service.extractKeyFromUrl('invalid-url');
      expect(key).toBeNull();
    });
  });
});
