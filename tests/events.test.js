import events from '../src/events';

test('contains an on property', () => {
    expect(events).toHaveProperty("on");
});

test('contains an off property', () => {
    expect(events).toHaveProperty("off");
});

test('contains a trigger property', () => {
    expect(events).toHaveProperty("trigger");
});


