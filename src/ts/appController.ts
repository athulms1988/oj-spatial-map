import * as ko from "knockout";
import * as ResponsiveUtils from "ojs/ojresponsiveutils";
import * as ResponsiveKnockoutUtils from "ojs/ojresponsiveknockoututils";
import Context = require("ojs/ojcontext");
import ArrayDataProvider = require("ojs/ojarraydataprovider");
import { InputSearchElement } from "ojs/ojinputsearch";
import "ojs/ojknockout";
import "ojs/ojinputsearch";
// import "ojs/ojselectsingle";

class RootViewModel {
    smScreen: ko.Observable<boolean> | undefined;
    appName: ko.Observable<string>;
    userLogin: ko.Observable<string>;
    footerLinks: Array<object>;
    centerOfMap: any = {
        latitude: '37.5',
        longitude: '-122.45'
    };
    centerMarker: any = {};
    value = ko.observable();
    rawValue = ko.observable();
    searchTerm = ko.observable();
    searchItemContext = ko.observable();
    previousSearchTerm = ko.observable();
    searchTimeStamp = ko.observable();
    isDelayed = ko.observableArray([]);
    orgMarkers = ko.observableArray([]);
    orgList = ko.observableArray([]);
    timerId: any = null;

    readonly suggestions = ko.observableArray([]);
    readonly dataProvider = new ArrayDataProvider(this.suggestions, {
        keyAttributes: "value",
    });
    readonly suggestionsDP = ko.pureComputed(() => {
        return this.dataProvider;
    });
    constructor() {
        // media queries for repsonsive layouts
        let smQuery: string | null = ResponsiveUtils.getFrameworkQuery("sm-only");
        if (smQuery) {
            this.smScreen = ResponsiveKnockoutUtils.createMediaQueryObservable(smQuery);
        }

        // header

        // application Name used in Branding Area
        this.appName = ko.observable("App Name");

        // user Info used in Global Navigation area
        this.userLogin = ko.observable("john.hancock@oracle.com");

        // footer
        this.footerLinks = [
            { name: 'About Oracle', linkId: 'aboutOracle', linkTarget: 'http://www.oracle.com/us/corporate/index.html#menu-about' },
            { name: "Contact Us", id: "contactUs", linkTarget: "http://www.oracle.com/us/corporate/contact/index.html" },
            { name: "Legal Notices", id: "legalNotices", linkTarget: "http://www.oracle.com/us/legal/index.html" },
            { name: "Terms Of Use", id: "termsOfUse", linkTarget: "http://www.oracle.com/us/legal/terms/index.html" },
            { name: "Your Privacy Rights", id: "yourPrivacyRights", linkTarget: "http://www.oracle.com/us/legal/privacy/index.html" },
        ];
        // release the application bootstrap busy state
        Context.getPageContext().getBusyContext().applicationBootstrapComplete();

        this.rawValue.subscribe((newValue) => {
            if (newValue === "") {
                this.suggestions([]);
            } else {
                if (this.timerId) {
                    clearInterval(this.timerId);
                    this.timerId = null;
                }
                this.timerId = setTimeout(() => {
                    this.popuplateLocations();
                }, 800);
            }
        })
    }

    popuplateLocations = async () => {
        this.suggestions([]);
        const response = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + this.rawValue(),
            {
                method: 'GET',
                headers: {
                    "Content-Type": "application/json"
                }
            });
        const locationResponse = await response.json();
        this.suggestions(locationResponse.map((location: any, index: number) => {
            return { value: location, label: location.display_name }
        }));

    }

    handleValueAction = async (
        event: InputSearchElement.ojValueAction<string, Record<string, string>>
    ) => {
        const selectedLocation: any = event.detail.itemContext?.data.value;
        const mapDom = (document as any).getElementById("map");
        const mapObj = mapDom.getMapObject();
        const maplibRegl = mapDom.getMapLibreGL();
        (window as any).mapObj = mapObj;
        mapObj.setCenter([selectedLocation.lon, selectedLocation.lat]);
        mapObj.setZoom(6);
        this.centerMarker && this.centerMarker.remove && this.centerMarker.remove();
        this.centerMarker = new maplibRegl.Marker()
            .setLngLat([selectedLocation.lon, selectedLocation.lat])
            .addTo(mapObj);
        const filterOrgList = await (window as any).populationOrgList(selectedLocation);
        const previousOrgList = this.orgList();
        previousOrgList.forEach((org: any) => {
            org.markerRef.remove();
        })
        this.orgList([]);
        const orgList: any = [];
        filterOrgList.forEach((org: any, index: number) => {
            const orgDetail = {
                organisationName: org[1],
                address: [org[2], org[3], org[4], org[5], org[6], org[9]].join(', '),
                arr: org[7],
                industry: org[8],
                latitude: org[10],
                longitude: org[11],
                markerRef: new maplibRegl.Marker()
                    .setPopup(new maplibRegl.Popup().setHTML(`<div>
                        <span><b>${org[1]}</b></span><br>
                        <span>${[org[2], org[3], org[4], org[5], org[6], org[9]].join(', ')}</span><br>
                        <span>ARR: $ ${org[7]}</span><br>
                        <span>Type: ${org[8]}</span><br>
                    </div>`))
                    .setLngLat([org[11], org[10]])
                    .addTo(mapObj),
                index: index
            };
            orgList.push(orgDetail);
        });
        this.orgList(orgList);
        mapObj.setZoom(3);
    }
}

export default new RootViewModel();