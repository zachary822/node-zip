export function dateToDosTime(date: Date): { time: number; date: number } {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const time =
    ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | ((seconds >> 1) & 0x1f);
  const dosDate =
    (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);

  return { time, date: dosDate };
}

export function dosToDate(dosTime: number, dosDate: number): Date {
  const seconds = (dosTime & 0x1f) * 2;
  const minutes = (dosTime >> 5) & 0x3f;
  const hours = (dosTime >> 11) & 0x1f;
  const day = dosDate & 0x1f;
  const month = ((dosDate >> 5) & 0x0f) - 1;
  const year = ((dosDate >> 9) & 0x7f) + 1980;

  return new Date(year, month, day, hours, minutes, seconds);
}

export function writeUInt32LE(
  buf: Buffer,
  value: number,
  offset: number,
): void {
  buf.writeUInt32LE(value >>> 0, offset);
}

export function writeUInt16LE(
  buf: Buffer,
  value: number,
  offset: number,
): void {
  buf.writeUInt16LE(value & 0xffff, offset);
}
