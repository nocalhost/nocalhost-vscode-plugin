import React from "react";
import { Link } from "react-router-dom";

const Welcome: React.FC = () => {
  return (
    <h1>
      Dashboard, <Link to="/welcome">Go to welcome</Link>
    </h1>
  );
};

export default Welcome;
