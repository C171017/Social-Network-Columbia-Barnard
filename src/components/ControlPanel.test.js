import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ControlPanel from '../features/controls/ControlPanel';

test('clears colorBy when there are no nodes so the select value stays valid', async () => {
  function Wrapper() {
    const [colorBy, setColorBy] = useState('year');
    return <ControlPanel colorBy={colorBy} setColorBy={setColorBy} nodes={[]} />;
  }
  render(<Wrapper />);
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toHaveValue('');
  });
});

test('snaps colorBy to the first available field when the current value is invalid', async () => {
  const nodes = [{ id: '1', year: '2024', school: 'SEAS' }];
  function Wrapper() {
    const [colorBy, setColorBy] = useState('not_a_real_field');
    return <ControlPanel colorBy={colorBy} setColorBy={setColorBy} nodes={nodes} />;
  }
  render(<Wrapper />);
  await waitFor(() => {
    const select = screen.getByRole('combobox');
    const v = select.value;
    expect(['year', 'school']).toContain(v);
    expect(select).toHaveValue(v);
  });
});
