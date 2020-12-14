export interface ISchedule {
  task: () => void;
  terminate: () => void;
  start: () => void;
  stop: () => void;
}
