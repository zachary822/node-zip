# @zacharyjuang/node_zip

A lightweight, zero-dependency ZIP archive library for Node.js. Create and read ZIP files using only Node.js built-in modules.

## Features

- Create and read ZIP archives
- Deflate compression and store (no compression) modes
- CRC-32 integrity validation
- UTF-8 filename support
- Directory entries
- Full TypeScript type definitions
- Zero runtime dependencies

## Installation

```bash
npm install @zacharyjuang/node_zip
```

## Usage

### Creating a ZIP archive

```javascript
const { ZipWriter } = require("@zacharyjuang/node_zip");

const writer = new ZipWriter();

// Add files (deflate compression by default)
await writer.addFile("hello.txt", Buffer.from("Hello, World!"));
await writer.addFile("data/config.json", Buffer.from(JSON.stringify({ key: "value" })));

// Add a file with no compression
await writer.addFile("binary.bin", Buffer.from([0x00, 0x01, 0x02]), {
  compression: "store",
});

// Add an empty directory
await writer.addDirectory("empty-dir");

// Finalize and get the ZIP buffer
const zipBuffer = await writer.finalize();
```

### Reading a ZIP archive

```javascript
const { ZipReader } = require("@zacharyjuang/node_zip");

const reader = ZipReader.fromBuffer(zipBuffer);

// List entries
const entries = reader.getEntries();
for (const entry of entries) {
  console.log(entry.fileName, entry.uncompressedSize);
}

// Read a single entry
const content = await reader.readEntry(entries[0]);
console.log(content.toString());

// Extract all entries at once
const allFiles = await reader.extractAll();
for (const [name, data] of allFiles) {
  console.log(name, data.length);
}
```

## API

### `ZipWriter`

#### `addFile(fileName, data, options?)`

Add a file to the archive.

- `fileName` (`string`) - Path of the file within the archive.
- `data` (`Buffer`) - File contents.
- `options.compression` (`"deflate" | "store"`) - Compression method. Default: `"deflate"`.
- `options.lastModified` (`Date`) - File modification date. Default: current date.

#### `addDirectory(dirName)`

Add a directory entry to the archive.

- `dirName` (`string`) - Directory path.

#### `finalize()`

Finalize the archive and return the complete ZIP as a `Buffer`.

### `ZipReader`

#### `ZipReader.fromBuffer(buffer)`

Create a `ZipReader` from a ZIP buffer.

#### `getEntries()`

Return an array of `ZipEntry` objects.

#### `readEntry(entry)`

Decompress and return the contents of an entry as a `Buffer`. Validates CRC-32 checksums.

#### `extractAll()`

Extract all entries and return a `Map<string, Buffer>` keyed by filename.

### `ZipEntry`

```typescript
interface ZipEntry {
  fileName: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  crc32: number;
  isDirectory: boolean;
  lastModified: Date;
}
```

## License

MIT
