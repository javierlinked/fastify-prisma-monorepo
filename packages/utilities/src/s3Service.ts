import { DeleteObjectCommand, S3Client, ServerSideEncryption } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

export interface S3Config {
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  enableEncryption?: boolean;
}

export interface S3UploadResult {
  key: string;
  url: string;
  etag: string;
  location: string;
}

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private enableEncryption: boolean;
  private region: string;

  constructor(config: S3Config) {
    this.bucketName = config.bucketName;
    this.region = config.region;
    this.enableEncryption = config.enableEncryption ?? true;

    // Validate required configuration
    if (!config.region) {
      throw new Error('AWS region is required for S3 client');
    }
    if (!config.bucketName) {
      throw new Error('S3 bucket name is required');
    }
    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error(
        'AWS credentials (accessKeyId and secretAccessKey) are required for S3 client'
      );
    }

    const clientConfig = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    this.s3Client = new S3Client(clientConfig);
  }

  /**
   * Upload a file to S3
   * @param key - The S3 key (filename/path) for the object
   * @param body - The file content as a stream or buffer
   * @param contentType - MIME type of the file
   * @param metadata - Optional metadata for the object
   */
  async uploadFile(
    key: string,
    body: Readable | Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<S3UploadResult> {
    try {
      const uploadParams: any = {
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
        CacheControl: 'max-age=31536000',
        ContentDisposition: 'inline',
      };

      if (this.enableEncryption) {
        uploadParams.ServerSideEncryption = ServerSideEncryption.AES256;
      }

      const upload = new Upload({
        client: this.s3Client,
        params: uploadParams,
      });

      const result = await upload.done();

      return {
        key,
        url: this.generatePublicUrl(key),
        etag: result.ETag || '',
        location: result.Location || '',
      };
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error}`);
    }
  }

  /**
   * Delete a file from S3
   * @param key - The S3 key (filename/path) of the object to delete
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete file from S3: ${error}`);
    }
  }

  /**
   * Generate a public URL for an S3 object
   * @param key - The S3 key (filename/path) of the object
   */
  generatePublicUrl(key: string): string {
    if (this.region === 'eu-north-1') {
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    }
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Extract S3 key from a full S3 URL
   * @param url - The full S3 URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      if (url.includes('.s3.amazonaws.com/')) {
        return url.split('.s3.amazonaws.com/')[1];
      }

      if (url.includes('s3.amazonaws.com/')) {
        const parts = url.split('s3.amazonaws.com/')[1].split('/');
        return parts.slice(1).join('/');
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}
