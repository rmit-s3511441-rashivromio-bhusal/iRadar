Chart.defaults.global.defaultFontColor = 'gray';
Chart.defaults.global.animation.onComplete = () => {
    //console.log('finished');
}

const BARCHART = document.getElementById("hits-per-month");

let barChart = new Chart(BARCHART, {
    type: 'bar',
    data: JSON.parse(gel('barChartData').value)
    /*{
        labels: JSON.parse(gel('beaconNames').value),
        datasets: [{
            label: "Hit per Beacon",
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(154, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)'
            ],
            borderColor: [
                'rgba(255,99,132,1)',
                'rgba(154, 162, 235, 1)',
                'rgba(255, 206, 86, 1)'
            ],
            borderWidth: 1,
            data: JSON.parse(gel('beaconCounts').value),
        }]
    }*/,
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        }
    }
});

//const CHART = gel("hits-per-beacon");

let lineChart = new Chart(gel("hits-per-beacon"), {
    type: 'line',
    data: {
        labels: JSON.parse(gel('monthNames').value),
        datasets: [{
            label: "Hits per Special",
            fill: true,
            lineTension: 0.1,
            backgroundColor: "rgba(255,255,255,0.5)",
            borderColor: "orange",
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderJoinStyle: 'miter',
            pointBorderColor: "rgba(255, 64, 129,1)",
            pointBackgroundColor: "orange",
            pointBorderWidth: 6,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "orange",
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 3,
            pointRadius: 1,
            pointHitRadius: 10,
            data: JSON.parse(gel('monthCounts').value),
            spanGaps: false,
        }]
    },
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        }
    }
});

const BUBBLECHART = document.getElementById("hits-by-location");

let bubbleChart = new Chart(BUBBLECHART, {
    type: 'bubble',
    data: {
        datasets: [{
            label: '',
            data: [{ x: 0, y: 0, r: 1 },{ x: 60, y: 40, r: 1 }],
            backgroundColor: "#fff"
        },{
            label: 'Beacon 1',
            data: [{ x: 20, y: 30, r: 15 }],
            backgroundColor: "#66ff66"
        },{
            label: 'Beacon 2',
            data: [{ x: 40, y: 10, r: 10 }],
            backgroundColor: "#66ccff",
            hoverBackgroundColor: "#66ccff"
        },{
            label: 'Beacon 3',
            data: [{ x: 25, y: 20, r: 17 }],
            backgroundColor: "#ff6600",
            hoverBackgroundColor: "#ff6600"
        },{
            label: 'Beacon 4',
            data: [{ x: 32, y: 18, r: 24 }],
            backgroundColor: "#cc66ff",
            hoverBackgroundColor: "#cc66ff"
        }]
    },
    options: {
        elements: {
            points: {
                borderWidth: 1,
                borderColor: 'rgb(0, 0, 153)'
            }
        }
    }
});
