import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/features/theme-toggle/ui/ThemeToggle';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('toggles dark mode class on document element', () => {
    render(<ThemeToggle />);
    const button = screen.getByLabelText(/toggle dark mode/i);
    
    // Initially might be light or based on media query
    const isInitiallyDark = document.documentElement.classList.contains('dark');
    
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(!isInitiallyDark);
    expect(localStorage.getItem('theme')).toBe(!isInitiallyDark ? 'dark' : 'light');
    
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(isInitiallyDark);
  });
});
