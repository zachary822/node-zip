// ZIP format signatures
export const LOCAL_FILE_HEADER_SIG = 0x04034b50;
export const CENTRAL_DIRECTORY_SIG = 0x02014b50;
export const EOCD_SIG = 0x06054b50;

// Compression methods
export const COMPRESSION_STORE = 0;
export const COMPRESSION_DEFLATE = 8;

// General purpose bit flags
export const FLAG_UTF8 = 1 << 11;

// Version needed to extract
export const VERSION_NEEDED_STORE = 20;
export const VERSION_NEEDED_DEFLATE = 20;

// Version made by (upper byte = OS, lower byte = ZIP spec version)
export const VERSION_MADE_BY = 20;

// Sizes
export const LOCAL_FILE_HEADER_SIZE = 30;
export const CENTRAL_DIRECTORY_HEADER_SIZE = 46;
export const EOCD_SIZE = 22;
