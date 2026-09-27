import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PersonForm from '../profile/PersonForm';

const node = { id: 'a', firstName: 'Jan', gender: 'male' as const, x: 0, y: 0, birthDate: '1980-01-01' };

describe('profile field drafts', () => {
  it('commits a long edit only once on blur', async () => {
    const onChange = vi.fn();
    render(<PersonForm node={node} onChange={onChange} />);
    const user = userEvent.setup();
    const bio = screen.getByLabelText('Biografia');
    const text = 'Długi życiorys z ponad pięćdziesięcioma znakami zachowuje wcześniejsze kroki historii.';
    await user.type(bio, text);
    expect(onChange).not.toHaveBeenCalled();
    await user.tab();
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ bio: text });
  });

  it('keeps an invalid name local, supports correction and discards drafts with Escape', async () => {
    const onChange = vi.fn();
    render(<PersonForm node={node} onChange={onChange} />);
    const user = userEvent.setup();
    const name = screen.getByLabelText('Imię');
    await user.clear(name);
    await user.tab();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Podaj imię');
    expect(onChange).not.toHaveBeenCalled();
    await user.type(name, 'Anna');
    await user.keyboard('{Escape}');
    expect(name).toHaveValue('Jan');
    await user.clear(name);
    await user.type(name, 'Maria{Enter}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ firstName: 'Maria' });
  });

  it('normalizes whitespace without creating a false edit or leaving a dirty draft', async () => {
    const onChange = vi.fn();
    render(<PersonForm node={node} onChange={onChange} />);
    const user = userEvent.setup();
    const name = screen.getByLabelText('Imię');
    await user.clear(name);
    await user.type(name, ' Jan ');
    await user.tab();
    expect(name).toHaveValue('Jan');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Opuść pole, aby zapisać zmianę.')).not.toBeInTheDocument();
  });

  it('rejects reversed dates in either field and accepts a correction', async () => {
    const onChange = vi.fn();
    render(<PersonForm node={{ ...node, deathDate: '2020-01-01' }} onChange={onChange} />);
    const user = userEvent.setup();
    const birth = screen.getByLabelText('Data ur.');
    await user.clear(birth);
    await user.type(birth, '2030-01-01');
    await user.tab();
    expect(birth).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();
    const death = screen.getByLabelText('Data śm.');
    await user.clear(death);
    await user.type(death, '1970-01-01');
    await user.tab();
    expect(death).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();
    await user.clear(death);
    await user.type(death, '2021-01-01');
    await user.tab();
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ deathDate: '2021-01-01' });
  });

  it('refreshes field values after undo and when selecting a different person', async () => {
    const onChange = vi.fn();
    const view = render(<PersonForm node={node} onChange={onChange} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Imię'));
    await user.type(screen.getByLabelText('Imię'), 'Anna{Enter}');
    view.rerender(<PersonForm node={{ ...node, firstName: 'Anna' }} onChange={onChange} />);
    view.rerender(<PersonForm node={node} onChange={onChange} />);
    expect(screen.getByLabelText('Imię')).toHaveValue('Jan');
    await user.clear(screen.getByLabelText('Imię'));
    view.rerender(<PersonForm node={{ ...node, id: 'b', firstName: 'Ewa' }} onChange={onChange} />);
    expect(screen.getByLabelText('Imię')).toHaveValue('Ewa');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
