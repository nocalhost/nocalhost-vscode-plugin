const canceledName = "Canceled";

// !!!IMPORTANT!!!
// Do NOT change this class because it is also used as an API-type.
export class CancellationError extends Error {
  constructor() {
    super(canceledName);
    this.name = this.message;
  }
}
