module.exports = {
    clearMocks: true,
    coverageDirectory: "coverage",
    coverageReporters: [
        "cobertura",
    ],
    moduleFileExtensions: ['ts', 'js'],
    transform: {
        '^.+\\.ts?$': 'ts-jest',
        '^.+\\.js?$': 'ts-jest'
    },
    setupFiles: ['./jest.setup.js']
};
