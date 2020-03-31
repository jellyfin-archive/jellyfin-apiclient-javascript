import apiClient from '../src/apiClient';

let client;

beforeEach(() => {
    client = new apiClient('http://demo.jellyfin.org/stable', 'Jellyfin Web', '10.5.0', 'Firefox', 'TW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0OyBydjo3NC4wKSBHZWNrby8yMDEwMDEwMSBGaXJlZm94Lzc0LjB8MTU4NDkwMTA5OTY3NQ11');
});

describe('ApiClient class', () => {
    it('is instantiable', () => {
        expect(client).toBeInstanceOf(apiClient);
    });

    it('has the expected constructor', () => {
        expect(client._serverAddress).toBe('http://demo.jellyfin.org/stable');
        expect(client._appName).toBe('Jellyfin Web');
        expect(client._appVersion).toBe('10.5.0');
        expect(client._deviceName).toBe('Firefox');
        expect(client._deviceId).toBe('TW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0OyBydjo3NC4wKSBHZWNrby8yMDEwMDEwMSBGaXJlZm94Lzc0LjB8MTU4NDkwMTA5OTY3NQ11');
    });

    it('can get serverAddress', () => {
        expect(client.serverAddress()).toBe('http://demo.jellyfin.org/stable');
    });

    it('can get appName', () => {
        expect(client.appName()).toBe('Jellyfin Web');
    });

    it('can get appVersion', () => {
        expect(client.appVersion()).toBe('10.5.0');
    });

    it('can get deviceName', () => {
        expect(client.deviceName()).toBe('Firefox');
    });

    it('can get deviceId', () => {
        expect(client.deviceId()).toBe('TW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0OyBydjo3NC4wKSBHZWNrby8yMDEwMDEwMSBGaXJlZm94Lzc0LjB8MTU4NDkwMTA5OTY3NQ11');
    });

    it('can throw error on setting an invalid server address', () => {
        expect(() => {
            client.serverAddress('lorem')
        }).toThrow(Error);
    });

    it('can change server address', () => {
        expect(client.serverAddress('http://demo.jellyfin.org/nightly')).toBe('http://demo.jellyfin.org/nightly');
    });

    it("can get a URL", () => {
        expect(client.getUrl('/System/Info/Public')).toBe('http://demo.jellyfin.org/stable/System/Info/Public');
    });

    it('can throw error on getting an empty URL', () => {
        expect(() => {
            client.getUrl()
        }).toThrow(Error);
    });

    it('can set valid headers', () => {
        const headers = {};
        expect(() => {
            client.setRequestHeaders(headers)
        }).not.toThrow(Error);
        expect(headers).toStrictEqual({'X-Emby-Authorization': 'MediaBrowser Client="Jellyfin Web", Device="Firefox", DeviceId="TW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0OyBydjo3NC4wKSBHZWNrby8yMDEwMDEwMSBGaXJlZm94Lzc0LjB8MTU4NDkwMTA5OTY3NQ11", Version="10.5.0"'});
    });
});
