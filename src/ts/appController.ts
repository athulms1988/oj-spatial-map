import * as ko from "knockout";
import * as ResponsiveUtils from "ojs/ojresponsiveutils";
import * as ResponsiveKnockoutUtils from "ojs/ojresponsiveknockoututils";
import Context = require("ojs/ojcontext");
import ArrayDataProvider = require("ojs/ojarraydataprovider");
import { RESTDataProvider } from "ojs/ojrestdataprovider";
import { InputSearchElement } from "ojs/ojinputsearch";
import { ojListView } from "ojs/ojlistview";
import "ojs/ojknockout";
import "ojs/ojinputsearch";
import "ojs/ojknockout-keyset";
import "ojs/ojlistview";
import "ojs/ojlabel";
import "ojs/ojlistitemlayout";

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
    centerCordinates: any = [];
    abortController: any;
    request: any;
    showArr: boolean = false;

    readonly suggestions = ko.observableArray([]);
    readonly firstSelectedItem = ko.observable();
    selectedItems = ko.observableArray<number>([]);
    readonly dataProvider = new RESTDataProvider({
        keyAttributes: "value",
        url: "https://nominatim.openstreetmap.org/search",
        // fetchByOffset and fetchByKeys delegate to fetchFirst if their capabilities are not defined
        // so at minimum we must specify transforms for fetchFirst
        transforms: {
          fetchFirst: {
            request: async (options: any) => {
              const url = new URL(options.url);
              url.searchParams.set('format', String('json'));
              url.searchParams.set('q', options.fetchParameters.filterCriterion.text ? String(options.fetchParameters.filterCriterion.text): '');
              if(this.request) {
                this.abortController.abort();
              }
              this.abortController = new AbortController();
              this.request = new Request(url.href, {signal: this.abortController.signal});
            //   if(!options.fetchParameters.filterCriterion.text || options.fetchParameters.filterCriterion.text.trim().length === 0) {
            //     this.abortController.abort();
            //   }
              return this.request;
            },
            response: async ({ body }: any) => {
              // The mock server sends back a response body with shape { hasMore, totalSzie, data } so
              // we need to extract and return them
              const modifiedData = body.map((location: any, index: number) => {
                return { value: location, label: location.display_name }
              });
              return { data: modifiedData };
            }
          }
        }
      });
    readonly listDataProvider = new ArrayDataProvider(this.orgList, { keyAttributes: "index" });
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
    }

    isInViewport = (el: HTMLElement): boolean => {
        const rect = el.getBoundingClientRect();
    
        var isinview = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    
        );
    
        // returns true or false based on whether or not the element is in viewport
        return isinview; 
    }

    handleSelectedChanged = (
        event: ojListView.selectedChanged<any, any>
      ) => {
        if(this.firstSelectedItem() && this.firstSelectedItem().data) {
            this.highLightMarker(this.firstSelectedItem().data);
        }
      };

      highLightMarker = (highlightedMarker: any, openPopup: boolean = true) => {
        const selectedMarker = highlightedMarker.markerRef;
        const selectedPopup =  highlightedMarker.popup;
        (this.listDataProvider as any).data().forEach((marker: any) => {
            if(openPopup) {
                marker.popup.remove();
            }
            marker.markerRef._element.classList.remove('selected');
            marker.markerRef._element.style.zIndex = '';
        });
        selectedMarker._element.classList.remove('selected');
        selectedMarker._element.classList.add('selected');
        selectedMarker._element.style.zIndex = 1;
        if(openPopup) {
            selectedPopup.addTo((document as any).getElementById("map").getMapObject());
        }

        const listItemElement: HTMLElement | null = document.querySelector(".oj-listview-item-layout.oj-selected");
        if(listItemElement && !this.isInViewport(listItemElement)) {
            listItemElement.scrollIntoView();
        }
      }

    handleValueAction = async (
        event: InputSearchElement.ojValueAction<string, Record<string, string>>
    ) => {
        const selectedLocation: any = event.detail.itemContext?.data.value;
        const mapDom = (document as any).getElementById("map");
        const mapObj = mapDom.getMapObject();
        const maplibRegl = mapDom.getMapLibreGL();
        mapObj.setCenter([selectedLocation.lon, selectedLocation.lat]);
        this.centerCordinates = [selectedLocation.lon, selectedLocation.lat];
        mapObj.setZoom(6);
        this.centerMarker && this.centerMarker.remove && this.centerMarker.remove();
        this.centerMarker = new maplibRegl.Marker({color: "red"})
            .setLngLat([selectedLocation.lon, selectedLocation.lat])
            .addTo(mapObj);
        const filterOrgList = await (window as any).populationOrgList(selectedLocation);
        const previousOrgList = this.orgList();
        previousOrgList.forEach((org: any) => {
            org.markerRef.remove();
        })
        this.orgList([]);
        let orgList: any = [];
        filterOrgList.forEach((org: any, index: number) => {
            const popup = new maplibRegl.Popup();
            const distance = Math.round(this.getDistanceFromLatLonInKm(this.centerCordinates[1], this.centerCordinates[0], org[10], org[11]))
            const orgDetail = {
                organisationName: org[1],
                address: [org[2], org[3], org[4], org[5], org[6], org[9]].join(', '),
                arr: this.showArr ? org[7]: null,
                industry: org[8],
                latitude: org[10],
                longitude: org[11],
                popup: popup,
                markerRef: new maplibRegl.Marker()
                    .setPopup(popup.setHTML(`<div>
                        <span style="font-weight: bold; color: #40b1ce;">${org[1]}</span><br>
                        <span>${[org[2], org[3], org[4], org[5], org[6], org[9]].join(', ')}</span><br>
                        ${this.showArr ? '<span>ARR: <b>$ '+ org[7] + '</b></span><br>': ''} 
                        <span>Type: <b>${org[8]}</b></span><br>
                        <span>Distance: <b>${distance} KMs</b></span><br>
                    </div>`))
                    .setLngLat([org[11], org[10]])
                    .addTo(mapObj),
                distance: distance,
                index: index
            };
            orgDetail.markerRef.getElement().addEventListener('click', () => {
                this.selectedItems([orgDetail.index]);

                this.highLightMarker(orgDetail, false);
            });
            orgList.push(orgDetail);
        });
        orgList.sort((a: any, b: any) => a.distance - b.distance);
        this.orgList(orgList);
        mapObj.setZoom(3);
    }

    getDistanceFromLatLonInKm = (lat1: any, lon1: any, lat2: any, lon2: any) => {
        var R = 6371; // Radius of the earth in km
        var dLat = this.deg2rad(lat2 - lat1);  // deg2rad below
        var dLon = this.deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    deg2rad = (deg: number) => {
        return deg * (Math.PI / 180)
    }
}

export default new RootViewModel();