const DEFAULT_SIZE = 1024;

export class ByteBuffer {
  private _size: number;
  private _offset: number = 0;
  private _bytes: Buffer;

  constructor(options?: { size?: number; buf: Buffer }) {
    this._size = options.size || DEFAULT_SIZE;
    this._offset = 0;
    const buf = options.buf;
    if (buf) {
      this._bytes = buf;
    } else {
      this._bytes = Buffer.alloc(this._size);
    }
  }
  static wrap(buf: Buffer, offset: number, length: number) {
    if (offset) {
      const end = offset + (length || buf.length);
      buf = buf.slice(offset, end);
    }
    return new ByteBuffer({ buf, size: buf.length });
  }

  getInt(index?: number) {
    if (typeof index !== "number") {
      index = this._offset;
      this._offset += 4;
    }
    return this._bytes.readInt32BE(index);
  }

  getString(index?: number) {
    let moveOffset = false;
    if (index === null || index === undefined) {
      index = this._offset;
      moveOffset = true;
    }
    const length = this.getInt(index);
    index += 4;

    if (moveOffset) {
      this._offset += 4 + length;
    }
    if (length === 0) {
      // empty string
      return "";
    }
    return this._bytes.toString("utf8", index, index + length);
  }
}
