import { mount, ReactWrapper } from "enzyme";
import React, {
  MutableRefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { render, RenderResult } from "@testing-library/react";
import { AppWrapper } from "../App";
import AppRouter from "../AppRouter";
import { Actions } from "../store/actions/actions.types";
import { store } from "../store/store";

type mountedHandler = (dispatch: React.Dispatch<Actions>) => void;
type mockHandler = () => void;
type TestRunner = () => void;
export type NocalhostSnapshotWrapper = RenderResult;

interface TesterProps {
  mounted: mountedHandler;
  mock?: mockHandler;
}

interface NocalhostTesterProps {
  mounted: mountedHandler;
  mock?: mockHandler;
}

const Tester = (props: TesterProps): JSX.Element => {
  const { dispatch } = useContext(store);
  const [renderedId, setRenderedId] = useState(1);
  const elementRef: MutableRefObject<HTMLDivElement> = useRef<HTMLDivElement>(
    null
  );
  const { mounted, mock } = props;

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
    if (mock) {
      mock();
    }
    mounted(dispatch);
    setRenderedId(renderedId + 1);
    () => {
      observer.disconnect();
    };
  }, []);

  return <div ref={elementRef} data-rendered-id={renderedId}></div>;
};

class NocalhostSnapshotTester {
  private wrapper: RenderResult | null = null;
  private mounted: mountedHandler | null = null;
  private mock: mockHandler | null = null;

  constructor(mounted: mountedHandler, mock: mockHandler) {
    this.mounted = mounted;
    this.mock = mock;
    this.wrapper = render(
      <AppWrapper>
        <>
          <AppRouter />
          <Tester mounted={this.mounted} mock={this.mock} />
        </>
      </AppWrapper>
    );
  }

  getWrapper(): RenderResult | null {
    return this.wrapper;
  }
}

export default class NocalhostTester {
  private static testRunner: TestRunner | null = null;
  private static delay: number = 30;
  private wrapper: ReactWrapper | null = null;
  private mounted: mountedHandler | null = null;
  private mock: mockHandler | null = null;

  public static getRunner(): TestRunner | null {
    return NocalhostTester.testRunner;
  }

  public static getDelay(): number {
    return NocalhostTester.delay;
  }

  constructor(props: NocalhostTesterProps) {
    const { mounted, mock } = props;
    this.mounted = mounted;
    this.mock = mock;
    this.wrapper = mount(
      <AppWrapper>
        <>
          <AppRouter />
          <Tester mounted={mounted} mock={mock} />
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

  getSnapshotWrapper(): RenderResult {
    const snapshotTester: NocalhostSnapshotTester = new NocalhostSnapshotTester(
      this.mounted,
      this.mock
    );
    return snapshotTester.getWrapper();
  }
}
