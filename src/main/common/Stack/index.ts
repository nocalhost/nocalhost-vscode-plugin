export default class Stack {
  private dataStore: any = [];
  private top: number = 0;
  private maxLength: number = 100;

  constructor(maxLength?: number) {
    if (maxLength) {
      this.maxLength = maxLength;
    }
  }

  public push(element: any): void {
    this.dataStore[this.top++] = element;
    if (this.length() > this.maxLength) {
      this.dataStore = this.dataStore.slice(1);
      this.top--;
    }
  }

  public pop(): any {
    return this.length() > 0 ? this.dataStore[--this.top] : undefined;
  }

  public peek(): any {
    return this.dataStore[this.top - 1];
  }

  public length(): number {
    return this.top;
  }

  public clear(): void {
    this.top = 0;
  }
}
