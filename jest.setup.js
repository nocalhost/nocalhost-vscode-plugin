require("@testing-library/jest-dom");
const Enzyme = require("enzyme");
const Adapter = require("@wojtekmaj/enzyme-adapter-react-17");

Enzyme.configure({ adapter: new Adapter() });
global.acquireVsCodeApi = () => ({
  postMessage(message) {},
});
