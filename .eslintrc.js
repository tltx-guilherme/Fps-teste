module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['next/core-web-vitals'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
