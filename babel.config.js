module.exports = api => {
    const isTest = api.env('test');

    return {
        presets: [
            isTest ? [
                '@babel/preset-env',
                // Jest needs to target node
                { targets: { node: 'current' } }
            ] : [
                '@babel/preset-env'
            ]
        ]
    };
};
