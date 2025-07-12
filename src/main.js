import createElement from './vdom/CreateElement.js';
import render from './vdom/Render.js';
import mount from './vdom/Mount.js';
import diff from './vdom/Diff.js';
import { createStore } from './core/store.js';
import { createRouter } from './core/router.js';
import { on, off, emit } from './core/events.js';

// Export the framework
export {
  createElement,
  render,
  mount,
  diff,
  createStore,
  createRouter,
  on,
  off,
  emit
};

// Create a global framework object for easier access
window.MiniFramework = {
  createElement,
  render,
  mount,
  diff,
  createStore,
  createRouter,
  on,
  off,
  emit
};