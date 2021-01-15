import React from "react";
import { ReactWrapper } from "enzyme";
import Logs from "../index";
import Landing from "../../Landing";
import NocalhostTester from "../../../utils/NocalhostTester";
import { Actions } from "../../../store/actions/actions.types";
import { redirect } from "../../../store/actions";

describe("Test <Logs />", () => {
  it("should display no content", (done) => {
    const tester: NocalhostTester = new NocalhostTester(
      (dispatch: React.Dispatch<Actions>) => {
        dispatch(redirect("/logs"));
      }
    );

    tester.run(() => {
      const wrapper: ReactWrapper | null = tester.getWrapper();
      console.log(wrapper.html());
      expect(wrapper.find(Logs)).toHaveLength(1);
      expect(wrapper.find(Landing)).toHaveLength(0);
      done();
    });
  });
});
