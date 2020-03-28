/**
 * Utility module for websocket.
 * @module utils/websocket
 */
import events from '../events';

const messageIdsReceived = {};

export function onMessageReceivedInternal(instance, msg) {
    const messageId = msg.MessageId;
    if (messageId) {
        // message was already received via another protocol
        if (messageIdsReceived[messageId]) {
            return;
        }

        messageIdsReceived[messageId] = true;
    }

    if (msg.MessageType === "UserDeleted") {
        instance._currentUser = null;
    }
    else if (msg.MessageType === "UserUpdated" || msg.MessageType === "UserConfigurationUpdated") {
        const user = msg.Data;
        if (user.Id === instance.getCurrentUserId()) {
            instance._currentUser = null;
        }
    }

    events.trigger(instance, 'message', [msg]);
}

export function onWebSocketMessage(msg) {
    msg = JSON.parse(msg.data);
    onMessageReceivedInternal(this, msg);
}

export function onWebSocketOpen() {
    console.log('web socket connection opened');
    events.trigger(this, 'websocketopen');
}

export function onWebSocketError() {
    events.trigger(this, 'websocketerror');
}

export function setSocketOnClose(apiClient, socket) {
    socket.onclose = () => {
        console.log('web socket closed');

        if (apiClient._webSocket === socket) {
            console.log('nulling out web socket');
            apiClient._webSocket = null;
        }

        setTimeout(() => {
            events.trigger(apiClient, 'websocketclose');
        }, 0);
    };
}
