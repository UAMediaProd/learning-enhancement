$(document).ready(function() {

    $(document).foundation({
        reveal : {
            animation : 'fade'
        }
    });


    //test out making this re-usable. Use URL parameters to name the json file we're looking for.
    var getUrlParameter = function getUrlParameter(sParam) {
        var sPageURL = window.location.search.substring(1),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;
    
        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');
    
            if (sParameterName[0] === sParam) {
                return typeof sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
            }
        }
        return false;
    };

    var choice = getUrlParameter('d');
    console.log(choice);

    // variable for saving what the final page is - used to trigger unique functions on the last page click
    var finalPage;

   // read in data, populate the page(s) from a .JSON file (or equivalent)
    var json = $.getJSON("./data/" + choice + ".json", function(data){

        var title = data[0].title;
        var intro = data[0].introduction;

        $('#intro').append("<h1>" + title + "</h1>");
        $('#intro').append("<p>" + intro + "</p>");
         //look for entry that dictates if the activity should have a name entry
            //if so, append it after the intro

        for (var i = 0; i < data[0].pages.length; i++){
            var id = data[0].pages[i].name.toLowerCase();
            id = id.replace(/\s/g, '');

            //open div
            if(i == 0){
                $('#chart').before(
                    "<div id='" + id + "' class = 'page panel active'>"


                );
             } else {
                $('#chart').before(
                    "<div id='" + id + "' class = 'page panel'>"
                );
             }


             $('#' + id).append("<h2>" + data[0].pages[i].name + "</h2><p>" + data[0].pages[i].description + "</p>" +"<ol class='questions' id='" + id + "-qs'></ol>");

                 //loop through questions now

                 for (var j = 0; j < data[0].pages[i].statements.length; j++){ 
                     $('#' + id + "-qs").append("<li><label for ='" + id + "-" + j +"'>" + data[0].pages[i].statements[j] + "</label><div class='answer' id='" + id + "-" + j + "'></div>");
                 }

                if(i == 0){
                 $('#' + id).append("<div class='row nav'><div class='progress radius round'><span class='meter'></span></div><a href='#' class='next' title='next'><i class='fa-chevron-circle-right fa'></i></a></div>");
                } else {
                    $('#' + id).append("<div class='row nav'><div class='progress radius round'><span class='meter'></span></div><a href='#' class='prev' title='back'><i class='fa-chevron-circle-left fa'></i></a><a href='#' class='next' title='next'><i class='fa-chevron-circle-right fa'></i></a></div>");
                }

                $('#'+ id + ' .meter').css("width", i / 5 * 100 + '%');
                 $('#chart').before("</div>");
             //close div


    //set up final page
    if(i == data[0].pages.length - 1) {
        finalPage = id;
        }
    }


    //meter styles

   

// append to id rows:
// <div class='row detail'><h3>title</h3><p>feedback</p></div>


    // set up listeners
        $('.next, .prev').on('click', function() {
            var $this = $(this);
            console.log($this);
            var $pages = $('.page');
            console.log($pages);
            console.log($this.closest('.page'));
            var pageNum = $this.closest('.page').index();
            console.log(pageNum);
            $pages.removeClass('active');
    
            if ($this.hasClass('prev')) {
                pageNum--;
            } else {
                pageNum++;
            }

            console.log(pageNum);
    
            $($pages.get(pageNum)).addClass('active');
        });

           //final page functions
    $('#' + finalPage + ' .next').on('click', function() {
        console.log("Final page!");
        var course = $('.courseName').val();
        console.log(course);
       $('#courseTitle').text(course);
        var labels = [];
        var scores = [];
        $('.page').each(function(idx, page) {

            var $page = $(page);
            var label = $page.find('h2').text();

            // split multiword labels with newlines every other word
            label = label.replace(/([^\s]*)\s([^\s]*)\s/, "$1 $2\n");

            var score = 0;
            var hasAnswers = false;
            var answerCount = $(page).find('.answer').length;
            var adjustedCount = answerCount * 20;
            
            $(page).find('.answer').each(function(idx, answer) {
                hasAnswers = true;
                score += parseFloat($(answer).val());
               
            });

            if (hasAnswers) {
                console.log("Raw Score: ", score);
                console.log("Total points for this page: ", adjustedCount)
                let percent = (score / adjustedCount) * 100;
                console.log("Percent:", percent);
                scores.push(percent);
                labels.push(label);
                console.log(scores);
                console.log(labels);
            }
        });

        showChart('canvas', labels, scores);
        showFeedback('.feedback .detail', '.feedback', scores);

    
         //function to export report pdf
        var makeReport = function(){
            $( ".page" ).addClass("active")
            $(".nav").css("display","none");
            $(".butts").css("display","none");
            $("#footer").css("display","none");
            var element = document.body;
            html2pdf().set({
                pagebreak: { mode: 'avoid-all', after: ['.page', '.chart'] }
              }).from(element).save();

            // $( ".page" ).removeClass("active");
            $("#chart").addClass("active");

        }
    
        console.log($("#reportThis"));
        $("#reportThis").on("click",makeReport);
    });


        // set up sliders
        var min = 4;
    var max = 20;
    var slider_labels = [
        'Never',
        'Rarely',
        'Sometimes',
        'Often',
        'Always',
    ];
    var density = slider_labels.length;

    $('.answer').each(function(idx, slider) {
        $(slider).noUiSliderA11y({
            'step': 4,
            'animate': true,
            'start': min,
            'range': {
                'min': min,
                'max': max
            }
        });
        $(slider).noUiSlider_pips({
            'mode': 'steps',
            'density': density,
            'format': {to: function(value) {
                var numSteps = (max - min) / (density - 1);
                var idx = (value / numSteps) - 1;

                if (idx in slider_labels) {
                    return slider_labels[idx];
                }
                return '';
            }},
            'filter': function(value) {
                // labeled steps are large
                if (value % 4 == 0) {
                    return 1;
                }
                // remaining steps are small
                else {
                    return 0;
                }
            }
        });
    });

 
             


    });



    // Draw the chart based on the current scores
    var radarChart = null;
    function showChart(canvas, labels, scores) {

        var data = {
            'labels': labels,
            'datasets': [
                // for now, let's hide the comparison results

                // {
                //     'label': "Typical risk manager",
                //     'fillColor':   "rgba(0, 159, 230, 0.2)",
                //     'strokeColor': "rgba(0, 159, 230, 1)",
                //     'pointColor':  "rgba(0, 159, 230, 1)",
                //     'pointStrokeColor': "#fff",
                //     'pointHighlightFill': "#fff",
                //     'pointHighlightStroke': "rgba(220,220,220,1)",
                //     'data': [86, 83, 67, 72, 93]
                // },
                {
                    'label': "Your results",
                    'fillColor':   "rgba(212, 0, 0, 0.2)",
                    'strokeColor': "rgba(212, 0, 0, 1)",
                    'pointColor':  "rgba(212, 0, 0, 1)",
                    'pointStrokeColor': "#fff",
                    'pointHighlightFill': "#fff",
                    'pointHighlightStroke': "rgba(151,187,205,1)",
                    'data': scores
                }
            ],
        };

        var config = {
            'scaleShowLabels': false,
            'scaleLabel' : "<%= value %>%",
            'scaleFontSize': 10,
            'scaleOverride': true,
            'scaleSteps': 5,
            'scaleStepWidth': 20,
            'scaleStartValue': 0,
            'multiTooltipTemplate': "<%= value %>%",
            'legendTemplate' : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"border-color:<%=datasets[i].strokeColor%>;background-color:<%=datasets[i].fillColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>",
            'pointLabelFontSize': 16,
            'pointLabelLineHeight': 18,
            'pointLabelDelimiter': "\n"
        };

        // (Re)Create the radar chart
        if (radarChart) radarChart.destroy();
        var ctx = $(canvas).get(0).getContext("2d");
        radarChart = new Chart(ctx).Radar(data, config);

        $('#legend').html(radarChart.generateLegend());
    }


    // feedback for items will only show if the score is not high
    function showFeedback(dimensions, feedback, scores) {
        var threshold = 70;
        var $dimensions = $(dimensions);
        var $feedback = $(feedback);

        // console.log($dimensions);

        // $(feedback).addClass('hide');
        // $feedback.addClass('hide');
        // $dimensions.addClass('hide');

        $(scores).each(function(idx, score) {
            if (score < threshold) {
                $($dimensions.get(idx)).removeClass('hide');
                $feedback.removeClass('hide');
            }
        });
    }


    


   

    
});
