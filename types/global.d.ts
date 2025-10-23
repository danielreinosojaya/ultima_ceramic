declare module 'qrcode' {
  export function toDataURL(text: string, opts?: any): Promise<string>;
  const qrcode: {
    toDataURL: typeof toDataURL;
  } & any;
  export default qrcode;
}

declare module 'pdfkit' {
  import { Stream } from 'stream';
  class PDFDocument {
    constructor(options?: any);
    image(src: any, ...args: any[]): this;
    text(text: string, ...args: any[]): this;
    pipe(destination: Stream): this;
    end(): void;
  }
  export default PDFDocument;
}

declare module '@aws-sdk/s3-request-presigner' {
  export function getSignedUrl(client: any, command: any, options?: any): Promise<string>;
}

declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config?: any);
    send(command: any): Promise<any>;
  }

  export class PutObjectCommand {
    constructor(input: any);
  }
}

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module 'qrcode';
declare module 'pdfkit';
declare module '@aws-sdk/client-s3';
declare module '@aws-sdk/s3-request-presigner';
declare module 'nunjucks';

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
