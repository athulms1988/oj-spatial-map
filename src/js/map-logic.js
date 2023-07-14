const countryCodeMap = {
    "United States": "US"
}

async function populationOrgList(location) {
    const countryArray = location.display_name.split(',');
    const country = countryArray[countryArray.length - 1].trim();
    const countryCode = countryCodeMap[country] || "US";
    // const orgList = await orgDetails(countryCode);
    const orgList = await dummyOrgDetails();
    return orgList.rows;
}

async function dummyOrgDetails() {
    return new Promise((resolve) => {
        setTimeout(() => {
        resolve({"count":11,"name":"orgtrackerreport","columnNames":["Organization ID","Organization Name","City","Street","State/Province","Country","Postal Code","ARR","industryType","ISO Country Code","latitude","longitude"],"rows":[["3","BKH","Jeffersonville","Jeff Probus Accent Marketing Services, LLC  400 Missouri Avenue, Stuite 100","IN","United States (US)","47130","10000","Service","US","38.2722867","-85.7536425"],["10","Accenture LLP","Sacramento","2329 Gateway Oaks Dr.","CA","United States (US)","95833","100033","Service","US","38.610","-121.5176"],["11","Avaak Inc","San Diego","6815, Flanders","CA","United States (US)","92126","20000","Service","US","32.903","-117.176"],["12","Fellowship Technologies","San Diego","10182 Telesis Court","CA","United States (US)","92121","40000","Service","US","32.902","-117.208"],["13","Foundation for California Community Colleges","Sacramento","1102 Q Street","CA","United States (US)","95814","140000","Service","US","38.572","-121.495"],["14","IOGEAR","Foothill Ranch","19641 Da Vinci","CA","United States (US)","94568","230000","Service","US","33.677","-117.655"],["15","NewEgg Inc.","Pico Rivera","9997 Rose Hills Road","CA","United States (US)","90601","62000","Service","US","34.017","-118.052"],["16","Rapattoni","Simi Valley","West Cochran Street","CA","United States (US)","93065","340000","Service","US","34.279","-118.742"],["17","Stamps.com Inc.","Los Angeles","12959 Coral Tree Place","CA","United States (US)","90066","560000","Service","US","33.9773","-118.4241"],["18","University of Texas at Austin","Austin","2400 Inner Campus Drive Main Building","TX","United States (US)","78712","124000","Service","US","30.286","-97.739"],["19","University of Texas Rio Grande Valley","Edinburg","1201 W University Drive","TX","United States (US)","78539","23000","University","US","26.307","-98.17282"]],"links":[{"rel":"self","href":"https://livetest-22b.custhelp.com/services/rest/connect/v1.4/analyticsReportResults"},{"rel":"canonical","href":"https://livetest-22b.custhelp.com/services/rest/connect/v1.4/analyticsReportResults"},{"rel":"describedby","href":"https://livetest-22b.custhelp.com/services/rest/connect/v1.4/metadata-catalog/analyticsReportResults","mediaType":"application/schema+json"}]});
        }, 1000);
    })
}

async function orgDetails(countryCode) {
    const response = await fetch("/services/rest/connect/v1.4/analyticsReportResults",
        {
            method: 'POST',
            headers: {
                "OSvC-CREST-Application-Context": 1,
                "Authorization": "Basic QWdlbnQxOldlbGNvbWUx",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "id": 100549,
                "filters": [{
                    "name": "country",
                    "values": [countryCode]
                }]
            })
        });
    const countries = await response.json();
    return countries;
}

window.populationOrgList = populationOrgList;