import { createMysqlStore } from '@zapo-js/store-mysql';
import { createNoopLogger, createStore, WaClient } from 'zapo-js';
import 'utils/log';
import 'utils/utils';
import { load as loadConfig } from './utils/config';
import { loadEvents } from 'handlers/events';

const store = createStore({
    backends: {
        mysql: createMysqlStore({
            pool: {
                host: 'localhost',
                port: 3306,
                user: 'root',
                password: 'root',
                database: 'zapo'
            }
        })
    },
    providers: {
    auth: 'mysql',
    signal: 'mysql',
    preKey: 'mysql',
    session: 'mysql',
    identity: 'mysql',
    senderKey: 'mysql',
    appState: 'mysql',
    privacyToken: 'mysql',
    messages: 'mysql',
    threads: 'mysql',
    contacts: 'mysql'
    }
});

async function runBot() {
    await loadConfig();
    console.clear();

    const client = new WaClient(
        {
            store,
            sessionId: 'default',
            connectTimeoutMs: 15_000,
            nodeQueryTimeoutMs: 30_000,
            history: { enabled: true, requireFullSync: true }
        },
        await createNoopLogger()
    );

    await loadEvents(client);

    await client.connect();

}

runBot();