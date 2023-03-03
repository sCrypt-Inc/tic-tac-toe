import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/Play Tic-Tac-Toe on Bitcoin/i);
  expect(linkElement).toBeInTheDocument();
});
