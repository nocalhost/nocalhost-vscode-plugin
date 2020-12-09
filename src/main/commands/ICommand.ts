export default interface ICommand {
  command: string;
  execCommand(args?: any): void;
}
