import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/NetworkGraph', () => ({
  __esModule: true,
  default: function MockNetworkGraph() {
    return <div data-testid="network-graph-placeholder" />;
  },
}));

test('renders welcome modal on first load', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /welcome to the network explorer/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /got it/i })).toBeInTheDocument();
});
