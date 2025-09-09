// DOM Test Setup - JSDOM environment for DOM manipulation tests
console.log('🌐 Setting up DOM Test environment...');

import 'jest-environment-jsdom';

// Mock Confluence AUI framework
global.AJS = {
  dialog2: jest.fn(() => ({
    show: jest.fn(),
    hide: jest.fn(),
    remove: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  })),
  messages: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  },
  $: jest.fn(() => ({
    val: jest.fn().mockReturnValue(''),
    text: jest.fn().mockReturnValue(''),
    html: jest.fn().mockReturnValue(''),
    show: jest.fn(),
    hide: jest.fn(),
    addClass: jest.fn(),
    removeClass: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    find: jest.fn(() => ({ 
      length: 0,
      val: jest.fn(),
      text: jest.fn()
    })),
    append: jest.fn(),
    prepend: jest.fn(),
    remove: jest.fn(),
    attr: jest.fn(),
    prop: jest.fn(),
    css: jest.fn()
  })),
  toInit: jest.fn(),
  whenIType: jest.fn(),
  params: {}
};

// Mock jQuery if used
global.$ = global.AJS.$;
global.jQuery = global.AJS.$;

// Add Jasmine compatibility for legacy tests
global.jasmine = {
  createSpy: (name) => {
    const spy = jest.fn();
    spy.and = {
      returnValue: (value) => {
        spy.mockReturnValue(value);
        return spy;
      },
      throwError: (error) => {
        spy.mockImplementation(() => { throw error; });
        return spy;
      },
      callFake: (fn) => {
        spy.mockImplementation(fn);
        return spy;
      }
    };
    return spy;
  },
  any: expect.any
};

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Mock console methods to reduce noise in DOM tests
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep errors visible
  debug: jest.fn()
};

// Setup DOM helper utilities
global.testDOMUtils = {
  createElement: (tag, attributes = {}) => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  },
  
  createMockDropdown: (options = []) => {
    const select = document.createElement('select');
    select.id = 'test-dropdown';
    
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value || option;
      optionElement.textContent = option.text || option;
      select.appendChild(optionElement);
    });
    
    document.body.appendChild(select);
    return select;
  },
  
  cleanup: () => {
    document.body.innerHTML = '';
  }
};

// Cleanup after each test
afterEach(() => {
  global.testDOMUtils.cleanup();
  jest.clearAllMocks();
});

console.log('✅ DOM test environment ready');