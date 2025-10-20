import { ReactNode, SyntheticEvent, useEffect, useState, useRef } from 'react'
import './App.css'
import { Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Tab, Alert, AlertColor, Fade } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { DTMClient, ModuleDetailsResponse, ModuleRequest, ModuleRequestFormat, ModuleRequestType, ModuleResponse } from './DTMClient';
import { Buffer } from 'buffer';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

declare module 'react' {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        directory?: string;
        webkitdirectory?: string;
    }
}

interface TechnicalParameters {
    name: string;
    description: string | undefined;
    value: TechnicalParameter[] | undefined;
}

interface TechnicalParameter {
    idShort: string;
    description: string | undefined;
    value: number | undefined;
}

function App() {
    const dtmClient = useRef<DTMClient>(null);
    const modaptoUri = useRef<string>(null);
    const backendUri = useRef<string>(null);
    const authToken = useRef<string>(null);

    const [selectedTab, setSelectedTab] = useState<string>('1');
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');
    const [paReportExists, setPAReportExists] = useState<boolean>(false);
    const [modules] = useState<{ [shortId: string]: TechnicalParameters | undefined; }>({});

    const [disableUploadModule, setDisableUploadModule] = useState<boolean>(false);
    const [disableUpdateModule, setDisableUpdateModule] = useState<boolean>(true);
    const [disableSaveModule, setDisableSaveModule] = useState<boolean>(true);
    const [disableRemoveModule, setDisableRemoveModule] = useState<boolean>(true);
    const [disableSelectModule, setDisableSelectModule] = useState<boolean>(false);
    const [disableUploadPAReport, setDisableUploadPAReport] = useState<boolean>(true);
    const [disableSavePAReport, setDisableSavePAReport] = useState<boolean>(true);

    const [showAlert, setShowAlert] = useState<boolean>(false);
    const [alertText, setAlertText] = useState<string | null>();
    const [alertSeverity, setAlertSeverity] = useState<AlertColor>();

    const technicalPropertiesWhitelist = ['EnergyConsumption', 'CarbonEmission', 'Cycle Time', 'Costs', 'EnergyMix'];

    useEffect(() => {
        loading(async () => {
            window.addEventListener('message', onRecievedAuthToken);

            if (import.meta.env.PROD) {
                let occurances = 0;

                for (let i = 0; i < window.location.href.length; i++) {
                    if (window.location.href[i] == '/') {
                        occurances++;
                        if (occurances == 3) {
                            backendUri.current = window.location.href.substring(0, i) + '/api';
                            break;
                        }
                    }
                }
                if (!backendUri.current)
                    backendUri.current = window.location.href + '/api';
            }
            else
                backendUri.current = 'http://localhost:12345/api';

            await fetch(backendUri.current + '/config', { method: 'GET' })
                .then((res) => res.json())
                .then((json) => {
                    dtmClient.current = new DTMClient(json.dtmUri, {
                        async fetch(url: RequestInfo, init: RequestInit) {
                            return await authTokenFetchInit(url, init);
                        }
                    });
                    modaptoUri.current = json.modaptoUri;
                });
        });
        return () => {
            window.removeEventListener("message", onRecievedAuthToken);
        }
    }, []);

    const authTokenFetchInit = async (url: RequestInfo, init: RequestInit) => {
        if (!authToken.current || !await validateAuthToken(authToken.current)) {
            window.parent.postMessage({ type: 'REQUEST_TOKENS' }, '*');
            await wait(1000);

            if (!authToken.current) {
                if (modaptoUri.current) {
                    await fetch(modaptoUri.current, { method: 'HEAD' })
                        .then(() => {
                            const a = document.createElement('a');
                            a.href = modaptoUri.current!;
                            a.target = '_self';
                            a.click();
                            a.remove();
                        }).catch(async () => {
                            authToken.current = await getAuthToken();
                        });
                }
                else {
                    authToken.current = await getAuthToken();
                }
            }
        }

        (init.headers as any).authorization = 'Bearer ' + authToken.current;
        return fetch(url, init);
    }

    const onRecievedAuthToken = (event: MessageEvent) => {
        const { type, serviceToken } = event.data;
        console.log("Recieved: " + type);

        if (type == 'AUTH_TOKENS') {
            console.log("Recieved: " + serviceToken);
            authToken.current = serviceToken;
            window.parent.postMessage({ type: 'REQUEST_TOKENS_RECIEVED' }, '*');
        }
    }

    const validateAuthToken = async (token: string): Promise<boolean> => {
        return await fetch(backendUri.current + '/validateauthtoken?authtoken=' + token, { method: 'POST' })
            .then((res: Response) => res.json())
            .then(json => json.active);
    }

    const getAuthToken = async (): Promise<string> => {
        return await fetch(backendUri.current + '/authtoken', { method: 'GET' })
            .then((res: Response) => res.json())
            .then(json => json.access_token);
    }

    const handleOpenSelect = async (_event: SyntheticEvent) => {
        await loading(async () => {
            await dtmClient.current!.getAllModules()
                .then(async (modulesResponses: ModuleResponse[]) => {
                    const newModuleIds = modulesResponses.map(m => m.id);
                    for (const oldModuleId of Object.entries(modules).map(m => m[0])) {
                        if (!newModuleIds.includes(oldModuleId))
                            delete modules[oldModuleId];
                    }

                    const oldModuleIds = Object.entries(modules).map(m => m[0]);
                    for (const moduleResponse of modulesResponses) {
                        if (moduleResponse.id) {
                            if (!oldModuleIds.includes(moduleResponse.id))
                                modules[moduleResponse.id] = { name: moduleResponse.name!, description: undefined, value: undefined };
                        }
                    }
                });
        });
    };

    const getTechnicalParameters = (json: any) => {
        let technicalParameters: TechnicalParameters | undefined;
        for (const submodel of json.submodels) {
            const jsonTechnicalProperties = submodel.submodelElements.find((s: { idShort: string; }) => s.idShort === 'TechnicalProperties')?.value;
            if (jsonTechnicalProperties) {
                let jsonTechnicalParameters = jsonTechnicalProperties.find((s: { idShort: string; }) => s.idShort === 'MODAPTO_TechnicalParameters');
                if (!jsonTechnicalParameters)
                    jsonTechnicalParameters = jsonTechnicalProperties.find((s: { idShort: string; }) => s.idShort === 'MODAPTO_Sustainability_TechnicalParameters');

                if (jsonTechnicalParameters) {
                    const jsonAdminShell = json.assetAdministrationShells[0];
                    technicalParameters = {
                        name: jsonAdminShell.idShort ?? jsonAdminShell.id,
                        description: jsonTechnicalParameters.description[0].text,
                        value: jsonTechnicalParameters.value.filter((v: { idShort: string; }) => technicalPropertiesWhitelist.includes(v.idShort))
                            .map((v: { idShort: string, description: { text: string; }[]; value: number; }) => {
                                return {
                                    idShort: v.idShort,
                                    description: v.description[0].text,
                                    value: v.value
                                }
                            })
                    }
                    break;
                }
            }
        }
        return technicalParameters;
    }

    const handleChangeSelect = async (event: SelectChangeEvent<string>, _child: ReactNode) => {
        let paReportExists = false;
        await loading(async () => {
            await dtmClient.current!.getModuleDetails(event.target.value)
                .then((moduleDetailsRes: ModuleDetailsResponse) => {
                    const json = JSON.parse(atob(moduleDetailsRes.actualModel!));
                    modules[event.target.value] = getTechnicalParameters(json);
                });

            paReportExists = (await fetch(backendUri.current + '/' + event.target.value, { method: 'HEAD' })).ok;
            setPAReportExists(paReportExists);
            setSelectedModuleId(event.target.value);
        })

        setDisableUpdateModule(false);
        setDisableUploadPAReport(paReportExists);
        setDisableSavePAReport(!paReportExists);
        setDisableSaveModule(false);
        setDisableRemoveModule(false);
    };

    const handleClickSaveModule = async () => {
        await loading(async () => {
            const blob = new Blob([atob((await dtmClient.current!.getModuleDetails(selectedModuleId!)).actualModel!)], { type: 'text/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = selectedModuleId + '.json';
            a.click();
            URL.revokeObjectURL(a.href);
            a.remove();
        });
    };

    const handleClickRemoveModule = async () => {
        await loading(async () => {
            await dtmClient.current!.deleteModule(selectedModuleId!)
                .then(async () => {
                    await fetch(backendUri.current + '/' + selectedModuleId, { method: 'DELETE' })
                        .catch(() => alert('error', 'PA Report removal unsuccesful'));
                    setSelectedModuleId('');
                    delete modules[selectedModuleId];
                    setPAReportExists(false);
                    alert('success', 'Removal succesful');
                })
                .catch(e => {
                    alert('error', 'Removal unsuccesful')
                    throw e;
                });
        })
            .then(() => {
                setDisableUpdateModule(true);
                setDisableUploadPAReport(true);
                setDisableSaveModule(true);
                setDisableSavePAReport(true);
                setDisableRemoveModule(true);
            })
            .catch(() => { })
    };

    const encodeFile = async (file: File) => {
        let format;
        let data;

        if (file.name.endsWith('json')) {
            format = ModuleRequestFormat.JSON;
            data = btoa(await file.text());
        }
        else if (file.name.endsWith('aasx')) {
            format = ModuleRequestFormat.AASX;
            data = Buffer.from(await file.arrayBuffer()).toString('base64');
        }
        else {
            try {
                data = await file.text();
                const dataDecoded = atob(data);
                try {
                    JSON.parse(dataDecoded);
                    format = ModuleRequestFormat.JSON;
                }
                catch {
                    format = ModuleRequestFormat.AASX;
                }
            }
            catch {
                data = await file.text();
                try {
                    JSON.parse(data);
                    format = ModuleRequestFormat.JSON;
                    data = btoa(data);
                }
                catch {
                    format = ModuleRequestFormat.AASX;
                    data = Buffer.from(await file.arrayBuffer()).toString('base64');
                }
            }
        }
        return { format, data };
    }

    const handleInputUploadModule = async (event: SyntheticEvent<HTMLInputElement>) => {
        const inputElement = (event.target as HTMLInputElement);
        if (inputElement.files && inputElement.files.length > 0) {
            await loading(async () => {
                const { data, format } = await encodeFile(inputElement.files![0]);
                await dtmClient.current!.createModule(new ModuleRequest({ aas: data, format: format, type: ModuleRequestType.DOCKER }))
                    .then(() => alert('success', 'Upload succesful'))
                    .catch(() => alert('error', 'Upload unsuccesful'));
            });
        }
        inputElement.value = '';
    };

    const handleInputUpdateModule = async (event: SyntheticEvent<HTMLInputElement>) => {
        const inputElement = (event.target as HTMLInputElement);
        if (inputElement.files && inputElement.files.length > 0) {
            await loading(async () => {
                const { data, format } = await encodeFile(inputElement.files![0]);
                await dtmClient.current!.updateModule(selectedModuleId, new ModuleRequest({
                    aas: data,
                    format: format,
                    type: ModuleRequestType.DOCKER
                }))
                    .then(() => {
                        delete modules[selectedModuleId];
                        setSelectedModuleId('');
                        setPAReportExists(false);
                        alert('success', 'Update succesful');
                    })
                    .catch(e => {
                        alert('error', 'Update unsuccesful');
                        throw e;
                    });
            })
                .then(() => {
                    setDisableUpdateModule(true);
                    setDisableUploadPAReport(true);
                    setDisableSaveModule(true);
                    setDisableSavePAReport(true);
                    setDisableRemoveModule(true);
                })
                .catch(() => { });
        }
        inputElement.value = '';
    };

    const handleInputUploadPAReport = async (event: SyntheticEvent<HTMLInputElement>) => {
        const inputElement = (event.target as HTMLInputElement);
        if (inputElement.files) {
            await loading(async () => {
                const formData = new FormData();
                for (const file of inputElement.files!) {
                    formData.append('files', file);
                }
                await fetch(backendUri.current + '/' + selectedModuleId, {
                    method: 'POST',
                    body: formData
                })
                    .then(() => {
                        setPAReportExists(true);
                        alert('success', 'Upload succesful')
                    })
                    .catch(e => {
                        alert('error', 'Upload unsuccesful')
                        throw e
                    });
            })
                .then(() => {
                    setDisableUploadPAReport(true)
                    setDisableSavePAReport(false);
                })
                .catch(() => { })
        }
        inputElement.value = '';
    }

    const handleClickSavePAReport = async () => {
        await loading(async () => {
            await fetch(backendUri.current + '/' + selectedModuleId, { method: 'GET' })
                .then(r => r.blob())
                .then(blob => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = selectedModuleId + '.zip';
                    a.click();
                    URL.revokeObjectURL(a.href);
                    a.remove();
                });
        });
    };

    const wait = async (delay: number) => {
        await new Promise(res => setTimeout(res, delay));
    }

    const loading = async (callback: () => Promise<void>) => {
        const originalStates = [disableUploadModule, disableUpdateModule, disableSaveModule, disableRemoveModule, disableSelectModule, disableUploadPAReport, disableSavePAReport];
        setDisableUploadModule(true);
        setDisableUpdateModule(true);
        setDisableSaveModule(true);
        setDisableRemoveModule(true);
        setDisableSelectModule(true);
        setDisableUploadPAReport(true);
        setDisableSavePAReport(true);

        document.body.style.cursor = 'progress';
        await callback();
        document.body.style.cursor = '';

        setDisableUploadModule(originalStates[0]);
        setDisableUpdateModule(originalStates[1]);
        setDisableSaveModule(originalStates[2]);
        setDisableRemoveModule(originalStates[3]);
        setDisableSelectModule(originalStates[4]);
        setDisableUploadPAReport(originalStates[5]);
        setDisableSavePAReport(originalStates[6]);
    }

    const alert = async (severity: AlertColor, text: string) => {
        setAlertSeverity(severity);
        setAlertText(text);
        setShowAlert(true);
    }

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            {/* Left Panel */}
            <div style={{ width: '30%', padding: '20px', borderRight: '1px solid #ccc', alignContent: 'center' }}>
                <Button disabled={disableUploadModule} style={{ marginTop: '20px' }} variant='contained' component='label'>Upload module
                    <input type='file' accept='.json,.aasx' onInput={handleInputUploadModule} hidden />
                </Button>
                <Button disabled={disableUpdateModule} style={{ marginTop: '20px' }} variant='contained' component='label'>Update module
                    <input type='file' accept='.json,.aasx' onInput={handleInputUpdateModule} hidden />
                </Button>
                <Button disabled={disableUploadPAReport} style={{ marginTop: '20px', float: 'right' }} variant='contained' component='label'>Upload PA report
                    <input type='file' onInput={handleInputUploadPAReport} directory='' webkitdirectory='' hidden />
                </Button>
                <br />
                <Button disabled={disableSaveModule} style={{ marginTop: '20px' }} onClick={handleClickSaveModule}>Save module</Button>
                <Button disabled={disableRemoveModule} style={{ marginTop: '20px' }} onClick={handleClickRemoveModule}>Remove module</Button>
                <Button disabled={disableSavePAReport} style={{ marginTop: '20px', float: 'right' }} onClick={handleClickSavePAReport}>Save PA report</Button>
                <br />
                <FormControl disabled={disableSelectModule} fullWidth >
                    <InputLabel id='module-label'>Module</InputLabel>
                    <Select onChange={handleChangeSelect} onOpen={handleOpenSelect} value={selectedModuleId} labelId='module-label' label='Module'>
                        {Object.entries(modules).filter(e => e[1] && e[1].name).map(e => <MenuItem value={e[0]} >{e[1]!.name}</MenuItem>)}
                    </Select>
                </FormControl>
            </div>

            {/* Right Panel */}
            <div style={{ width: '70%', padding: '20px' }}>
                <TabContext value={selectedTab}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <TabList onChange={(_, value) => (setSelectedTab(value))} variant='scrollable' scrollButtons='auto'>
                            <Tab label='Process Analysis' value='1' />
                            <Tab label='Evaluation' value='2' />
                        </TabList>
                    </Box>
                    <TabPanel value='1'>
                        {paReportExists ? (
                            <iframe src={'/data/pa-' + selectedModuleId + '/index.html'} /*scrolling='omit'*/ style={{ position: 'absolute', width: '62%', height: '85%' }} />
                        ) : (
                            <p>No data loaded.</p>
                        )}
                    </TabPanel>
                    <TabPanel value='2'>
                        {modules[selectedModuleId]?.value ? (
                            <Radar
                                data={{
                                    labels: modules[selectedModuleId].value.map(v => v.description),
                                    datasets: [
                                        {
                                            label: modules[selectedModuleId].description,
                                            data: modules[selectedModuleId].value.map(v => v.value),
                                            backgroundColor: 'rgba(0, 123, 255, 0.2)',
                                            borderColor: 'rgba(0, 123, 255, 1)',
                                            borderWidth: 2,
                                        },
                                    ],
                                }}
                                options={{
                                    scales: {
                                        r: {
                                            angleLines: { display: true },
                                            suggestedMin: 0,
                                            suggestedMax: 100,
                                            pointLabels: {
                                                font: {
                                                    size: 14
                                                }
                                            }
                                        },
                                    },
                                }}
                                style={{ position: 'absolute', transform: 'scale(0.626)', transformOrigin: 'top left' }}
                            />
                        ) : (
                            <p>No data loaded.</p>
                        )}
                    </TabPanel>
                </TabContext>
                <Fade style={{ position: 'fixed', bottom: '0px', right: '0px' }} in={showAlert} timeout={{ enter: 1000, exit: 1000 }} addEndListener={() => {
                    setTimeout(() => {
                        setShowAlert(false);
                    }, 2000);
                }}>
                    <Alert severity={alertSeverity}>{alertText}</Alert>
                </Fade>
            </div>
        </div>
    );
}
/**/
export default App
