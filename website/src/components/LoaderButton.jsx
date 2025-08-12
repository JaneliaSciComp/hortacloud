import React from "react";
import PropTypes from "prop-types";
import { Button } from "antd";

export default function LoaderButton(props) {
  const { loading, disabled, children } = props;
  return (
    <Button
      loading={loading}
      disabled={disabled || loading}
      {...props} // eslint-disable-line react/jsx-props-no-spreading
    >
      {children}
    </Button>
  );
}

LoaderButton.propTypes = {
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  children: PropTypes.string.isRequired,
};

LoaderButton.defaultProps = {
  loading: false,
  disabled: false,
};
