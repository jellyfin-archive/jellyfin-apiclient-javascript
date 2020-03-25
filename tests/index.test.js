import index from '../src/index';

test('contains an ApiClient property', () => {
    expect(index).toHaveProperty("ApiClient");
});

test('contains an ApiClientCore property', () => {
    expect(index).toHaveProperty("ApiClientCore");
});

test('contains an AppStorage property', () => {
    expect(index).toHaveProperty("AppStorage");
});

test('contains an ConnectionManager property', () => {
    expect(index).toHaveProperty("ConnectionManager");
});

test('contains an Credentials property', () => {
    expect(index).toHaveProperty("Credentials");
});

test('contains an Events property', () => {
    expect(index).toHaveProperty("Events");
});
