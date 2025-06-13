# virtual-commissioning-wrapper

# Virtual Commissioning via DT Management 

```plantuml

'skinparam handwritten true
skinparam monochrome true
scale 1024 width 
actor "Virtual commissioning (VC) engineer" as user
participant "VC wrapper application" as vcwrapper
participant "DT management" as DTM
'participant "Digital Twin (AAS) \nof Production Module 1 with 1 FMU \nloaded in FA3ST" as aas
participant "Virtual commissioning (VC)" as vc
group Upload Module
user->vcwrapper: Upload Module 
vcwrapper->DTM: (optional) load AAS from local user repository & base64 encoding of AAS & upload local AAS to DT management \n POST http://dt-management.fft.modapto.atc.gr/modules
end
group Display Modules' results
vcwrapper->DTM: request all AAS from DT management \n GET http://dt-management.fft.modapto.atc.gr/modules
vcwrapper->vcwrapper: display AAS list in dropdown
user->vcwrapper: selects one AAS in dropdown 
vcwrapper->vcwrapper: display/update spider diagram(evaluation) and PA report (from app repo) if module selected in dropdown list
end
group Save Module
user->vcwrapper: Save Module 
vcwrapper->DTM:request AAS from DT management \n GET http://dt-management.fft.modapto.atc.gr/modules/{ModuleID}/details
vcwrapper->vcwrapper: Decoding (Base64) of Module & storing (local download) of AAS
end
group Local Virtual Commissioning
user->user: user unpacks AAS and gets included FMU
user->vc: user includes FMU in virtual commissioning and analyzes results
vc->user: user adds results in AAS
vc->user: user stores HTML report from PA
end
group Upload Virtual Commissioning Results
group Upload enriched Module
user->vcwrapper: Update Module (incl. analysis results in submodel technical parameters)
vcwrapper->DTM: load AAS from local user repository & base64 encoding of AAS & update of AAS in DT mangement \n PUT http://dt-management.fft.modapto.atc.gr/modules/{ModuleID}
vcwrapper->vcwrapper: new AAS is used to create content of spider diagram (evaluation)
end
group Upload PA Report
user->vcwrapper: Upload PA Report
vcwrapper->vcwrapper: save PA report folder from local user repository in app repository
vcwrapper->vcwrapper: new HTML Report is used to be displayed in wrapper UI
end
end
group Download PA Report
user->vcwrapper: Download PA Report
vcwrapper->vcwrapper: save PA report folder from app repository to local user repository
end
group Remove Module
user->vcwrapper: Remove Module 
vcwrapper->DTM: \n DELETE http://dt-management.fft.modapto.atc.gr/modules/{ModuleID}
vcwrapper->vcwrapper: delete folder of AAS in app repository
vcwrapper->vcwrapper: update AAS list in dropdown
end
```

