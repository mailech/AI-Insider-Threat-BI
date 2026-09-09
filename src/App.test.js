import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

test('renders Threat AI application and sign in screen', () => {
  render(
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );

  const brandElements = screen.getAllByText(/Threat AI/i);
  expect(brandElements.length).toBeGreaterThan(0);
});
