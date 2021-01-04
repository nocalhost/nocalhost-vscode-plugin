import Stack from ".";

export default class CallableStack extends Stack {
  constructor(maxLength?: number) {
    super(maxLength);
  }

  public exec(): void {
    let fn: any;
    while (this.length() > 0 && (fn = this.pop())) {
      if (typeof fn === "function") {
        fn();
      }
    }
  }
}
