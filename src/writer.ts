import { deflateRaw } from "node:zlib";
import { promisify } from "node:util";
import { crc32 } from "./crc32.js";
import {
  LOCAL_FILE_HEADER_SIG,
  CENTRAL_DIRECTORY_SIG,
  EOCD_SIG,
  COMPRESSION_STORE,
  COMPRESSION_DEFLATE,
  FLAG_UTF8,
  VERSION_MADE_BY,
  VERSION_NEEDED_DEFLATE,
  LOCAL_FILE_HEADER_SIZE,
  CENTRAL_DIRECTORY_HEADER_SIZE,
  EOCD_SIZE,
} from "./constants.js";
import { dateToDosTime, writeUInt32LE, writeUInt16LE } from "./utils.js";
import type { AddFileOptions } from "./structures.js";

const deflateRawAsync = promisify(deflateRaw);

interface InternalEntry {
  fileName: string;
  fileNameBuf: Buffer;
  compression: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  modTime: number;
  modDate: number;
  localHeaderOffset: number;
  externalAttributes: number;
}

export class ZipWriter {
  private entries: InternalEntry[] = [];
  private buffers: Buffer[] = [];
  private offset = 0;

  async addFile(
    fileName: string,
    data: Buffer,
    options?: AddFileOptions,
  ): Promise<void> {
    const compressionMethod =
      options?.compression === "store"
        ? COMPRESSION_STORE
        : COMPRESSION_DEFLATE;
    const lastModified = options?.lastModified ?? new Date();
    const { time: modTime, date: modDate } = dateToDosTime(lastModified);

    const crc = crc32(data);
    const uncompressedSize = data.length;

    let compressedData: Buffer;
    if (compressionMethod === COMPRESSION_DEFLATE) {
      compressedData = await deflateRawAsync(data);
    } else {
      compressedData = data;
    }
    const compressedSize = compressedData.length;

    const fileNameBuf = Buffer.from(fileName, "utf-8");

    const entry: InternalEntry = {
      fileName,
      fileNameBuf,
      compression: compressionMethod,
      crc,
      compressedSize,
      uncompressedSize,
      modTime,
      modDate,
      localHeaderOffset: this.offset,
      externalAttributes: 0,
    };

    const header = Buffer.alloc(LOCAL_FILE_HEADER_SIZE);
    writeUInt32LE(header, LOCAL_FILE_HEADER_SIG, 0);
    writeUInt16LE(header, VERSION_NEEDED_DEFLATE, 4);
    writeUInt16LE(header, FLAG_UTF8, 6);
    writeUInt16LE(header, compressionMethod, 8);
    writeUInt16LE(header, modTime, 10);
    writeUInt16LE(header, modDate, 12);
    writeUInt32LE(header, crc, 14);
    writeUInt32LE(header, compressedSize, 18);
    writeUInt32LE(header, uncompressedSize, 22);
    writeUInt16LE(header, fileNameBuf.length, 26);
    writeUInt16LE(header, 0, 28); // extra field length

    this.buffers.push(header, fileNameBuf, compressedData);
    this.offset += LOCAL_FILE_HEADER_SIZE + fileNameBuf.length + compressedSize;
    this.entries.push(entry);
  }

  async addDirectory(dirName: string): Promise<void> {
    const normalized = dirName.endsWith("/") ? dirName : dirName + "/";
    await this.addFile(normalized, Buffer.alloc(0), { compression: "store" });
    // Mark last entry as directory via external attributes
    this.entries[this.entries.length - 1].externalAttributes = 0x10;
  }

  async finalize(): Promise<Buffer> {
    const centralDirOffset = this.offset;
    const centralDirBuffers: Buffer[] = [];
    let centralDirSize = 0;

    for (const entry of this.entries) {
      const headerSize =
        CENTRAL_DIRECTORY_HEADER_SIZE + entry.fileNameBuf.length;
      const header = Buffer.alloc(CENTRAL_DIRECTORY_HEADER_SIZE);

      writeUInt32LE(header, CENTRAL_DIRECTORY_SIG, 0);
      writeUInt16LE(header, VERSION_MADE_BY, 4);
      writeUInt16LE(header, VERSION_NEEDED_DEFLATE, 6);
      writeUInt16LE(header, FLAG_UTF8, 8);
      writeUInt16LE(header, entry.compression, 10);
      writeUInt16LE(header, entry.modTime, 12);
      writeUInt16LE(header, entry.modDate, 14);
      writeUInt32LE(header, entry.crc, 16);
      writeUInt32LE(header, entry.compressedSize, 20);
      writeUInt32LE(header, entry.uncompressedSize, 24);
      writeUInt16LE(header, entry.fileNameBuf.length, 28);
      writeUInt16LE(header, 0, 30); // extra field length
      writeUInt16LE(header, 0, 32); // comment length
      writeUInt16LE(header, 0, 34); // disk number start
      writeUInt16LE(header, 0, 36); // internal attributes
      writeUInt32LE(header, entry.externalAttributes, 38);
      writeUInt32LE(header, entry.localHeaderOffset, 42);

      centralDirBuffers.push(header, entry.fileNameBuf);
      centralDirSize += headerSize;
    }

    const eocd = Buffer.alloc(EOCD_SIZE);
    writeUInt32LE(eocd, EOCD_SIG, 0);
    writeUInt16LE(eocd, 0, 4); // disk number
    writeUInt16LE(eocd, 0, 6); // central dir disk
    writeUInt16LE(eocd, this.entries.length, 8);
    writeUInt16LE(eocd, this.entries.length, 10);
    writeUInt32LE(eocd, centralDirSize, 12);
    writeUInt32LE(eocd, centralDirOffset, 16);
    writeUInt16LE(eocd, 0, 20); // comment length

    return Buffer.concat([...this.buffers, ...centralDirBuffers, eocd]);
  }
}
