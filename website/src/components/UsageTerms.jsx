import React from "react";
import { Link } from "react-router-dom";
import { Typography } from "antd";

const { Title } = Typography;

export default function UseageTerms() {
  return (
    <div>
      <Title level={3}>Usage Terms</Title>
      <p>
        We want to provide the very best science free for research use. In
        return, we ask that you cite Janelia Research Campus and the following
        publications, as applicable, should you publish using these resources:
      </p>
      <p>
        We plan to periodically update the data and publications, and the latest
        references will always be listed on the{" "}
        <Link to="/about">About page</Link>.
      </p>
    </div>
  );
}
