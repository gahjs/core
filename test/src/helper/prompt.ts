export class PromptMock {
  private static data: (string | boolean | string[] | number)[];

  public static reset() {
    this.data = [];
  }

  public static addMock(mock: string | boolean | string[] | number) {
    this.data.push(mock);
  }

  public static getMock(): string | boolean | string[] | number {
    if (this.data.length === 0) {
      throw new Error('Prompt was called and no mock was created in test!');
    }
    return this.data.splice(0, 1)[0];
  }
}
