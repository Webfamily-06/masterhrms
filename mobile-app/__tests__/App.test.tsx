/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  jest.useFakeTimers();
  let tree: ReactTestRenderer.ReactTestRenderer | null = null;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  expect(tree).toBeDefined();
  await ReactTestRenderer.act(async () => {
    jest.runOnlyPendingTimers();
    tree?.unmount();
  });
  jest.useRealTimers();
});
