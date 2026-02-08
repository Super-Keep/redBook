import { describe, it, expect } from 'vitest';
import React from 'react';
import App from './App';

describe('App', () => {
  it('should be a valid React component', () => {
    // Verify App is a function component that can be called
    expect(typeof App).toBe('function');
  });

  it('should return a valid React element', () => {
    const element = React.createElement(App);
    expect(element).toBeDefined();
    expect(element.type).toBe(App);
  });
});
