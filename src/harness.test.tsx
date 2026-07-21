import React from 'react';
import { render, screen } from '@testing-library/react';

function SmokeComponent() {
  return <div data-testid="smoke">harness-ok</div>;
}

test('rendering harness is wired (jsdom + globals + setup)', () => {
  render(<SmokeComponent />);
  expect(screen.getByTestId('smoke')).toBeInTheDocument();
});
