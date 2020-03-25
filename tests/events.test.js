import events from '../src/events';

describe('Events', () => {
    it('contains an on property', () => {
        expect(events).toHaveProperty('on');
    });

    it('contains an off property', () => {
        expect(events).toHaveProperty('off');
    });

    it('contains a trigger property', () => {
        expect(events).toHaveProperty('trigger');
    });
});
