Chart.defaults.global.defaultFontColor = 'gray';
Chart.defaults.global.animation.onComplete = () => {
    //console.log('finished');
}

const CHART = document.getElementById("irdarlinechart");

let lineChart = new Chart(CHART, {
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

const BARCHART = document.getElementById("irdarbarchart");

let barChart = new Chart(BARCHART, {
    type: 'bar',
    data: {
        labels: JSON.parse(gel('beaconNames').value),
        datasets: [{
            label: "Hit Per Beacon",
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(154, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)'/*,
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)',
                'rgba(255, 159, 64, 0.8)'*/
            ],
            borderColor: [
                'rgba(255,99,132,1)',
                'rgba(154, 162, 235, 1)',
                'rgba(255, 206, 86, 1)'/*,
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'*/
            ],
            borderWidth: 1,
            data: JSON.parse(gel('beaconCounts').value),
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

const BUBBLECHART = document.getElementById("irdarbubblechart");

let bubbleChart = new Chart(BUBBLECHART, {
    type: 'bubble',
    data: {

        datasets: [{
            label: 'Total Impressions',
            data: [{
                x: 20,
                y: 30,
                r: 15
            },
                {
                    x: 40,
                    y: 10,
                    r: 10
                },
                {
                    x: 25,
                    y: 20,
                    r: 17
                },
                {
                    x: 32,
                    y: 18,
                    r: 24
                }
            ],
            backgroundColor: "#FF6384",
            hoverBackgroundColor: "#FF6384",
        }]
    },
    options: {
        elements: {
            points: {
                borderWidth: 1,
                borderColor: 'rgb(0, 0, 0)'
            }
        }
    }
});
