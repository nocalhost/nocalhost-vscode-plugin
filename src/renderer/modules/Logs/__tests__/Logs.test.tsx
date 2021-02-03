import React from "react";
import { ReactWrapper } from "enzyme";
import Logs from "../index";
import NocalhostTester, {
  NocalhostSnapshotWrapper,
} from "../../../utils/NocalhostTester";
import { Actions } from "../../../store/actions/actions.types";
import { redirect, updateLogs } from "../../../store/actions";

describe("Test <Logs />", () => {
  it("should render skeleton", (done) => {
    const tester: NocalhostTester = new NocalhostTester({
      mounted(dispatch: React.Dispatch<Actions>) {
        dispatch(redirect("/logs"));
      },
    });

    tester.run(() => {
      const wrapper: ReactWrapper | null = tester.getWrapper();
      expect(wrapper.find(Logs)).toHaveLength(1);
      expect(wrapper.exists("#logs-skeleton")).toBeTruthy();
      expect(wrapper.text()).toEqual("");
      done();
    });

    const snapshotWrapper: NocalhostSnapshotWrapper = tester.getSnapshotWrapper();
    expect(snapshotWrapper).toMatchSnapshot();
  });

  it("should display no content", (done) => {
    const tester: NocalhostTester = new NocalhostTester({
      mounted(dispatch: React.Dispatch<Actions>) {
        dispatch(redirect("/logs"));
        dispatch(
          updateLogs({
            id: "logs-test-id",
            items: [],
          })
        );
      },
    });

    tester.run(() => {
      const wrapper: ReactWrapper | null = tester.getWrapper();
      expect(wrapper.find(Logs)).toHaveLength(1);
      expect(wrapper.text()).toEqual("No Content.");
      done();
    });

    const snapshotWrapper: NocalhostSnapshotWrapper = tester.getSnapshotWrapper();
    expect(snapshotWrapper).toMatchSnapshot();
  });

  it("should disploy logs", (done) => {
    const tester: NocalhostTester = new NocalhostTester({
      mounted(dispatch: React.Dispatch<Actions>) {
        dispatch(redirect("/logs"));
        dispatch(
          updateLogs({
            id: "logs-test-id",
            items: ["AAA", "BBB", "CCC"],
          })
        );
      },
      mock() {
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
      },
    });

    tester.run(() => {
      const wrapper: ReactWrapper | null = tester.getWrapper();
      expect(wrapper.find(Logs)).toHaveLength(1);
      expect(wrapper.exists("ul")).toBeTruthy();
      expect(wrapper.find("ul").children().length).toEqual(3);
      expect(wrapper.find("ul").childAt(0).text()).toEqual("AAA");
      expect(wrapper.find("ul").childAt(1).text()).toEqual("BBB");
      expect(wrapper.find("ul").childAt(2).text()).toEqual("CCC");
      done();
    });

    const snapshotWrapper: NocalhostSnapshotWrapper = tester.getSnapshotWrapper();
    expect(snapshotWrapper).toMatchSnapshot();
  });
});
