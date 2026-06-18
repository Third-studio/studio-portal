import { render, screen } from '@testing-library/react';
import App from './App';

// Smoke test : l'app monte sans planter et affiche l'écran de chargement initial.
test('App se monte et affiche l\'écran de chargement', () => {
  render(<App />);
  expect(screen.getByText(/chargement/i)).toBeInTheDocument();
});
