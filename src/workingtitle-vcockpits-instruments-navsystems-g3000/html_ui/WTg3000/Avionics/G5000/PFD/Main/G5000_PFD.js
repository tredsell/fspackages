class WT_G5000_PFD extends WT_G3x5_PFD {
    get templateID() { return "AS3000_PFD"; }

    _createMainPage() {
        return new WT_G5000_PFDMainPage(this);
    }
}

class WT_G5000_PFDMainPage extends WT_G3x5_PFDMainPage {
    _createAirspeedIndicator() {
        return new WT_G5000_PFDAirspeedIndicator();
    }

    _createAltimeter() {
        return new WT_G5000_PFDAltimeter();
    }

    _createAoAIndicator() {
        return new WT_G5000_PFDAoAIndicator();
    }

    _createBottomInfo() {
        return new WT_G5000_PFDBottomInfo();
    }
}

registerInstrument("as3000-pfd-element", WT_G5000_PFD);