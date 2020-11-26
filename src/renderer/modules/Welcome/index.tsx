import React from "react";
import { Link } from "react-router-dom";

const Welcome: React.FC = () => {
  return (
    <h1>
      Welcome, <Link to="/dashboard">Go to dashboard</Link>
    </h1>
  );
};

export default Welcome;
