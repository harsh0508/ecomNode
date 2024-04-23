import * as BannerData from '../DummyData/DummyHolidayData.json' assert { type:"json" }


export default function getBanner(){
    const data = BannerData.default
    let todaysBanner = 'NA'
    var d1 = new Date()
    var str = d1.toISOString().slice(0, -14)
    console.log(str);
    data.forEach(element => {
       if(element.date === str){
        todaysBanner = element
       }
    });
    // check if empy before returning
    // return todaysBanner 
    if(todaysBanner !== 'NA'){
        return {
            "date": "2024-05-01",
            "id": "0",
            "eventName": "No Event today",
            "image": "https://example.com/labour_day.jpg",
            "goto": "/labour_day"
        }
    }
}