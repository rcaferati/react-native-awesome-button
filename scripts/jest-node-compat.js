const performanceDescriptor = Object.getOwnPropertyDescriptor(
  global,
  'performance'
);

if (performanceDescriptor?.configurable) {
  Object.defineProperty(global, 'performance', {
    configurable: true,
    writable: true,
    value: global.performance,
  });
}
