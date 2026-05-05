// Declare iconify-icon as a custom HTML element for JSX usage
type IconifyIconProps = {
  icon?: string;
  width?: number | string;
  height?: number | string;
  classname?: string;
  className?: string;
  strokewidth?: string | number;
  rotate?: string | number;
  [key: string]: unknown;
};

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      "iconify-icon": IconifyIconProps;
    }
  }
}
