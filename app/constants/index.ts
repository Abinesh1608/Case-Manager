export { default as Colors } from './Colors';
export { Spacing, Layout } from './Spacing';
export { default as Typography } from './Typography';

// Default export for Expo Router compatibility
const constants = {
  Colors: require('./Colors').default,
  Spacing: require('./Spacing').Spacing,
  Layout: require('./Spacing').Layout,
  Typography: require('./Typography').default,
};

export default constants; 