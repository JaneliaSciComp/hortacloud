import React from "react";
import { Link } from "react-router-dom";
import { Button, Typography } from "antd";

const { Title } = Typography;

export default function UseageTerms() {
  return (
    <div>
      <Title level={3}>Usage Terms</Title>
      <p>
        The purposes of this demo website is to be able to experiment with the
        HortaCloud volumetric viewer to view 3D Mouse Brain samples, view and
        experiment with annotation of neurons in these samples, and get a better
        understanding of how the browser functions. Because of this, user
        accounts are limited to 7 days and will be automatically removed once
        they expire. Also any annotations or work done in the demo are not
        intended to be saved and will be periodically removed.
      </p>
    </div>
  );
}
