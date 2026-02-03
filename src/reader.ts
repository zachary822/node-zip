import { inflateRaw } from "node:zlib";
import { promisify } from "node:util";
import { crc32 } from "./crc32.js";
import {
  EOCD_SIG,
  EOCD_SIZE,
  CENTRAL_DIRECTORY_SIG,
  CENTRAL_DIRECTORY_HEADER_SIZE,
  LOCAL_FILE_HEADER_SIG,
  LOCAL_FILE_HEADER_SIZE,
  COMPRESSION_STORE,
  COMPRESSION_DEFLATE,
} from "./constants.js";
import { dosToDate } from "./utils.js";
import type { ZipEntry } from "./structures.js";

const inflateRawAsync = promisify(inflateRaw);

export class ZipReader {
  private buffer: Buffer;
  private entries: ZipEntry[];

  private constructor(buffer: Buffer, entries: ZipEntry[]) {
    this.buffer = buffer;
    this.entries = entries;
  }

  static fromBuffer(buffer: Buffer): ZipReader {
    const eocdOffset = findEOCD(buffer);
    if (eocdOffset === -1) {
      throw new Error("Invalid ZIP: EOCD record not found");
    }

    const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
    const centralDirRecords = buffer.readUInt16LE(eocdOffset + 10);

    const entries: ZipEntry[] = [];
    let offset = centralDirOffset;

    for (let i = 0; i < centralDirRecords; i++) {
      const sig = buffer.readUInt32LE(offset);
      if (sig !== CENTRAL_DIRECTORY_SIG) {
        throw new Error(
          `Invalid central directory signature at offset ${offset}`,
        );
      }

      const compression = buffer.readUInt16LE(offset + 10);
      const modTime = buffer.readUInt16LE(offset + 12);
      const modDate = buffer.readUInt16LE(offset + 14);
      const crc = buffer.readUInt32LE(offset + 16);
      const compressedSize = buffer.readUInt32LE(offset + 20);
      const uncompressedSize = buffer.readUInt32LE(offset + 24);
      const fileNameLength = buffer.readUInt16LE(offset + 28);
      const extraFieldLength = buffer.readUInt16LE(offset + 30);
      const commentLength = buffer.readUInt16LE(offset + 32);
      const localHeaderOffset = buffer.readUInt32LE(offset + 42);

      const fileName = buffer
        .subarray(
          offset + CENTRAL_DIRECTORY_HEADER_SIZE,
          offset + CENTRAL_DIRECTORY_HEADER_SIZE + fileNameLength,
        )
        .toString("utf-8");

      entries.push({
        fileName,
        compression,
        compressedSize,
        uncompressedSize,
        crc32: crc,
        isDirectory: fileName.endsWith("/"),
        lastModified: dosToDate(modTime, modDate),
        localHeaderOffset,
      });

      offset +=
        CENTRAL_DIRECTORY_HEADER_SIZE +
        fileNameLength +
        extraFieldLength +
        commentLength;
    }

    return new ZipReader(buffer, entries);
  }

  getEntries(): ZipEntry[] {
    return this.entries;
  }

  async readEntry(entry: ZipEntry): Promise<Buffer> {
    const offset = entry.localHeaderOffset;
    const sig = this.buffer.readUInt32LE(offset);
    if (sig !== LOCAL_FILE_HEADER_SIG) {
      throw new Error(`Invalid local file header at offset ${offset}`);
    }

    const fileNameLength = this.buffer.readUInt16LE(offset + 26);
    const extraFieldLength = this.buffer.readUInt16LE(offset + 28);
    const dataStart =
      offset + LOCAL_FILE_HEADER_SIZE + fileNameLength + extraFieldLength;
    const compressedData = this.buffer.subarray(
      dataStart,
      dataStart + entry.compressedSize,
    );

    let data: Buffer;
    if (entry.compression === COMPRESSION_STORE) {
      data = Buffer.from(compressedData);
    } else if (entry.compression === COMPRESSION_DEFLATE) {
      data = await inflateRawAsync(compressedData);
    } else {
      throw new Error(`Unsupported compression method: ${entry.compression}`);
    }

    const checksum = crc32(data);
    if (checksum !== entry.crc32) {
      throw new Error(
        `CRC-32 mismatch for "${entry.fileName}": expected ${entry.crc32}, got ${checksum}`,
      );
    }

    return data;
  }

  async extractAll(): Promise<Map<string, Buffer>> {
    const result = new Map<string, Buffer>();
    for (const entry of this.entries) {
      const data = await this.readEntry(entry);
      result.set(entry.fileName, data);
    }
    return result;
  }
}

function findEOCD(buffer: Buffer): number {
  // Search backwards for the EOCD signature
  const minOffset = Math.max(0, buffer.length - EOCD_SIZE - 65535);
  for (let i = buffer.length - EOCD_SIZE; i >= minOffset; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      return i;
    }
  }
  return -1;
}
