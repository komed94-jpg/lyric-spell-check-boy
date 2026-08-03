import React from 'react';

export const metadata = {
  title: 'AI Development Agency Executor',
  description: 'Owner-controlled execution service',
};

export default function RootLayout({ children }) {
  return React.createElement(
    'html',
    { lang: 'ko' },
    React.createElement('body', null, children),
  );
}
