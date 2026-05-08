import { render, screen } from '@testing-library/react';
import Legend from '../features/legend/Legend';

const data = {
  nodes: [{ id: '1', year: '2024' }],
  links: [],
};

test('shows a readable title for the active color field', () => {
  render(<Legend colorBy="year" data={data} />);
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Color by Year');
});

test('shows email sequence title when that field is active', () => {
  render(<Legend colorBy="email-sequence" data={data} />);
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Email sequence');
});

test('shows generic legend title when no field is selected', () => {
  render(<Legend colorBy="" data={data} />);
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Legend');
});
