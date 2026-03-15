import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { vi, beforeEach, afterEach, expect } from 'vitest';

// =====================
// CUSTOM RENDER WITH PROVIDERS
// =====================

interface WrapperProps {
  children: ReactNode;
}

function AllProviders({ children }: WrapperProps) {
  return (
    <TooltipProvider>
      <BrowserRouter>{children}</BrowserRouter>
    </TooltipProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// =====================
// WAIT UTILITIES
// =====================

export const waitFor = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await waitFor(interval);
  }
};

// =====================
// MOCK UTILITIES
// =====================

export const createMockFn = <T extends (...args: any[]) => any>(
  implementation?: T
) => {
  return vi.fn(implementation);
};

export const mockConsoleError = () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });
};

export const mockConsoleWarn = () => {
  const originalWarn = console.warn;
  beforeEach(() => {
    console.warn = vi.fn();
  });
  afterEach(() => {
    console.warn = originalWarn;
  });
};

// =====================
// ASSERTION UTILITIES
// =====================

export const expectToBeCalledWithPartial = (
  mockFn: ReturnType<typeof vi.fn>,
  partialArgs: Record<string, any>
) => {
  const calls = mockFn.mock.calls;
  const lastCall = calls[calls.length - 1];
  
  if (!lastCall) {
    throw new Error('Mock function was not called');
  }
  
  const actualArg = lastCall[0];
  
  Object.keys(partialArgs).forEach((key) => {
    expect(actualArg[key]).toEqual(partialArgs[key]);
  });
};

// =====================
// DATE UTILITIES
// =====================

export const createFutureDate = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

export const createPastDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

export const createDateRange = (startDaysFromNow: number, endDaysFromNow: number) => ({
  start: createFutureDate(startDaysFromNow),
  end: createFutureDate(endDaysFromNow),
});

// =====================
// UUID UTILITIES
// =====================

export const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const generateTestUUIDs = (count: number): string[] => {
  return Array.from({ length: count }, () => crypto.randomUUID());
};

// =====================
// FORM UTILITIES
// =====================

export const fillForm = async (
  getByLabelText: (text: string) => HTMLElement,
  values: Record<string, string>
) => {
  const user = userEvent.setup();
  for (const [label, value] of Object.entries(values)) {
    const input = getByLabelText(label);
    await user.clear(input);
    await user.type(input, value);
  }
};

// =====================
// ERROR UTILITIES
// =====================

export class TestError extends Error {
  code?: string;
  
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    this.name = 'TestError';
  }
}

export const createRLSError = (table: string) => {
  return new TestError(
    `new row violates row-level security policy for table "${table}"`,
    '42501'
  );
};

export const createAuthError = (message: string) => {
  return new TestError(message, 'AUTH_ERROR');
};

// =====================
// ASYNC UTILITIES
// =====================

export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

export const actAsync = async (callback: () => Promise<void>) => {
  const { act } = await import('@testing-library/react');
  await act(async () => {
    await callback();
    await flushPromises();
  });
};

// =====================
// PERFORMANCE UTILITIES
// =====================

export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

export async function expectWithinDuration<T>(
  fn: () => Promise<T>,
  maxDuration: number
): Promise<T> {
  const { result, duration } = await measureTime(fn);
  expect(duration).toBeLessThan(maxDuration);
  return result;
}
