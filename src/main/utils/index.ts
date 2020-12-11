export const throttle = (func: () => void, wait: number) => {
  let timer: any = null;
  return function () {
    let context: any = this;
    const args: IArguments = arguments;
    if (!timer) {
      timer = setTimeout(function () {
        func.apply(context, args);
        timer = null;
      }, wait);
    }
  };
};

export default {
  throttle,
};
