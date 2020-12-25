export default class Stack {
  private dataStore: any = [];
  private top: number = 0;

  public push(element: any): void {
    this.dataStore[this.top++] = element;
  }

  public pop(): any {
    return this.dataStore[--this.top];
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
