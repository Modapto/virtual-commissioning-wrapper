import { useEffect, useState } from 'react'
import './App.css'
import { Button } from '@mui/material';

function App() {
    const frontendUri = 'http://localhost:54321/';
    const backendUri = 'http://localhost:12345/api';

    const [disableSendToken, setDisableSendToken] = useState<boolean>(false);

    useEffect(() => {
        loading(async () => {
            await sendToken();
        });
    }, []);

    const handleClickSendToken = async () => {
        loading(async () => {
            await sendToken();
        });
    };

    const sendToken = async () => {
        const json = await fetch(backendUri + '/authtoken', { method: 'GET' })
            .then((res: Response) => res.json());
        const frame: HTMLIFrameElement = document.getElementsByName("iframeRef").item(0);
        const serviceToken = json.access_token;
        const refreshToken = json.refresh_token;
        frame.contentWindow?.postMessage(
            {
                type: 'AUTH_TOKENS',
                serviceToken,
                refreshToken
            },
            frontendUri
        );
    }

    const loading = async (callback: () => Promise<void>) => {
        setDisableSendToken(true);

        document.body.style.cursor = 'progress';
        await callback();
        document.body.style.cursor = '';

        setDisableSendToken(false);
    }

    return (
        <div>
            <Button disabled={disableSendToken} onClick={handleClickSendToken}>Send Token</Button>
            <iframe name='iframeRef' src={frontendUri} scrolling='omit' style={{ position: 'absolute', width: '100%', height: '100%' }} />
        </div>
    );
}
/**/
export default App
