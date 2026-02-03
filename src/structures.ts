export interface LocalFileHeader {
  signature: number;
  versionNeeded: number;
  flags: number;
  compression: number;
  modTime: number;
  modDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  fileNameLength: number;
  extraFieldLength: number;
}

export interface CentralDirectoryEntry {
  signature: number;
  versionMadeBy: number;
  versionNeeded: number;
  flags: number;
  compression: number;
  modTime: number;
  modDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  fileNameLength: number;
  extraFieldLength: number;
  commentLength: number;
  diskNumberStart: number;
  internalAttributes: number;
  externalAttributes: number;
  localHeaderOffset: number;
}

export interface EOCD {
  signature: number;
  diskNumber: number;
  centralDirDisk: number;
  centralDirRecordsOnDisk: number;
  centralDirRecordsTotal: number;
  centralDirSize: number;
  centralDirOffset: number;
  commentLength: number;
}

export interface ZipEntry {
  fileName: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  crc32: number;
  isDirectory: boolean;
  lastModified: Date;
  localHeaderOffset: number;
}

export interface AddFileOptions {
  compression?: "store" | "deflate";
  lastModified?: Date;
}
