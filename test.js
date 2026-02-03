const { describe, it, before } = require("node:test");
const assert = require("node:assert");
const { ZipWriter, ZipReader } = require("./dist/index");

describe("ZipWriter and ZipReader round-trip", () => {
  const files = {
    "hello.txt": Buffer.from("Hello, World!"),
    "data/config.json": Buffer.from(JSON.stringify({ key: "value", num: 42 })),
    "binary.bin": Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]),
  };

  let zipBuffer;
  let reader;
  let entries;

  before(async () => {
    const writer = new ZipWriter();
    await writer.addFile("hello.txt", files["hello.txt"]);
    await writer.addFile("data/config.json", files["data/config.json"]);
    await writer.addFile("binary.bin", files["binary.bin"], {
      compression: "store",
    });
    await writer.addDirectory("empty-dir");
    zipBuffer = await writer.finalize();
    reader = ZipReader.fromBuffer(zipBuffer);
    entries = reader.getEntries();
  });

  it("should create a valid ZIP buffer", () => {
    assert.ok(zipBuffer.length > 0);
  });

  it("should contain 4 entries", () => {
    assert.strictEqual(entries.length, 4);
  });

  it("should have correct entry names", () => {
    assert.strictEqual(entries[0].fileName, "hello.txt");
    assert.strictEqual(entries[1].fileName, "data/config.json");
    assert.strictEqual(entries[2].fileName, "binary.bin");
    assert.strictEqual(entries[3].fileName, "empty-dir/");
  });

  it("should mark directory entry as directory", () => {
    assert.strictEqual(entries[3].isDirectory, true);
  });

  it("should decompress deflated file correctly", async () => {
    const content = await reader.readEntry(entries[0]);
    assert.deepStrictEqual(content, files["hello.txt"]);
  });

  it("should decompress deflated JSON file correctly", async () => {
    const content = await reader.readEntry(entries[1]);
    assert.deepStrictEqual(content, files["data/config.json"]);
  });

  it("should read stored file correctly", async () => {
    const content = await reader.readEntry(entries[2]);
    assert.deepStrictEqual(content, files["binary.bin"]);
  });

  it("should read empty directory entry as zero-length buffer", async () => {
    const content = await reader.readEntry(entries[3]);
    assert.strictEqual(content.length, 0);
  });

  it("should extract all entries via extractAll", async () => {
    const allFiles = await reader.extractAll();
    assert.strictEqual(allFiles.size, 4);
    for (const [name, expected] of Object.entries(files)) {
      assert.deepStrictEqual(allFiles.get(name), expected);
    }
  });
});
