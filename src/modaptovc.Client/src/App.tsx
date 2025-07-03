import React, { JSX, ReactNode, SyntheticEvent, useEffect, useState } from 'react'
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
import { ApiException, DTMClient, ModuleRequestFormat, ModuleRequestType } from './DTMClient';
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

function App() {
    const dtmUri: string = import.meta.env.VITE_DTM_URI;
    const keycloakUri: string = import.meta.env.VITE_KEYCLOAK_URI;
    const modaptoLoginUri: string | undefined = import.meta.env.VITE_MODAPTO_LOGIN_URI;
    const backendUri: string = import.meta.env.VITE_BACKEND_URI;
    const keycloakUsername: string | undefined = import.meta.env.VITE_KEYCLOAK_USERNAME;
    const keycloakPassword: string | undefined = import.meta.env.VITE_KEYCLOAK_PASSWORD;
    const keycloakRealm: string | undefined = import.meta.env.VITE_KEYCLOAK_REALM;
    const keycloakClientId: string = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
    const keycloakClientSecret: string = import.meta.env.VITE_KEYCLOAK_CLIENT_Secret;

    const [selectedTab, setSelectedTab] = useState<string>('1');
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');
    const [paReportExists, setPAReportExists] = useState<boolean>(false);
    const [chartData, setChartData] = useState<unknown | null>();
    const [menuItems, setMenuItems] = useState<JSX.Element[]>([]);

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

    let authToken: string | undefined;

    const client = new DTMClient(dtmUri, {
        async fetch(url: RequestInfo, init: RequestInit) {
            if (!authToken || !await validateAuthToken(authToken)) {
                if (keycloakUsername && keycloakPassword && keycloakRealm) {
                    authToken = await getAuthToken();
                }
                else if (modaptoLoginUri) {
                    const a = document.createElement('a');
                    a.href = modaptoLoginUri!;
                    a.target = '_self';//'_blank';
                    a.click();
                    a.remove();
                }
                //error
            }

            init.headers['authorization'] = 'Bearer ' + authToken;
            return fetch(url, init);
        },
    });

    useEffect(() => {
        window.addEventListener('message', onRecievedAuthToken);
        return () => {
            window.removeEventListener("message", onRecievedAuthToken);
        }
    });

    const onRecievedAuthToken = (event: MessageEvent) => {
        if (!event.origin.startsWith(modaptoLoginUri!)) 
            return;

        authToken = event.data;
    }


    const getMenuItems = async () => {
        const menuItems: JSX.Element[] = [];
        const modules = await client.getAllModules();
        modules.forEach(async (module) => {
            const adminShell = JSON.parse(atob((await client.getModuleDetails(module.id!)).actualModel!)).assetAdministrationShells[0]
            menuItems.push(<MenuItem value={module.id} >{adminShell.idShort ?? adminShell.id}</MenuItem>);
        });
        return menuItems;
    }

    const validateAuthToken = async (token: string): Promise<boolean> => {
        const accessTokenValidationInit: RequestInit = {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: 'token=' + token + '&client_id=' + keycloakClientId + '&client_secret=' + keycloakClientSecret
        };

        return await fetch(keycloakUri + '/realms/' + keycloakRealm + '/protocol/openid-connect/token/introspect', accessTokenValidationInit)
            .then((res: Response) => res.json())
            .then(json => { return json.active });
    }

    const getAuthToken = async (): Promise<string | undefined> => {
        const authTokenInit: RequestInit = {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=password&client_id=' + keycloakClientId + '&client_secret=' + keycloakClientSecret + '&username=' + keycloakUsername + '&password=' + keycloakPassword
        };

        return await fetch(keycloakUri + '/realms/' + keycloakRealm + '/protocol/openid-connect/token', authTokenInit)
            .then((res: Response) => res.json())
            .then(json => { return json.access_token });
    }

    const handleClickSaveModule = async () => {
        await loading(async () => {
            const blob = new Blob([atob((await client.getModuleDetails(selectedModuleId!)).actualModel!)], { type: 'text/json' });
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
            await client.deleteModule(selectedModuleId!)
                .then(async () => {
                    await fetch(backendUri + '/pa-' + selectedModuleId, { method: 'DELETE' }).catch(() => alert('error', 'PA Report removal unsuccesful'));
                    setSelectedModuleId('');
                    setPAReportExists(false);
                    setChartData(null);
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

    const handleOpenSelect = async (event: SyntheticEvent<Element, Event>) => {
        await loading(async () => {
            setMenuItems(await getMenuItems());
        });
    };

    const handleChangeSelect = async (event: SelectChangeEvent<string>, child: ReactNode) => {
        let paReportExists = false;
        await loading(async () => {
            setSelectedModuleId(event.target.value);

            paReportExists = (await fetch(backendUri + '/pa-' + event.target.value, {
                method: 'Head'
            })).status === 200;
            setPAReportExists(paReportExists);
            //MODAPTO_Sustainability_TechnicalParameters kann verschiedenen positionen sein
            const submodel = JSON.parse(atob((await client.getModuleDetails(event.target.value)).actualModel!)).submodels[0];
            setChartData(submodel.submodelElements.find(s => s.idShort === 'TechnicalProperties')?.value
                .find(s => s.idShort === 'MODAPTO_Sustainability_TechnicalParameters'));
        })

        setDisableUpdateModule(false);
        setDisableUploadPAReport(paReportExists);
        setDisableSavePAReport(!paReportExists);
        setDisableSaveModule(false);
        setDisableRemoveModule(false);
    };

    const handleInputUploadModule = async (event: SyntheticEvent<HTMLInputElement>) => {
        const inputElement = (event.target as HTMLInputElement);
        if (inputElement.files) {
            await loading(async () => {
                for (const file of inputElement.files!) {
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
                    inputElement.value = '';
                    await client.createModule({ aas: data, format: format, type: ModuleRequestType.DOCKER, assetConnections: [] })
                        .then(() => alert('success', 'Upload succesful'))
                        .catch(() => alert('error', 'Upload unsuccesful'));
                }
            });
        }
    };

    const handleInputUpdateModule = async (event: SyntheticEvent<HTMLInputElement>) => {
        const inputElement = (event.target as HTMLInputElement);
        if (inputElement.files && inputElement.files.length > 0) {
            await loading(async () => {
                if (inputElement.files![0].name.endsWith('json')) {
                    await client.updateModule(selectedModuleId, {
                        aas: btoa(await inputElement.files![0].text()),
                        format: ModuleRequestFormat.JSON,
                        type: ModuleRequestType.DOCKER
                    })
                }
                else if (inputElement.files![0].name.endsWith('aasx')) {
                    await client.updateModule(selectedModuleId, {
                        aas: Buffer.from(await inputElement.files![0].arrayBuffer()).toString('base64'),
                        format: ModuleRequestFormat.AASX,
                        type: ModuleRequestType.DOCKER
                    })
                }
            })
                .then(async () => {
                    await loading(async () => {
                        inputElement.value = '';
                        setSelectedModuleId('');
                        setPAReportExists(false);
                        setChartData(null);
                        alert('success', 'Update succesful');
                    });
                })
                .catch(() => alert('error', 'Update unsuccesful'));
        }
    };

    const handleInputUploadPAReport = async (event: SyntheticEvent<HTMLInputElement>) => {
        const inputElement = (event.target as HTMLInputElement);
        if (inputElement.files) {
            await loading(async () => {
                const formData = new FormData();
                for (const file of inputElement.files!) {
                    formData.append('files', file);
                }
                await fetch(backendUri + '/pa-' + selectedModuleId, {
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
                inputElement.value = '';
            })
                .then(() => {
                    setDisableUploadPAReport(true)
                    setDisableSavePAReport(false);
                })
                .catch(() => { })
        }
    }

    const handleClickSavePAReport = async () => {
        await loading(async () => {
            await fetch(backendUri + '/pa-' + selectedModuleId, {
                method: 'GET'
            })
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
                        {menuItems}
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
                            <iframe src={'/data/pa-' + selectedModuleId + '/index.html'} scrolling='omit' style={{ position: 'absolute', width: '62%', height: '85%' }} />
                        ) : (
                            <p>No data loaded.</p>
                        )}
                    </TabPanel>
                    <TabPanel value='2'>
                        {chartData?.value ? (
                            <Radar
                                data={{
                                    labels: chartData.value.map(v => v.idShort),
                                    datasets: [
                                        {
                                            label: chartData.description[0].text,
                                            data: chartData.value.map(v => v.value),
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
