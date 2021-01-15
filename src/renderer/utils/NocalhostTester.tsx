import { mount, ReactWrapper } from "enzyme";
import React, {
  MutableRefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppWrapper } from "../App";
import AppRouter from "../AppRouter";
import { Actions } from "../store/actions/actions.types";
import { store } from "../store/store";

type onMountHandler = (dispatch: React.Dispatch<Actions>) => void;
type TestRunner = () => void;

interface TesterProps {
  onMount: onMountHandler;
}

const Tester = (props: TesterProps): JSX.Element => {
  const { dispatch } = useContext(store);
  const [renderedId, setRenderedId] = useState(1);
  const elementRef: MutableRefObject<HTMLDivElement> = useRef<HTMLDivElement>(
    null
  );
  const { onMount } = props;

  const observe = (element: HTMLElement): MutationObserver => {
    const observer = new MutationObserver((mutations: MutationRecord[]) => {
      mutations.forEach((record: MutationRecord) => {
        const runner: TestRunner | null = NocalhostTester.getRunner();
        const delay: number = NocalhostTester.getDelay();
        if (runner) {
          setTimeout(runner, delay);
        }
      });
    });
    observer.observe(elementRef.current, {
      attributes: true,
      attributeFilter: ["data-rendered-id"],
    });
    return observer;
  };

  useEffect(() => {
    const observer: MutationObserver = observe(elementRef.current);
    onMount(dispatch);
    setRenderedId(renderedId + 1);
    () => {
      observer.disconnect();
    };
  }, []);

  return <div ref={elementRef} data-rendered-id={renderedId}></div>;
};

export default class NocalhostTester {
  private wrapper: ReactWrapper | null = null;
  private static testRunner: TestRunner | null = null;
  private static delay: number = 30;

  public static getRunner(): TestRunner | null {
    return NocalhostTester.testRunner;
  }

  public static getDelay(): number {
    return NocalhostTester.delay;
  }

  constructor(onMount: onMountHandler) {
    this.wrapper = mount(
      <AppWrapper>
        <>
          <AppRouter />
          <Tester onMount={onMount} />
        </>
      </AppWrapper>
    );
  }

  getWrapper(): ReactWrapper | null {
    return this.wrapper;
  }

  run(runner: TestRunner, delay = 30): void {
    NocalhostTester.testRunner = runner;
    NocalhostTester.delay = delay;
  }
}
