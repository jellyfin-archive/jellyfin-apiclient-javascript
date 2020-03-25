import index from '../src/index';

describe('Entry point', () => {
    it('contains an ApiClient property', () => {
        expect(index).toHaveProperty('ApiClient');
    });

    it('contains an ApiClientCore property', () => {
        expect(index).toHaveProperty('ApiClientCore');
    });

    it('contains an AppStorage property', () => {
        expect(index).toHaveProperty('AppStorage');
    });

    it('contains an ConnectionManager property', () => {
        expect(index).toHaveProperty('ConnectionManager');
    });

    it('contains an Credentials property', () => {
        expect(index).toHaveProperty('Credentials');
    });

    it('contains an Events property', () => {
        expect(index).toHaveProperty('Events');
    });
});
