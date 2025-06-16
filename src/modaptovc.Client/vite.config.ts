import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [plugin()],
    appType: 'mpa',
    server: {
        port: 55083
    }
})