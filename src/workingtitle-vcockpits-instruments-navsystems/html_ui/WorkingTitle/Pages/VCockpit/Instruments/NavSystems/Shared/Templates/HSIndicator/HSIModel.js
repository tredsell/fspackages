class HSIIndicatorModel {
    constructor() {
        this.rotation = new Subject(0);
        this.heading = new Subject(0);
        this.track = new Subject(0);
        this.flightPhase = new Subject();
        this.turnRate = new Subject(0);
        this.cdi = {
            sourceId: new Subject(null),
            source: new Subject("FMS"),
            bearing: new Subject(0),
            bearingAmount: new Subject(0),
            deviation: new Subject(0),
            deviationAmount: new Subject(0),
            displayDeviation: new Subject(false),
            toFrom: new Subject("0")
        };
        this.bearing = [
            {
                sourceId: new Subject(),
                source: new Subject(),
                ident: new Subject(),
                distance: new Subject(),
                bearing: new Subject(),
            },
            {
                sourceId: new Subject(),
                source: new Subject(),
                ident: new Subject(),
                distance: new Subject(),
                bearing: new Subject(),
            }
        ];
        this.dme = {
            sourceId: new Subject(),
            source: new Subject(),
            display: new Subject(),
            ident: new Subject(),
            distance: new Subject(),
        };

        this.crossTrackFullError = 2;
        this.crossTrackGoal = 0;
        this.crossTrackCurrent = 0;

        this.bearingGoal = 0;
        this.bearingCurrent = 0;

        SimVar.SetSimVarValue("L:PFD_DME_Displayed", "number", WTDataStore.get("HSI.ShowDme", false) ? 1 : 0);
        SimVar.SetSimVarValue("L:PFD_BRG1_Source", "number", WTDataStore.get("HSI.Brg1Src", 0));
        SimVar.SetSimVarValue("L:PFD_BRG2_Source", "number", WTDataStore.get("HSI.Brg2Src", 0));

        this.updateIndex = 0;
        this.lastUpdate = performance.now() / 1000;
    }
    updateCdi(dt) {
        this.cdi.sourceId.value = SimVar.GetSimVarValue("GPS DRIVES NAV1", "Bool") ? 3 : SimVar.GetSimVarValue("AUTOPILOT NAV SELECTED", "Number");
        switch (this.cdi.sourceId.value) {
            case 1:
                this.cdi.displayDeviation.value = SimVar.GetSimVarValue("NAV HAS NAV:1", "boolean") != 0;
                if (SimVar.GetSimVarValue("NAV HAS LOCALIZER:1", "Bool")) {
                    this.cdi.source.value = "LOC1";
                    this.bearingGoal = SimVar.GetSimVarValue("NAV LOCALIZER:1", "degree");
                }
                else {
                    this.cdi.source.value = "VOR1";
                    this.bearingGoal = SimVar.GetSimVarValue("NAV OBS:1", "degree");
                }
                this.crossTrackGoal = SimVar.GetSimVarValue("NAV CDI:1", "number") / 127;
                this.cdi.toFrom = SimVar.GetSimVarValue("NAV TOFROM:1", "Enum");
                break;
            case 2:
                this.cdi.displayDeviation.value = SimVar.GetSimVarValue("NAV HAS NAV:2", "boolean") != 0;
                if (SimVar.GetSimVarValue("NAV HAS LOCALIZER:2", "Bool")) {
                    this.cdi.source.value = "LOC2";
                    this.bearingGoal = SimVar.GetSimVarValue("NAV LOCALIZER:2", "degree");
                }
                else {
                    this.cdi.source.value = "VOR2";
                    this.bearingGoal = SimVar.GetSimVarValue("NAV OBS:2", "degree");
                }
                this.crossTrackGoal = SimVar.GetSimVarValue("NAV CDI:2", "number") / 127;
                this.cdi.toFrom = SimVar.GetSimVarValue("NAV TOFROM:2", "Enum");
                break;
            case 3:
                this.cdi.source.value = "FMS";
                this.cdi.displayDeviation.value = SimVar.GetSimVarValue("GPS WP NEXT ID", "string") != "";
                this.bearingGoal = SimVar.GetSimVarValue("GPS WP DESIRED TRACK", "degree");
                switch (SimVar.GetSimVarValue("L:GPS_Current_Phase", "number")) {
                    case 1:
                        this.crossTrackFullError = 0.3;
                        this.flightPhase.value = "DPRT";
                        break;
                    case 2:
                        this.crossTrackFullError = 1.0;
                        this.flightPhase.value = "TERM";
                        break;
                    case 4:
                        this.crossTrackFullError = 4.0;
                        this.flightPhase.value = "OCN";
                        break;
                    default:
                        this.crossTrackFullError = 2.0;
                        this.flightPhase.value = "ENR";
                        break;
                }
                this.cdi.deviation.value = parseFloat(SimVar.GetSimVarValue("GPS WP CROSS TRK", "nautical mile"));
                this.crossTrackGoal = this.cdi.deviation.value / this.crossTrackFullError;
                this.cdi.toFrom = "1";
                break;
        }

        this.crossTrackGoal = Math.max(Math.min(this.crossTrackGoal, 1), -1);

        this.crossTrackCurrent += (this.crossTrackGoal - this.crossTrackCurrent) * Math.min(1, 1 - Math.pow(0.01, dt * 3));
        this.bearingCurrent += this.getAngleDelta(this.bearingCurrent, this.bearingGoal) * Math.min(1, 1 - Math.pow(0.01, dt * 3));

        this.cdi.deviationAmount.value = this.crossTrackCurrent;
        this.cdi.bearing.value = this.bearingGoal;
        this.cdi.bearingAmount.value = this.bearingCurrent;
    }
    getAngleDelta(a, b) {
        return (b - a + 180) % 360 - 180;
    }
    updateBearing(id, bearing) {
        bearing.sourceId.value = SimVar.GetSimVarValue(`L:PFD_BRG${id}_Source`, "Number");
        bearing.display = bearing.sourceId.value != 0;
        switch (bearing.sourceId.value) {
            case 1:
                bearing.source.value = "NAV1";
                if (SimVar.GetSimVarValue("NAV HAS NAV:1", "Bool")) {
                    bearing.ident.value = SimVar.GetSimVarValue("NAV IDENT:1", "string");
                    bearing.distance.value = SimVar.GetSimVarValue("NAV HAS DME:1", "Bool") ? SimVar.GetSimVarValue("NAV DME:1", "nautical miles") : "";
                    bearing.bearing.value = (180 + SimVar.GetSimVarValue("NAV RADIAL:1", "degree")) % 360;
                }
                else {
                    bearing.ident.value = "NO DATA";
                    bearing.distance.value = "";
                    bearing.bearing.value = "";
                }
                break;
            case 2:
                bearing.source.value = "NAV2";
                if (SimVar.GetSimVarValue("NAV HAS NAV:2", "Bool")) {
                    bearing.ident.value = SimVar.GetSimVarValue("NAV IDENT:2", "string");
                    bearing.distance.value = SimVar.GetSimVarValue("NAV HAS DME:2", "Bool") ? SimVar.GetSimVarValue("NAV DME:2", "nautical miles") : "";
                    bearing.bearing.value = (180 + SimVar.GetSimVarValue("NAV RADIAL:2", "degree")) % 360;
                }
                else {
                    bearing.ident.value = "NO DATA";
                    bearing.distance.value = "";
                    bearing.bearing.value = "";
                }
                break;
            case 3:
                bearing.source.value = "GPS";
                bearing.ident.value = SimVar.GetSimVarValue("GPS WP NEXT ID", "string");
                bearing.distance.value = SimVar.GetSimVarValue("GPS WP DISTANCE", "nautical miles");
                bearing.bearing.value = SimVar.GetSimVarValue("GPS WP BEARING", "degree");
                break;
            case 4:
                bearing.source.value = "ADF";
                bearing.distance.value = "";
                if (SimVar.GetSimVarValue("ADF SIGNAL:1", "number")) {
                    bearing.ident.value = fastToFixed(SimVar.GetSimVarValue("ADF ACTIVE FREQUENCY:1", "KHz"), 1);
                    bearing.bearing.value = (SimVar.GetSimVarValue("ADF RADIAL:1", "degree") + compass) % 360;
                }
                else {
                    bearing.ident.value = "NO DATA";
                    bearing.bearing.value = "";
                }
                break;
        }
    }
    updateDme() {
        this.dme.display.value = SimVar.GetSimVarValue("L:PFD_DME_Displayed", "number");
        /*if (this.logic_dmeDisplayed) {
            this.setAttribute("show_dme", "true");
        }
        else {
            this.setAttribute("show_dme", "false");
        }*/
        this.dme.sourceId.value = SimVar.GetSimVarValue("L:Glasscockpit_DmeSource", "Number");
        switch (this.dme.sourceId.value) {
            case 0:
                SimVar.SetSimVarValue("L:Glasscockpit_DmeSource", "Number", 1);
            case 1:
                this.dme.source.value = "NAV1";
                if (SimVar.GetSimVarValue("NAV HAS DME:1", "Bool")) {
                    this.dme.ident.value = fastToFixed(SimVar.GetSimVarValue("NAV ACTIVE FREQUENCY:1", "MHz"), 2);
                    this.dme.distance = SimVar.GetSimVarValue("NAV DME:1", "nautical miles");
                }
                else {
                    this.dme.ident.value = "";
                    this.dme.distance = "";
                }
                break;
            case 2:
                this.dme.source.value = "NAV2";
                if (SimVar.GetSimVarValue("NAV HAS DME:2", "Bool")) {
                    this.dme.ident.value = fastToFixed(SimVar.GetSimVarValue("NAV ACTIVE FREQUENCY:2", "MHz"), 2);
                    this.dme.distance = SimVar.GetSimVarValue("NAV DME:2", "nautical miles");
                }
                else {
                    this.dme.ident.value = "";
                    this.dme.distance = "";
                }
                break;
        }
    }
    update(dt) {
        let now = performance.now() / 1000;
        dt = now - this.lastUpdate;
        this.lastUpdate = now;

        this.rotation.value = SimVar.GetSimVarValue("PLANE HEADING DEGREES MAGNETIC", "degree");
        this.turnRate.value = this.turnRate.value + (SimVar.GetSimVarValue("TURN INDICATOR RATE", "degree per second") - this.turnRate.value) / 5;
        this.heading.value = SimVar.GetSimVarValue("AUTOPILOT HEADING LOCK DIR", "degree");
        this.track.value = SimVar.GetSimVarValue("GPS GROUND MAGNETIC TRACK", "degrees");

        this.updateCdi(dt);
        this.updateBearing(1, this.bearing[0]);
        this.updateBearing(2, this.bearing[1]);
        this.updateDme();

        /*
        
        let diff = this.crossTrackGoal - this.crossTrackCurrent;
        let toAdd = (_deltaTime / 1000) * diff * 7.5;
        if (Math.abs(toAdd) < 0.75) {
            toAdd = toAdd > 0 ? 0.75 : -0.75;
        }
        if (Math.abs(diff) < 0.1 || Math.abs(toAdd) > Math.abs(diff)) {
            this.crossTrackCurrent = this.crossTrackGoal;
        }
        else {
            this.crossTrackCurrent += toAdd;
        }
        Avionics.Utils.diffAndSetAttribute(this.CDI, "transform", "translate(" + this.crossTrackCurrent + " 0)");*/
    }
    cycleCdi() {
        this.cdi.sourceId.value = (this.cdi.sourceId.value % 3) + 1;
        let isGPSDrived = SimVar.GetSimVarValue("GPS DRIVES NAV1", "Bool");
        if (this.cdi.sourceId.value == 2 && !SimVar.GetSimVarValue("NAV AVAILABLE:2", "Bool")) {
            this.cdi.sourceId.value = 3;
        }
        if (this.cdi.sourceId.value == 3 != isGPSDrived) {
            SimVar.SetSimVarValue("K:TOGGLE_GPS_DRIVES_NAV1", "Bool", 0);
        }
        if (this.cdi.sourceId.value != 3) {
            SimVar.SetSimVarValue("K:AP_NAV_SELECT_SET", "number", this.cdi.sourceId.value);
        }
    }
    cycleBearing(id) {
        this.bearing[id - 1].sourceId.value = (this.bearing[id - 1].sourceId.value + 1) % 5;
        SimVar.SetSimVarValue(`L:PFD_BRG${id}_Source`, "number", this.bearing[id - 1].sourceId.value);
        WTDataStore.set(`HSI.Brg${id}Src`, this.bearing[id - 1].sourceId.value);
        this.bearing[id - 1].display.value = this.bearing[id - 1].sourceId.value != 0;
    }
}